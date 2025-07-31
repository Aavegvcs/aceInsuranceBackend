import {
    BadRequestException,
    forwardRef,
    HttpStatus,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, EntityManager, In, Repository } from 'typeorm';
import { Employee, EmployeeStatus } from './entities/employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { UserService } from '@modules/user/user.service';
import { Branch } from '@modules/branch/entities/branch.entity';
import { User } from '@modules/user/user.entity';
import { BranchModels, Designation, generateUUID, orderByKey, orderByValue, roleIds, Roles } from 'src/utils/app.utils';
import { BranchService } from '@modules/branch/branch.service';
import { DepartmentService } from '@modules/department/department.service';
import { BulkInsertResult } from 'src/config/report.config';
import { Dealer, DealerType } from './entities/dealer.entity';
import { Department } from '@modules/department/entities/department.entity';
import { UserRole } from '@modules/user-role/entities/user-role.entity';
import { bulkUpsert } from 'src/utils/sql.utils';
import { SegmentRevenue } from '@modules/report/entities/segment-revenue.entity';
import { DealerRMRevenue, RevenueRole } from './entities/dealer-rm-revenue.entity';
import { Client } from '@modules/client/entities/client.entity';
import { throws } from 'assert';
import { exceptions } from 'winston';
import { Company } from '@modules/company/entities/company.entity';
import { Console } from 'console';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';

export interface DealerRMListDataType {
    fullName: string;
    id: string;
    clientBrokerage: number;
    terminalBrokerage: number;
    franchiseeRevenue: number;
    sipValue: number;
    lumpsum: number;
    tradedClients: number;
}

@Injectable()
export class EmployeeService {
    private readonly logger = new Logger(EmployeeService.name);

    constructor(
        @InjectRepository(Employee)
        private readonly employeeRepo: Repository<Employee>,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(UserRole)
        private readonly userRoleRepo: Repository<UserRole>,
        @InjectRepository(Branch)
        private readonly branchRepo: Repository<Branch>,
        @InjectRepository(Department)
        private readonly departmentRepo: Repository<Department>,
        @InjectRepository(Dealer)
        private readonly dealerRepo: Repository<Dealer>,
        @Inject(forwardRef(() => BranchService))
        private readonly branchService: BranchService,
        @Inject(forwardRef(() => DepartmentService))
        private readonly departmentService: DepartmentService,
        private readonly dataSource: DataSource,
        @InjectRepository(Company)
        private readonly companyRepo: Repository<Company>,
        private readonly loggedInsUserService: LoggedInsUserService,
        
    ) {}

    async create(body: CreateEmployeeDto): Promise<Employee> {
        if (!body.branchId) {
            throw new BadRequestException('Branch ID is required');
        }

        const userData = {
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
            company: body.companyId,
            roleId: body.roleId ?? roleIds.staff
        };

        const newUser = await this.userService.createUser(userData);
        if (!newUser) {
            throw new InternalServerErrorException('Failed to create user');
        }

        const branch = await this.branchService.findById(body.branchId);
        if (!branch) {
            throw new BadRequestException('Invalid Branch ID');
        }

        const department = await this.departmentService.findById(body.departmentId);
        if (!department) {
            throw new BadRequestException('Invalid Department ID');
        }

        const empId = generateUUID('EMP', branch.id);
        const newEmployee = this.employeeRepo.create({
            user: newUser,
            id: empId,
            dateOfJoining: body.dateOfJoining,
            designation: body.designation,
            salary: body.salary,
            branch,
            probation: body.probation,
            status: EmployeeStatus.ACTIVE,
            leaveDays: body.leaveDays,
            department
        });

        const savedEmployee = await this.employeeRepo.save(newEmployee);

        newUser.employeeId = savedEmployee.id;
        newUser.employee = savedEmployee;
        await this.userRepo.save(newUser);

        const userRole = this.userRoleRepo.create({
            userId: newUser.id,
            roleId: body.roleId ?? roleIds.staff
        });
        await this.userRoleRepo.upsert(userRole, ['userId']);

        if (body.dealerId) {
            const dealer = this.dealerRepo.create({
                dealerId: body.dealerId,
                employee: savedEmployee,
                terminals: (body.terminals as DeepPartial<string[]>) || null,
                dealerType: DealerType.EQUITY,
                target: 0,
                targetCompleted: 0,
                branches: [branch]
            });
            await this.dealerRepo.save(dealer);
        }

        return savedEmployee;
    }

    async bulkCreate(employeeDtos: CreateEmployeeDto[]): Promise<BulkInsertResult<Employee>> {
        const total = employeeDtos.length;
        const errors: { row: number; entityName: string; error: string }[] = [];
        const createdOrUpdatedEmployees: Employee[] = [];
        const batchSize = 1000;

        if (total === 0) {
            this.logger.warn('No employees provided for bulk creation');
            return {
                statusCode: 400,
                message: 'No employees provided',
                data: { total, created: 0, failed: 0, errors: [], createdEntities: [] }
            };
        }

        const validationErrors: { error: { row: number; entityName: string; error: string } }[] = [];
        employeeDtos.forEach((dto, idx) => {
            const row = idx + 1;
            if (!dto.employeeId) {
                validationErrors.push({ error: { row, entityName: 'Employee', error: 'Missing employeeId' } });
            }
            if (!dto.email) {
                validationErrors.push({
                    error: {
                        row,
                        entityName: 'User',
                        error: `Missing email for employeeId ${dto.employeeId || 'unknown'}`
                    }
                });
            }
            if (!dto.firstName) {
                validationErrors.push({
                    error: {
                        row,
                        entityName: 'User',
                        error: `Missing firstName for employeeId ${dto.employeeId || 'unknown'}`
                    }
                });
            }
            if (!dto.branchId) {
                validationErrors.push({
                    error: {
                        row,
                        entityName: 'Employee',
                        error: `Missing branchId for employeeId ${dto.employeeId || 'unknown'}`
                    }
                });
            }
            if (dto.dealerId) {
                const dealerExists = employeeDtos.some(
                    (otherDto, otherIdx) => otherIdx !== idx && otherDto.dealerId === dto.dealerId && dto.dealerId
                );
                if (dealerExists) {
                    validationErrors.push({
                        error: {
                            row,
                            entityName: 'Dealer',
                            error: `Duplicate dealerId ${dto.dealerId} for employeeId ${dto.employeeId}`
                        }
                    });
                }
            }
        });

        if (validationErrors.length > 0) {
            return {
                statusCode: 400,
                message: 'Validation failed for some rows',
                data: {
                    total,
                    created: 0,
                    failed: total,
                    errors: validationErrors.map((e) => e.error),
                    createdEntities: []
                }
            };
        }

        const branchIds = [...new Set(employeeDtos.map((dto) => dto.branchId).filter((id) => id))];
        const departmentIds = [...new Set(employeeDtos.map((dto) => dto.departmentId || 3).filter((id) => id))];

        const existingBranches = await this.branchRepo.find({ where: { id: In(branchIds) } });
        const existingBranchIds = new Set(existingBranches.map((b) => b.id));
        const existingDepartments = await this.departmentRepo.find({ where: { id: In(departmentIds) } });
        const existingDepartmentIds = new Set(existingDepartments.map((d) => d.id));

        employeeDtos.forEach((dto, idx) => {
            const row = idx + 1;
            if (dto.branchId && !existingBranchIds.has(dto.branchId)) {
                validationErrors.push({
                    error: {
                        row,
                        entityName: 'Employee',
                        error: `Branch with ID ${dto.branchId} not found for employeeId ${dto.employeeId}`
                    }
                });
            }
            const deptId = dto.departmentId || 3;
            if (!existingDepartmentIds.has(deptId)) {
                validationErrors.push({
                    error: {
                        row,
                        entityName: 'Employee',
                        error: `Department with ID ${deptId} not found for employeeId ${dto.employeeId}`
                    }
                });
            }
        });

        if (validationErrors.length > 0) {
            return {
                statusCode: 400,
                message: 'Validation failed for some rows',
                data: {
                    total,
                    created: 0,
                    failed: total,
                    errors: validationErrors.map((e) => e.error),
                    createdEntities: []
                }
            };
        }

        for (let start = 0; start < total; start += batchSize) {
            const batch = employeeDtos.slice(start, start + batchSize);
            await this.dataSource.transaction(async (manager) => {
                const users: DeepPartial<User>[] = [];
                const employees: Partial<Employee>[] = [];
                const dealers: DeepPartial<Dealer>[] = [];
                const branchDealerMappings: { branchId: string; dealerId: string }[] = [];
                const employeeIdsInBatch: string[] = [];

                batch.forEach((dto, idx) => {
                    const row = start + idx + 1;
                    const id = dto.employeeId;
                    const isDealer = dto.dealerId || dto.roleId === roleIds.dealer;

                    users.push({
                        email: dto.email,
                        firstName: dto.firstName,
                        phoneNumber: dto.phone || null,
                        status: dto.status || 'active',
                        company: dto.companyId ? { id: dto.companyId } : { id: 1 },
                        // userType: dto.roleId === roleIds.admin ? Roles.admin : isDealer ? Roles.dealer : Roles.staff,
                        employeeId: id,
                        password: dto.password || null
                    });

                    employees.push({
                        id,
                        designation: dto.designation || Designation.staff,
                        salary: dto.salary || 0,
                        dateOfJoining: dto.dateOfJoining || null,
                        department: { id: dto.departmentId || 3 } as Department,
                        branch: { id: dto.branchId } as Branch,
                        retain: dto.retain ?? true,
                        leaveDays: dto.leaveDays || 0,
                        panNumber: dto.panNumber || null,
                        probation: dto.probation ?? false,
                        status: dto.status || EmployeeStatus.ACTIVE
                    });

                    employeeIdsInBatch.push(id);

                    if (isDealer) {
                        const dealerId = dto.dealerId || generateUUID('EMP', id);
                        const terminals = Array.isArray(dto.terminals) ? dto.terminals : [];
                        dealers.push({
                            dealerId,
                            employee: { id },
                            terminals: terminals.some((t) => !t || typeof t !== 'string')
                                ? null
                                : terminals.length > 0
                                  ? terminals
                                  : null,
                            dealerType: DealerType.EQUITY,
                            target: 0,
                            targetCompleted: 0
                        });

                        branchDealerMappings.push({
                            branchId: dto.branchId,
                            dealerId
                        });
                    }
                });

                let upUsers: { id: number; employeeId: string }[] = [];
                if (users.length > 0) {
                    const { results, errors: userErrs } = await this.bulkUpsertUsers(
                        users,
                        employeeIdsInBatch,
                        manager
                    );
                    userErrs.forEach((e) => errors.push({ row: start + e.row, entityName: 'User', error: e.error }));
                    upUsers = results;
                } else {
                    this.logger.warn('No users to upsert in batch');
                }

                const userIdMap = new Map(upUsers.map((u) => [u.employeeId, u.id]));
                const validEmployees: Partial<Employee>[] = [];
                const validEmployeeIds = new Set<string>();

                employees.forEach((e, idx) => {
                    const row = start + idx + 1;
                    const userId = userIdMap.get(e.id!);
                    if (userId) {
                        e.user = { id: userId } as User;
                        validEmployees.push(e);
                        validEmployeeIds.add(e.id!);
                    } else {
                        this.logger.warn(`No user ID found for employeeId ${e.id} at row ${row}`);
                        errors.push({
                            row,
                            entityName: 'Employee',
                            error: `No user ID found for employeeId ${e.id}`
                        });
                    }
                });

                let createdEmployees: Employee[] = [];
                if (validEmployees.length > 0) {
                    const { affected, errors: empErrs } = await this.bulkUpsertEmployees(validEmployees, manager);
                    empErrs.forEach((e) => errors.push({ row: -1, entityName: 'EmployeeBatch', error: e.error }));
                    createdEmployees = await manager
                        .createQueryBuilder(Employee, 'employee')
                        .where('employee.id IN (:...ids)', { ids: validEmployees.map((e) => e.id!) })
                        .leftJoinAndSelect('employee.user', 'user')
                        .getMany();
                } else {
                    this.logger.warn('No valid employees to upsert in batch');
                }

                let dealerResults: Dealer[] = [];
                if (dealers.length > 0) {
                    const dealerEmployeeIds = dealers.map((d) => d.employee.id!);
                    const existingEmployees = await manager
                        .createQueryBuilder(Employee, 'employee')
                        .where('employee.id IN (:...ids)', { ids: dealerEmployeeIds })
                        .getMany();
                    const existingEmployeeIds = new Set(existingEmployees.map((e) => e.id));

                    const validDealers: DeepPartial<Dealer>[] = [];
                    dealers.forEach((dealer, idx) => {
                        const row = start + idx + 1;
                        if (existingEmployeeIds.has(dealer.employee.id!)) {
                            validDealers.push(dealer);
                        } else {
                            errors.push({
                                row,
                                entityName: 'Dealer',
                                error: `Employee with ID ${dealer.employee.id} not found for dealerId ${dealer.dealerId}`
                            });
                        }
                    });

                    if (validDealers.length > 0) {
                        const { affected, errors: dealerErrs } = await this.bulkUpsertDealers(
                            validDealers,
                            employeeIdsInBatch,
                            manager
                        );
                        dealerErrs.forEach((e) =>
                            errors.push({ row: start + e.row, entityName: 'DealerBatch', error: e.error })
                        );
                        dealerResults = await manager
                            .createQueryBuilder(Dealer, 'dealer')
                            .where('dealer.employeeId IN (:...ids)', { ids: employeeIdsInBatch })
                            .getMany();
                    } else {
                        this.logger.warn('No valid dealers to upsert in batch');
                    }
                }

                if (createdEmployees.length > 0) {
                    const userUpdates = createdEmployees.map((employee) => ({
                        id: employee.user.id,
                        employeeId: employee.id
                    }));

                    await manager
                        .createQueryBuilder()
                        .update(User)
                        .set({
                            employeeId: () =>
                                `CASE id ${userUpdates.map((u) => `WHEN ${u.id} THEN '${u.employeeId}'`).join(' ')} END`
                        })
                        .where('id IN (:...ids)', { ids: userUpdates.map((u) => u.id) })
                        .execute();
                }

                const userRoles: Partial<UserRole>[] = createdEmployees.map((employee, idx) => ({
                    userId: employee.user.id,
                    roleId: batch[idx].roleId ?? roleIds.staff
                }));
                if (userRoles.length > 0) {
                    const { errors: roleErrs } = await this.bulkUpsertUserRoles(userRoles, manager);
                    roleErrs.forEach((e) => errors.push({ row: -1, entityName: 'UserRoleBatch', error: e.error }));
                }

                if (branchDealerMappings.length > 0) {
                    const dealerIds = branchDealerMappings.map((m) => m.dealerId);
                    const existingDealers = await manager
                        .createQueryBuilder(Dealer, 'dealer')
                        .where('dealer.dealerId IN (:...ids)', { ids: dealerIds })
                        .getMany();
                    const existingDealerIds = new Set(existingDealers.map((d) => d.dealerId));

                    const validMappings: { branchId: string; dealerId: string }[] = [];
                    branchDealerMappings.forEach((mapping, idx) => {
                        const row = start + idx + 1;
                        if (existingDealerIds.has(mapping.dealerId)) {
                            validMappings.push(mapping);
                        } else {
                            errors.push({
                                row,
                                entityName: 'BranchDealer',
                                error: `Dealer with ID ${mapping.dealerId} not found for branchId ${mapping.branchId}`
                            });
                        }
                    });

                    if (validMappings.length > 0) {
                        const { errors: mappingErrs } = await this.bulkUpsertBranchDealerMappings(
                            validMappings,
                            manager
                        );
                        mappingErrs.forEach((e) =>
                            errors.push({ row: start + e.row, entityName: 'BranchDealerBatch', error: e.error })
                        );
                    }
                }

                if (validEmployeeIds.size > 0) {
                    const fetched = await manager
                        .createQueryBuilder(Employee, 'e')
                        .select('e.id')
                        .where('e.id IN (:...ids)', { ids: Array.from(validEmployeeIds) })
                        .getMany();
                    createdOrUpdatedEmployees.push(...fetched);
                }
            });
        }

        const processed = createdOrUpdatedEmployees.length;
        const failed = total - processed;

        if (processed === 0 && errors.length > 0) {
            return {
                statusCode: 400,
                message: 'All rows failed validation or processing',
                data: { total, created: 0, failed, errors, createdEntities: [] }
            };
        }

        return {
            statusCode: processed === total ? 201 : failed > 0 ? 207 : 400,
            message: `Bulk upsert completed: ${processed} of ${total}`,
            data: { total, created: processed, failed, errors, createdEntities: createdOrUpdatedEmployees }
        };
    }

    async bulkUpsertUsers(
        users: DeepPartial<User>[],
        employeeIds: string[],
        manager: EntityManager
    ): Promise<{
        results: { id: number; employeeId: string }[];
        errors: { row: number; error: string }[];
    }> {
        if (users.length === 0 || employeeIds.length === 0) {
            this.logger.warn('No users or employeeIds provided for upsert');
            return { results: [], errors: [] };
        }

        const results: { id: number; employeeId: string }[] = [];
        const errors: { row: number; error: string }[] = [];
        const processedRows = new Set<number>();

        const userData: any[] = users
            .map((user, index) => {
                const employeeId = employeeIds[index];
                const rowNumber = index + 1;

                if (!user.firstName) {
                    if (!processedRows.has(rowNumber)) {
                        errors.push({ row: rowNumber, error: `Missing firstName for employeeId ${employeeId}` });
                        processedRows.add(rowNumber);
                    }
                    return null;
                }
                if (!user.email) {
                    if (!processedRows.has(rowNumber)) {
                        errors.push({ row: rowNumber, error: `Missing email for employeeId ${employeeId}` });
                        processedRows.add(rowNumber);
                    }
                    return null;
                }
                if (!user.status) {
                    if (!processedRows.has(rowNumber)) {
                        errors.push({ row: rowNumber, error: `Missing status for employeeId ${employeeId}` });
                        processedRows.add(rowNumber);
                    }
                    return null;
                }

                return {
                    id: null,
                    email: user.email!,
                    firstName: user.firstName!,
                    phoneNumber: user.phoneNumber || null,
                    status: user.status || 'active',
                    company:
                        user.company && typeof user.company === 'object' && 'id' in user.company
                            ? user.company.id
                            : parseInt(user.company as string, 10) || 1,
                    userType: user.userType || 'staff',
                    employeeId: user.employeeId,
                    password: user.password || null
                };
            })
            .filter((data): data is any => data !== null);

        if (userData.length === 0) {
            return { results: [], errors };
        }

        const existingEmployeeIds = userData.map((u) => u.employeeId);
        const existingUsers = await manager
            .createQueryBuilder(User, 'user')
            .where('user.employeeId IN (:...employeeIds)', { employeeIds: existingEmployeeIds })
            .andWhere('user.deletedAt IS NULL')
            .select(['user.id', 'user.employeeId'])
            .getMany();

        const existingEmployeeIdMap = new Map(existingUsers.map((u) => [u.employeeId, u.id]));

        const upsertData = userData.map((u) => ({
            ...u,
            id: existingEmployeeIdMap.get(u.employeeId) || null
        }));

        const { affected, errors: upsertErrors } = await bulkUpsert(
            'user',
            upsertData,
            ['id', 'email', 'firstName', 'phoneNumber', 'status', 'company', 'userType', 'employeeId', 'password'],
            ['email', 'firstName', 'phoneNumber', 'status', 'company', 'userType', 'password'],
            manager,
            1000
        );

        upsertErrors.forEach((error) => {
            errors.push({ row: -1, error: error.error });
        });

        const upsertedUsers = await manager
            .createQueryBuilder(User, 'user')
            .where('user.employeeId IN (:...employeeIds)', { employeeIds: existingEmployeeIds })
            .andWhere('user.deletedAt IS NULL')
            .select(['user.id', 'user.employeeId'])
            .getMany();

        upsertedUsers.forEach((user) => {
            if (user.employeeId) {
                results.push({ id: user.id, employeeId: user.employeeId });
            }
        });

        employeeIds.forEach((employeeId, index) => {
            if (!results.some((r) => r.employeeId === employeeId) && !processedRows.has(index + 1)) {
                errors.push({
                    row: index + 1,
                    error: `Failed to associate user with employeeId ${employeeId}`
                });
            }
        });

        return {
            results,
            errors: [...new Map(errors.map((e) => [`${e.row}-${e.error}`, e])).values()]
        };
    }

    async bulkUpsertEmployees(
        employees: Partial<Employee>[],
        manager: EntityManager
    ): Promise<{ affected: number; errors: { batch: number; error: string }[] }> {
        const values = employees.map((e) => ({
            id: e.id!,
            userId: e.user?.id || null,
            designation: e.designation || 'staff',
            salary: e.salary || 0,
            dateOfJoining: e.dateOfJoining
                ? new Date(e.dateOfJoining).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0],
            status: e.status || 'active',
            retain: e.retain ?? true,
            probation: e.probation ?? false,
            leaveDays: e.leaveDays || 0,
            panNumber: e.panNumber || null,
            departmentId: e.department?.id || 3,
            branchId: e.branch?.id || null
        }));

        try {
            const result = await bulkUpsert(
                'employee',
                values,
                [
                    'id',
                    'userId',
                    'designation',
                    'salary',
                    'dateOfJoining',
                    'status',
                    'retain',
                    'probation',
                    'leaveDays',
                    'panNumber',
                    'departmentId',
                    'branchId'
                ],
                [
                    'userId',
                    'designation',
                    'salary',
                    'dateOfJoining',
                    'status',
                    'retain',
                    'probation',
                    'leaveDays',
                    'panNumber',
                    'departmentId',
                    'branchId'
                ],
                manager,
                1000
            );

            return {
                affected: result.affected,
                errors: [...new Map(result.errors.map((e) => [e.error, e])).values()]
            };
        } catch (error) {
            this.logger.error(`Failed to upsert employee batch: ${error.message}`);
            throw new InternalServerErrorException(`Failed to upsert employee batch: ${error.message}`);
        }
    }

    async bulkUpsertDealers(
        dealers: DeepPartial<Dealer>[],
        employeeIds: string[],
        manager: EntityManager
    ): Promise<{ affected: number; errors: { row: number; error: string }[] }> {
        const dealerData = dealers.map((dealer, index) => ({
            dealerId: dealer.dealerId!,
            employeeId: dealer.employee.id!,
            terminals: dealer.terminals ? dealer.terminals.join(',') : null,
            dealerType: dealer.dealerType || 'EQUITY',
            target: dealer.target || 0,
            targetCompleted: dealer.targetCompleted || 0
        }));

        try {
            const result = await bulkUpsert(
                'dealer',
                dealerData,
                ['dealerId', 'employeeId', 'terminals', 'dealerType', 'target', 'targetCompleted'],
                ['employeeId', 'terminals', 'dealerType', 'target', 'targetCompleted'],
                manager,
                1000
            );

            return {
                affected: result.affected,
                errors: result.errors.map((e) => ({ row: -1, error: e.error }))
            };
        } catch (error) {
            this.logger.error(`Failed to upsert dealer batch: ${error.message}`);
            throw new InternalServerErrorException(`Failed to upsert dealer batch: ${error.message}`);
        }
    }

    async bulkUpsertUserRoles(
        userRoles: Partial<UserRole>[],
        manager: EntityManager
    ): Promise<{ affected: number; errors: { row: number; error: string }[] }> {
        const userRoleData = userRoles.map((role) => ({
            userId: role.userId!,
            roleId: role.roleId!
        }));

        try {
            const result = await bulkUpsert('user_role', userRoleData, ['userId', 'roleId'], ['roleId'], manager, 1000);

            return {
                affected: result.affected,
                errors: result.errors.map((e) => ({ row: -1, error: e.error }))
            };
        } catch (error) {
            this.logger.error(`Failed to upsert user role batch: ${error.message}`);
            throw new InternalServerErrorException(`Failed to upsert user role batch: ${error.message}`);
        }
    }

    async bulkUpsertBranchDealerMappings(
        mappings: { branchId: string; dealerId: string }[],
        manager: EntityManager
    ): Promise<{ affected: number; errors: { row: number; error: string }[] }> {
        const errors: { row: number; error: string }[] = [];

        if (!mappings || mappings.length === 0) {
            this.logger.warn('No branch-dealer mappings provided for upsert');
            return { affected: 0, errors: [{ row: -1, error: 'No mappings provided' }] };
        }

        try {
            mappings.forEach((mapping, idx) => {
                if (!mapping.branchId || typeof mapping.branchId !== 'string' || mapping.branchId.trim() === '') {
                    errors.push({ row: idx + 1, error: `Invalid or missing branchId for mapping at index ${idx}` });
                }
                if (!mapping.dealerId || typeof mapping.dealerId !== 'string' || mapping.dealerId.trim() === '') {
                    errors.push({ row: idx + 1, error: `Invalid or missing dealerId for mapping at index ${idx}` });
                }
            });

            if (errors.length > 0) {
                this.logger.warn(`Validation failed for ${errors.length} branch-dealer mappings`);
                return { affected: 0, errors };
            }

            const result = await bulkUpsert(
                'branch_dealer',
                mappings,
                ['branchId', 'dealerId'],
                ['branchId', 'dealerId'],
                manager,
                1000
            );

            const affected = result.affected || 0;
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach((err) => {
                    errors.push({ row: err.batch || -1, error: err.error });
                });
            }

            return { affected, errors };
        } catch (error) {
            this.logger.error(`Failed to upsert branch-dealer mappings: ${error.message}`);
            return { affected: 0, errors: [{ row: -1, error: `Upsert failed: ${error.message}` }] };
        }
    }

    async update(id: string, requestParam: UpdateEmployeeDto): Promise<Employee> {
        const employee = await this.employeeRepo.findOne({ where: { id } });
        if (!employee) {
            throw new Error(`Employee with ID ${id} not found`);
        }
        const updatedEmployee = this.employeeRepo.merge(employee, requestParam);
        return await this.employeeRepo.save(updatedEmployee);
    }

    async getAllEmployees(): Promise<Employee[]> {
        return await this.employeeRepo.find();
    }

    async getEmployeeById(id: string): Promise<Employee> {
        return await this.employeeRepo.findOne({ where: { id }, relations: ['branch'] });
    }

    async getDealersBrokerage(req: any): Promise<any> {
        const limit = parseInt(req?.QUERY_STRING?.limit) || 100;
        const skip = parseInt(req?.QUERY_STRING?.skip) || 0;

        const baseQuery = this.dataSource
            .getRepository(DealerRMRevenue)
            .createQueryBuilder('revenue')
            .leftJoin('revenue.employee', 'employee')
            .leftJoin('employee.user', 'user')
            .leftJoin('revenue.clients', 'client')
            .select('employee.id', 'id')
            .addSelect('user.firstName', 'fullName')
            .addSelect(
                `
      SUM(CASE WHEN revenue.terminalId IS NOT NULL THEN revenue.netBrokerage ELSE 0 END)
    `,
                'terminalBrokerage'
            )
            .addSelect(
                `
      SUM(CASE WHEN revenue.terminalId IS NULL THEN revenue.netBrokerage ELSE 0 END)
    `,
                'clientBrokerage'
            )
            .addSelect('COUNT(DISTINCT client.id)', 'tradedClients')
            .andWhere(req?.QUERY_STRING?.where || '1=1')
            .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'report' }), orderByValue({ req }))
            .groupBy('employee.id')
            .addGroupBy('user.firstName');

        const itemsRaw = await baseQuery.offset(skip).limit(limit).getRawMany(); // Note: getRawMany() cannot give total count directly; we compute count separately

        const items: DealerRMListDataType[] = itemsRaw.map((row) => ({
            id: row.id,
            fullName: row.fullName,
            terminalBrokerage: Number(row.terminalBrokerage),
            clientBrokerage: Number(row.clientBrokerage),
            tradedClients: Number(row.tradedClients),
            franchiseeRevenue: 0,
            sipValue: 0,
            lumpsum: 0
        }));

        // Get total count separately (of distinct employees)
        const qb = this.dataSource
            .getRepository(DealerRMRevenue)
            .createQueryBuilder('revenue')
            .leftJoin('revenue.employee', 'employee')
            .leftJoin('employee.user', 'user')
            .leftJoin('revenue.clients', 'client')
            .andWhere(req?.QUERY_STRING?.where || '1=1')
            .select([]);

        return { items, qb };
    }

    async getDealersPerBranch(branchId: string): Promise<any> {
        const [dealers, employees] = await Promise.all([
            this.branchRepo.query(
                `
                SELECT 
                    d.dealerId AS id,
                    CONCAT_WS(' ', u.firstName, u.lastName) AS fullName
                FROM dealer AS d
                INNER JOIN employee AS e ON e.id = d.employeeId AND e.deletedAt IS NULL
                LEFT JOIN user AS u ON u.id = e.userId AND u.deletedAt IS NULL
                WHERE e.branchId = ? AND d.deletedAt IS NULL
            `,
                [branchId]
            ),
            this.branchRepo.query(
                `
                SELECT 
                    e.id AS id,
                    CONCAT_WS(' ', u.firstName, u.lastName) AS fullName
                FROM employee AS e
                LEFT JOIN user AS u ON u.id = e.userId AND u.deletedAt IS NULL
                WHERE e.branchId = ? AND e.deletedAt IS NULL
            `,
                [branchId]
            )
        ]);
        const mappedEmployees = employees.map((e) => ({
            value: String(e.id),
            label: e.fullName
        }));
        const mappedDealers = dealers.map((e) => ({
            value: String(e.id),
            label: e.fullName
        }));

        return {
            RM: mappedEmployees,
            EQUITY: mappedDealers,
            COMMODITY1: mappedDealers,
            COMMODITY2: mappedDealers
        };
    }

    async createBranchManagersForAllBranches(): Promise<BulkInsertResult<Employee>> {
        const branches = await this.branchRepo.find({
            where: { deletedAt: null, model: BranchModels.BRANCH }
        });

        const branchManagers: CreateEmployeeDto[] = branches.map((branch) => ({
            employeeId: branch.id,
            firstName: branch.name,
            lastName: 'Branch',
            email: branch.email || `bm_${branch.id.toLowerCase()}@autogen.local`,
            phone: branch.phone || `99999${branch.id.replace(/\D/g, '').padStart(5, '0')}`,
            branchId: branch.id,
            designation: Designation.branchManager,
            departmentId: 3,
            roleId: roleIds.admin,
            companyId: 1,
            status: EmployeeStatus.ACTIVE,
            retain: true,
            leaveDays: 0,
            password: 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f',
            probation: false,
            dateOfJoining: branch.activationDate || new Date()
        }));

        return await this.bulkCreate(branchManagers);
    }

    // async createInsuranceEmployee(body: any): Promise<any> {
    //     try {
    //         if (!body.branchId) {
    //             throw new BadRequestException('Branch ID is required');
    //         }
    //         const branch = await this.branchService.findById(body.branchId);

    //         const userData = {
    //             email: body.email,
    //             firstName: body.firstName,
    //             lastName: body.lastName,
    //             phone: body.phone,
    //             dateOfBirth: body.dateOfBirth,
    //             gender: body.gender,
    //             dateOfJoining: body.dateOfJoining,
    //             company: 1,
    //             branch: branch,
    //             roleId: body.roleId ?? roleIds.staff
    //         };

    //         const newUser = await this.userService.createInsuranceUser(userData);
    //         console.log('new user created details--------->', newUser);
    //         if (!newUser) {
    //             throw new InternalServerErrorException('Failed to create user');
    //         }
    //         const query = 'CALL update_empCode(?, ?)';
    //         const empCode = await this.userRepo.query(query, [newUser.id, branch.name]);

    //         const department = await this.departmentService.findById(body.departmentId);
    //         if (!department) {
    //             throw new BadRequestException('Invalid Department ID');
    //         }
    //     } catch (error) {
    //         console.log('error: api-employee/createInsuranceEmployee', error.message);
    //         throw new InternalServerErrorException('error in creating user');
    //     }
    // }
    async createInsuranceEmployee(body: any): Promise<any> {
        try {
            const {
                email,
                firstName,
                lastName,
                middleName,
                phone,
                dateOfBirth,
                gender,
                dateOfJoining,
                branchId,
                departmentId,
                roleId,
                roId,
                company,
                probation,
                leaveDays,
                salary,
                status
            } = body;
            console.log("body---------->", body);
            // Validation: Check required fields
            if (!branchId) {
                throw new BadRequestException('Branch ID is required');
            }
            if (!body.departmentId) {
                throw new BadRequestException('Department ID is required');
            }

            // Fetch branch
            const branch = await this.branchService.findById(body.branchId);
            if (!branch) {
                throw new BadRequestException('Invalid Branch ID');
            }

            const department = await this.departmentService.findById(departmentId);
            if (!department) {
                throw new BadRequestException('Invalid Department ID');
            }



            // Construct user data
            const userData = {
                email: email,
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                dateOfBirth: dateOfBirth,
                gender: gender,
                dateOfJoining: dateOfJoining,
                company: 1,
                branch: branch,
                department: department,
                roleId: roleId ?? roleIds.staff,
                userType: roleId ?? roleIds.staff,
                reportingOfficer: roId === '' ? null : roId
            };

            // Create user
            const newUser = await this.userService.createInsuranceUser(userData);
            if (!newUser) {
                throw new InternalServerErrorException('Failed to create user');
            }

            // Validate empCode result
            const empCodeResult: any = await this.userRepo.query('CALL update_empCode(?, ?)', [
                newUser.id,
                branch.name
            ]);

            const empCodeStatus = empCodeResult?.[0]?.[0]?.status;

            if (empCodeStatus !== 'success') {
                throw new InternalServerErrorException('Failed to generate employee code');
            }

            // Return structured response
            return {
                success: true,
                message: 'Employee created successfully',
                data: {
                    userId: newUser.id,
                    empCode: `AI${branch.name.slice(0, 3).toUpperCase()}${newUser.id}`,
                    fullName: `${newUser.firstName} ${newUser.lastName}`
                }
            };
        } catch (error) {
            console.error('error: api-employee/createInsuranceEmployee', error.message);
            throw new InternalServerErrorException(error.message || 'Error in creating insurance employee');
        }
    }

    async updateInsuranceEmployee(body: any): Promise<any> {
        // console.log("jaghe pe jata=====================================")
        if (!body.branchId) {
            throw new BadRequestException('Branch ID is required');
        }
        const {
            user_id,
            email,
            firstName,
            lastName,
            middleName,
            phone,
            dateOfBirth,
            gender,
            dateOfJoining,
            branchId,
            departmentId,
            roleId,
            roId,
            isActive,
            company,
            probation,
            leaveDays,
            salary,
            status
        } = body;

        const user = await this.userRepo.findOne({ where: { id: user_id } });

        if (!user) {
            throw new NotFoundException('User details not found');
        }
        const branch = await this.branchRepo.findOne({
            where: { id: branchId },
            relations: ['company'] // this is essential to load the company
        });

        console.log('COMPANY id', branch.company.id);

        if (!branch) {
            throw new BadRequestException('Invalid Branch ID');
        }
        const existcompany = await this.companyRepo.findOne({
            where: { id: branch.company.id }
        });
        console.log('existeing company', existcompany.id);
        const existDepartment = await this.departmentRepo.findOne({ where: { id: departmentId } });
        // Set new values to existing user
        user.email = email;
        user.firstName = firstName;
        user.middleName = middleName;
        user.lastName = lastName;
        user.phoneNumber = phone;
        user.dateOfBirth = dateOfBirth;
        user.gender = gender;
        user.userType = roleId ?? Roles.staff;
        user.branch = branch;
        user.company = existcompany;
        user.department = existDepartment || null;
        user.reportingOfficer = roId || null;
        user.isActive = isActive;

        // Save updated user
        const updatedUser = await this.userRepo.save(user);
        if (!updatedUser) {
            throw new InternalServerErrorException('Failed to update user');
        }
        return {
            status: 'success',
            message: 'User update successfully',
            data: null
        };
    }

     async deleteEmployee(reqBody: any): Promise<any> {
        let result = {};
        try {
               const loggedInUser = this.loggedInsUserService.getCurrentUser();
                    if (!loggedInUser) {
                        throw new UnauthorizedException('User not logged in');
                    }
    
            const { user_id } = reqBody;
            if (!user_id) {
                throw new BadRequestException('User ID is required.');
            }

            result = await this.userRepo.update(user_id, {
                isActive: false,
                deletedAt: new Date(),
                updatedAt: new Date(),
                updatedBy: loggedInUser
            });
        } catch (error) {
            console.log('api- employee/deleteEmployee', error.message);

            result = {
                status: 'error',
                message: 'Error deleting employee',
                data: null
            };
        }
    }

    async calculateDealerRevenue(employeeId?: string, terminalId?: string, cocd?: string): Promise<void> {
        const segmentRevenues = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select('MAX(DATE(sub.tradeDate))')
                    .from(SegmentRevenue, 'sub')
                    .getQuery();
                return `DATE(sr.tradeDate) = ${subQuery}`;
            })
            .getMany();

        if (!segmentRevenues.length) {
            this.logger.warn('No segment revenue records found for latest trade date');
            return;
        }

        const clientIds = [...new Set(segmentRevenues.map((sr) => sr.clientId))];
        const clients = await this.dataSource.getRepository(Client).find({
            where: { id: In(clientIds) },
            relations: [
                'equityDealer',
                'equityDealer.employee',
                'commodityDealer1',
                'commodityDealer1.employee',
                'commodityDealer2',
                'commodityDealer2.employee',
                'rm'
            ]
        });
        const clientMap = new Map(clients.map((c) => [c.id, c]));

        const filteredRevenues = segmentRevenues.filter((sr) => {
            const client = clientMap.get(sr.clientId);
            const matchEmp =
                !employeeId ||
                (client &&
                    (client.equityDealer?.employee?.id === employeeId ||
                        client.commodityDealer1?.employee?.id === employeeId ||
                        client.commodityDealer2?.employee?.id === employeeId ||
                        client.rm?.id === employeeId));
            const matchTerm = !terminalId || sr.terminalId === terminalId;
            const matchCocd = !cocd || sr.cocd === cocd;
            return matchEmp && matchTerm && matchCocd;
        });

        if (!filteredRevenues.length) {
            this.logger.warn('No segment revenues matched the provided filters');
            return;
        }

        const grouped = this.groupAndAggregateSegmentRevenues(filteredRevenues);
        const upsertData: Partial<DealerRMRevenue>[] = [];

        for (const group of Object.values(grouped)) {
            const client = clientMap.get(group.clientId);
            if (!client) continue;
            const periodStart = new Date(group.tradeDate);
            periodStart.setHours(0, 0, 0, 0);

            const entities = [
                { emp: client.equityDealer?.employee, role: RevenueRole.DEALER },
                { emp: client.commodityDealer1?.employee, role: RevenueRole.DEALER },
                { emp: client.commodityDealer2?.employee, role: RevenueRole.DEALER },
                { emp: client.rm, role: RevenueRole.RM }
            ];

            for (const { emp, role } of entities) {
                if (!emp) continue;

                const id = `${emp.id}_${role}_${group.terminalId || 'no-terminal'}_${
                    periodStart.toISOString().split('T')[0]
                }_${group.cocd || 'no-cocd'}`;

                upsertData.push({
                    id,
                    employee: emp,
                    role,
                    terminalId: group.terminalId,
                    cocd: group.cocd,
                    periodStart,
                    netBrokerage:
                        typeof group.netBrokerage === 'string'
                            ? parseFloat(group.netBrokerage) || 0
                            : group.netBrokerage || 0,
                    tradeAmount: group.tradeAmount,
                    clients: [client]
                });
            }
        }

        if (upsertData.length) {
            await this.dataSource.getRepository(DealerRMRevenue).upsert(upsertData, {
                conflictPaths: ['id'],
                skipUpdateIfNoValuesChanged: true,
                upsertType: 'on-conflict-do-update'
            });
        } else {
            this.logger.warn('No DealerRMRevenue records to upsert');
        }
    }

    private groupAndAggregateSegmentRevenues(revenues: SegmentRevenue[]): {
        [key: string]: {
            clientId: string;
            terminalId: string | null;
            cocd: string | null;
            tradeDate: Date;
            netBrokerage: number;
            tradeAmount: number;
        };
    } {
        return revenues.reduce((acc, revenue) => {
            const key = `${revenue.clientId}_${revenue.terminalId}_${revenue.cocd}_${
                new Date(revenue.tradeDate).toISOString().split('T')[0]
            }`;

            if (!acc[key]) {
                acc[key] = {
                    clientId: revenue.clientId,
                    terminalId: revenue.terminalId,
                    cocd: revenue.cocd,
                    tradeDate: new Date(revenue.tradeDate),
                    netBrokerage: 0,
                    tradeAmount: 0
                };
            }

            acc[key].netBrokerage +=
                typeof revenue.netBrokerage === 'string'
                    ? parseFloat(revenue.netBrokerage) || 0
                    : revenue.netBrokerage || 0;

            acc[key].tradeAmount +=
                typeof revenue.tradeAmount === 'string'
                    ? parseFloat(revenue.tradeAmount) || 0
                    : revenue.tradeAmount || 0;

            return acc;
        }, {});
    }
}
