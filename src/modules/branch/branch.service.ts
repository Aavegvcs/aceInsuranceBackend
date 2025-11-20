import { BadRequestException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchModels, Designation, generateUUID } from 'src/utils/app.utils';
import { orderByKey, orderByValue } from 'src/utils/app.utils';
import { Employee } from '@modules/employee/entities/employee.entity';
import { EmployeeService } from '@modules/employee/employee.service';
import 'moment-timezone';
import { State } from '@modules/states/entities/state.entity';
import { User } from '@modules/user/user.entity';
import { CreateEmployeeDto } from '@modules/employee/dto/employee.dto';
import { standardResponse } from 'src/utils/helper/response.helper';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';

interface CreateBranchDtoWithRowNumber extends CreateBranchDto {
    originalRowNumber: number;
}

export interface IChurn {
    particulars: string;
    activeClientsAvg: number;
    target: number;
    achieved: number;
}

@Injectable()
export class BranchService {
    private readonly logger = new Logger(BranchService.name);

    constructor(
        @InjectRepository(Branch)
        private readonly branchRepository: Repository<Branch>,
        @InjectRepository(State)
        private readonly stateRepository: Repository<State>,
        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,
        @Inject(forwardRef(() => EmployeeService))
        private readonly employeeService: EmployeeService,
        private readonly dataSource: DataSource,
        private readonly loggedInsUserService: LoggedInsUserService
    ) {}

    // async create(createBranchDto: CreateBranchDto): Promise<any> {
    //     return this.branchRepository.manager
    //         .transaction(async (transactionalEntityManager) => {
    //             if (!createBranchDto.id || typeof createBranchDto.id !== 'string') {
    //                 throw new BadRequestException('Branch id is required and must be a valid string');
    //             }

    //             const existingBranch = await transactionalEntityManager.findOne(Branch, {
    //                 where: { id: Equal(createBranchDto.id) },
    //             });
    //             if (existingBranch) {
    //                 throw new BadRequestException(`Branch with id ${createBranchDto.id} already exists`);
    //             }

    //             const branchId = createBranchDto.id || generateUUID('BR');

    //             let state: State | null = null;
    //             if (createBranchDto.stateId) {
    //                 state = await transactionalEntityManager.findOne(State, {
    //                     where: { id: createBranchDto.stateId },
    //                 });
    //                 if (!state) {
    //                     throw new NotFoundException(`State with ID ${createBranchDto.stateId} not found`);
    //                 }
    //             }

    //             let regionalManager: Employee | null = null;
    //             if (createBranchDto.regionalManagerId) {
    //                 regionalManager = await transactionalEntityManager.findOne(Employee, {
    //                     where: { id: createBranchDto.regionalManagerId },
    //                 });
    //                 if (!regionalManager) {
    //                     const employeeDto: CreateEmployeeDto = {
    //                         employeeId: createBranchDto.regionalManagerId,
    //                         branchId: branchId,
    //                         companyId: createBranchDto.companyId,
    //                         designation: Designation.regionalManager,
    //                         status: EmployeeStatus.ACTIVE,
    //                         firstName: createBranchDto.regionalManagerId,
    //                         email: `dummy.rm.${createBranchDto.regionalManagerId}@company.com`,
    //                         roleId: roleIds.admin,
    //                     };
    //                     const result = await this.employeeService.bulkCreate([employeeDto]);
    //                     if (result.data.created === 0) {
    //                         throw new BadRequestException(
    //                             `Failed to create regional manager: ${result.data.errors[0]?.error}`,
    //                         );
    //                     }
    //                     regionalManager = result.data.createdEntities[0];
    //                 }
    //             }

    //             let controlBranch: Branch | null = null;
    //             const controlBranchId = createBranchDto.controlBranchId?.toUpperCase();
    //             const isSelfControlBranch = controlBranchId === branchId.toUpperCase();

    //             if (controlBranchId && !isSelfControlBranch) {
    //                 controlBranch = await transactionalEntityManager.findOne(Branch, {
    //                     where: { id: controlBranchId },
    //                 });
    //                 if (!controlBranch) {
    //                     throw new NotFoundException(`Control Branch with ID ${controlBranchId} not found`);
    //                 }
    //             }

    //             const newBranch = transactionalEntityManager.create(Branch, {
    //                 id: branchId,
    //                 name: createBranchDto.name,
    //                 model: createBranchDto.model,
    //                 state: state || undefined,
    //                 city: createBranchDto.city,
    //                 pincode: createBranchDto.pincode,
    //                 address: createBranchDto.address,
    //                 active: createBranchDto.active ?? true,
    //                 segments: createBranchDto.segments || [],
    //                 email: createBranchDto.email,
    //                 phone: createBranchDto.phone,
    //                 contactPerson: createBranchDto.contactPerson,
    //                 panNumber: createBranchDto.panNumber,
    //                 activationDate: createBranchDto.activationDate,
    //                 regionalManager: regionalManager || undefined,
    //                 controlBranch: controlBranch || undefined,
    //                 mappingStatus: createBranchDto.mappingStatus ?? false,
    //                 sharing: createBranchDto.sharing,
    //                 terminals: createBranchDto.terminals || [],
    //             });

    //             let savedBranch = await transactionalEntityManager.save(Branch, newBranch);

    //             // If self-control, assign after save to avoid FK violation
    //             if (isSelfControlBranch) {
    //                 savedBranch.controlBranch = savedBranch;
    //                 savedBranch = await transactionalEntityManager.save(Branch, savedBranch);
    //             }

    //             // Return clean JSON without circular refs
    //             const response = {
    //                 ...savedBranch,
    //                 controlBranch: isSelfControlBranch
    //                     ? savedBranch.id
    //                     : savedBranch.controlBranch?.id ?? null,
    //                 regionalManager: savedBranch.regionalManager?.id ?? null,
    //                 state: savedBranch.state ? {
    //                     id: savedBranch.state.id,
    //                     name: savedBranch.state.name
    //                 } : null,
    //             };

    //             return response;
    //         })
    //         .catch((error) => {
    //             this.logger.error(`Failed to create branch: ${error.message}`);
    //             if (error instanceof BadRequestException || error instanceof NotFoundException) {
    //                 throw error;
    //             }
    //             throw new BadRequestException(`Failed to create branch: ${error.message}`);
    //         });
    // }

    // async bulkCreate(dtos: CreateBranchDto[]): Promise<BulkInsertResult<Branch>> {
    //     const result: BulkInsertResult<Branch> = {
    //         statusCode: 201,
    //         message: 'success',
    //         data: {
    //             total: dtos.length,
    //             created: 0,
    //             failed: 0,
    //             errors: [],
    //             createdEntities: [],
    //         },
    //     };

    //     if (dtos.length === 0) {
    //         this.logger.warn('No branch DTOs provided for bulk creation');
    //         return {
    //             statusCode: 400,
    //             message: 'No branches provided',
    //             data: { total: 0, created: 0, failed: 0, errors: [], createdEntities: [] },
    //         };
    //     }

    //     const dtosWithRowNumber: CreateBranchDtoWithRowNumber[] = dtos.map((dto, index) => ({
    //         ...dto,
    //         originalRowNumber: index + 2,
    //     }));

    //     const graph = new Map<string, string[]>();
    //     const branchMap = new Map<string, CreateBranchDtoWithRowNumber>();
    //     const controlBranchIds: Set<string> = new Set();

    //     dtosWithRowNumber.forEach((dto) => {
    //         branchMap.set(dto.id, dto);
    //         if (dto.controlBranchId) {
    //             controlBranchIds.add(dto.controlBranchId);
    //             if (!graph.has(dto.controlBranchId)) {
    //                 graph.set(dto.controlBranchId, []);
    //             }
    //             graph.get(dto.controlBranchId)!.push(dto.id);
    //         }
    //     });

    //     const controlBranches = await this.branchRepository.find({
    //         where: { id: In(Array.from(controlBranchIds)) },
    //     });
    //     const controlBranchMap = new Map(controlBranches.map((branch) => [branch.id, branch]));

    //     const visited = new Set<string>();
    //     const recursionStack = new Set<string>();
    //     const cycles = new Set<string>();

    //     const detectCycles = (node: string) => {
    //         visited.add(node);
    //         recursionStack.add(node);
    //         const neighbors = graph.get(node) || [];
    //         for (const neighbor of neighbors) {
    //             if (!visited.has(neighbor)) {
    //                 detectCycles(neighbor);
    //             } else if (recursionStack.has(neighbor)) {
    //                 cycles.add(neighbor);
    //             }
    //         }
    //         recursionStack.delete(node);
    //     };

    //     dtosWithRowNumber.forEach((dto) => {
    //         if (!visited.has(dto.id)) {
    //             detectCycles(dto.id);
    //         }
    //     });

    //     const dtosToInsert = dtosWithRowNumber.map((dto) => {
    //         if (cycles.has(dto.id) && dto.controlBranchId) {
    //             return { ...dto, controlBranchId: null };
    //         }
    //         return dto;
    //     });

    //     const sortedDtos: CreateBranchDtoWithRowNumber[] = [];
    //     const tempVisited = new Set<string>();

    //     const topologicalSort = (node: string) => {
    //         if (tempVisited.has(node)) return;
    //         tempVisited.add(node);
    //         const neighbors = graph.get(node) || [];
    //         for (const neighbor of neighbors) {
    //             topologicalSort(neighbor);
    //         }
    //         const dto = dtosToInsert.find((d) => d.id === node);
    //         if (dto) sortedDtos.push(dto);
    //     };

    //     dtosToInsert.forEach((dto) => {
    //         if (!tempVisited.has(dto.id)) {
    //             topologicalSort(dto.id);
    //         }
    //     });

    //     const branchesToCreate = sortedDtos
    //         .map((dto) => {
    //             let controlBranch: Branch | null = null;
    //             if (dto.controlBranchId && !cycles.has(dto.id)) {
    //                 controlBranch = controlBranchMap.get(dto.controlBranchId.toUpperCase());
    //                 if (!controlBranch) {
    //                     result.data.errors.push({
    //                         row: dto.originalRowNumber,
    //                         entityName: 'Branch',
    //                         error: `Control branch with ID ${dto.controlBranchId} not found`,
    //                     });
    //                     result.data.failed++;
    //                     return null;
    //                 }
    //             }

    //             return this.branchRepository.create({
    //                 ...dto,
    //                 state: dto.stateId ? { id: dto.stateId } : null,
    //                 regionalManager: null,
    //                 controlBranch: controlBranch,
    //             });
    //         })
    //         .filter((branch) => branch !== null) as Branch[];

    //     let createdBranches: Branch[] = [];
    //     try {
    //         createdBranches = await this.branchRepository.save(branchesToCreate);
    //     } catch (error) {
    //         this.logger.error(`Failed to batch insert branches: ${error.message}`);
    //         result.data.errors.push({
    //             row: 1,
    //             entityName: 'Branch',
    //             error: `Failed to batch insert branches: ${error.message}`,
    //         });
    //         result.data.failed += branchesToCreate.length;
    //         return result;
    //     }

    //     const regionalManagerIds = new Set<string>();
    //     sortedDtos.forEach((dto) => {
    //         if (dto.regionalManagerId) regionalManagerIds.add(dto.regionalManagerId);
    //     });

    //     const existingEmployees = await this.employeeRepository.find({
    //         where: { id: In(Array.from(regionalManagerIds)) },
    //     });
    //     const existingRmIds = new Set(existingEmployees.map((emp) => emp.id));
    //     const missingRmIds = Array.from(regionalManagerIds).filter((id) => !existingRmIds.has(id));

    //     const rmToBranchMap = new Map<string, Branch>();
    //     for (const dto of sortedDtos) {
    //         if (dto.regionalManagerId && missingRmIds.includes(dto.regionalManagerId)) {
    //             if (!rmToBranchMap.has(dto.regionalManagerId)) {
    //                 const branch = createdBranches.find((b) => b.id === dto.id);
    //                 if (branch) rmToBranchMap.set(dto.regionalManagerId, branch);
    //             }
    //         }
    //     }

    //     const dummyEmployeeDtos: CreateEmployeeDto[] = Array.from(rmToBranchMap).map(([rmId, branch]) => ({
    //         employeeId: rmId,
    //         branchId: branch.id,
    //         companyId: sortedDtos.find((dto) => dto.regionalManagerId === rmId)?.companyId || 1,
    //         designation: Designation.regionalManager,
    //         status: EmployeeStatus.ACTIVE,
    //         firstName: rmId,
    //         email: `dummy.rm.${rmId}@company.com`,
    //         roleId: roleIds.admin,
    //         salary: 0,
    //         probation: false,
    //         password: '12345678',
    //     }));

    //     if (dummyEmployeeDtos.length > 0) {
    //         const employeeResult = await this.employeeService.bulkCreate(dummyEmployeeDtos);
    //         if (employeeResult.data.created !== dummyEmployeeDtos.length) {
    //             employeeResult.data.errors.forEach((err) => {
    //                 result.data.errors.push({
    //                     row: err.row,
    //                     entityName: 'Employee',
    //                     error: `Failed to create regional manager: ${err.error}`,
    //                 });
    //                 result.data.failed++;
    //             });
    //         }
    //     }

    //     const branchesToUpdate = [];
    //     for (const dto of sortedDtos) {
    //         if (dto.regionalManagerId) {
    //             const branch = createdBranches.find((b) => b.id === dto.id);
    //             if (branch) {
    //                 const employee = await this.employeeRepository.findOne({ where: { id: dto.regionalManagerId } });
    //                 if (employee) {
    //                     branch.regionalManager = employee;
    //                     branchesToUpdate.push(branch);
    //                 } else {
    //                     result.data.errors.push({
    //                         row: dto.originalRowNumber,
    //                         entityName: 'Branch',
    //                         error: `Regional manager with ID ${dto.regionalManagerId} not found after creation`,
    //                     });
    //                     result.data.failed++;
    //                 }
    //             }
    //         }
    //     }

    //     if (branchesToUpdate.length > 0) {
    //         await this.branchRepository.save(branchesToUpdate);
    //     }

    //     const updatedControlBranches = [];
    //     for (const dto of dtosWithRowNumber) {
    //         if (cycles.has(dto.id) && dto.controlBranchId) {
    //             const branch = createdBranches.find((b) => b.id === dto.id);
    //             if (branch) {
    //                 const controlBranch =
    //                     controlBranchMap.get(dto.controlBranchId) ||
    //                     createdBranches.find((b) => b.id === dto.controlBranchId);
    //                 if (controlBranch) {
    //                     branch.controlBranch = controlBranch;
    //                     updatedControlBranches.push(branch);
    //                 } else {
    //                     result.data.errors.push({
    //                         row: dto.originalRowNumber,
    //                         entityName: 'Branch',
    //                         error: `Control branch with ID ${dto.controlBranchId} not found for cycle restoration`,
    //                     });
    //                     result.data.failed++;
    //                 }
    //             }
    //         }
    //     }

    //     if (updatedControlBranches.length > 0) {
    //         await this.branchRepository.save(updatedControlBranches);
    //     }

    //     result.data.created = createdBranches.length - result.data.failed;
    //     result.data.createdEntities = createdBranches;
    //     if (result.data.failed > 0) {
    //         result.statusCode = 400;
    //         result.message = `Success: ${result.data.created} records inserted out of ${result.data.total}, with ${result.data.failed} errors`;
    //     } else {
    //         result.message = `Success: ${result.data.created} records inserted out of ${result.data.total}`;
    //     }

    //     return result;
    // }

    // --------------- create branches -------------------

    async create(createBranchDto: any): Promise<any> {
        const userEntity = await this.loggedInsUserService.getCurrentUser();
        return this.branchRepository.manager
            .transaction(async (transactionalEntityManager) => {
                if (!createBranchDto.branchCode || typeof createBranchDto.branchCode !== 'string') {
                    throw new BadRequestException('Branch id is required and must be a valid string');
                }

                const existingBranch = await transactionalEntityManager.findOne(Branch, {
                    where: { name: createBranchDto.branchCode }
                });
                if (existingBranch) {
                    throw new BadRequestException(`Branch with name ${createBranchDto.branchCode} already exists`);
                }

                const branchCode = createBranchDto.branchCode || generateUUID('BR');

                let state: State | null = null;
                if (createBranchDto.stateId) {
                    state = await transactionalEntityManager.findOne(State, {
                        where: { id: createBranchDto.stateId }
                    });
                    if (!state) {
                        throw new NotFoundException(`State with ID ${createBranchDto.stateId} not found`);
                    }
                }

                let regionalManager: User | null = null;

                regionalManager = await transactionalEntityManager.findOne(User, {
                    where: { id: createBranchDto.regionalManagerId }
                });

                let controlBranch = null;
                const controlBranchId = createBranchDto.controlBranchId?.toUpperCase();
                const isSelfControlBranch = controlBranchId === branchCode.toUpperCase();

                if (controlBranchId && !isSelfControlBranch) {
                    controlBranch = await transactionalEntityManager.findOne(Branch, {
                        where: { id: controlBranchId }
                    });
                    if (!controlBranch) {
                        throw new NotFoundException(`Control Branch with ID ${controlBranchId} not found`);
                    }
                }

                const newBranch = transactionalEntityManager.create(Branch, {
                    branchCode: branchCode,
                    company: { id: 1 }, // only if you are passing company entity
                    name: createBranchDto.branchName,
                    model: 'Branch',
                    state: state || undefined, // should be a State entity object
                    city: createBranchDto.city,
                    pincode: createBranchDto.pincode,
                    isActive: createBranchDto.active ?? true,
                    address: createBranchDto.address,
                    segments: createBranchDto.segments || [],
                    email: createBranchDto.email,
                    phone: createBranchDto.phone,
                    contactPerson: createBranchDto.contactPerson,
                    panNumber: createBranchDto.panNumber,
                    activationDate: createBranchDto.activationDate,
                    regionalManager: regionalManager || undefined, // must be User entity
                    mappingStatus: createBranchDto.mappingStatus ?? false,
                    sharing: createBranchDto.sharing,
                    terminals: createBranchDto.terminals || [],
                    controlBranch: controlBranch || null // must be Branch entity
                });

                let savedBranch = await transactionalEntityManager.save(Branch, newBranch);

                // If self-control, assign after save to avoid FK violation
                if (isSelfControlBranch) {
                    savedBranch.controlBranch = savedBranch.controlBranch;
                    savedBranch = await transactionalEntityManager.save(Branch, savedBranch);
                }

                // Return clean JSON without circular refs
                // const response = {
                //     ...savedBranch,
                //     controlBranch: isSelfControlBranch ? savedBranch.id : (savedBranch.controlBranch?.id ?? null),
                //     regionalManager: savedBranch.regionalManager?.id ?? null,
                //     state: savedBranch.state
                //         ? {
                //               id: savedBranch.state.id,
                //               name: savedBranch.state.name
                //           }
                //         : null
                // };

                return standardResponse(true, 'Branch is Created', 201, null, null, 'branches/create');

                // return response;
            })
            .catch((error) => {
                this.logger.error(`Failed to create branch: ${error.message}`);
                if (error instanceof BadRequestException || error instanceof NotFoundException) {
                    throw error;
                }
                throw new BadRequestException(`Failed to create branch: ${error.message}`);
            });
    }

    async findAll(req: any): Promise<any> {
        Logger.log('QUERY_String', req?.QUERY_STRING);
        // Single query for data and counts
        const branches = await this.branchRepository
            .createQueryBuilder('branch')
            .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
            .leftJoinAndSelect('branch.regionalManager', 'regionalManager')
            .where('branch.deletedAt IS NULL')
            // .andWhere('branch.model = :model', { model: BranchModels.BRANCH })
            .andWhere(req?.QUERY_STRING?.where || '1=1')
            .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'branch' }), orderByValue({ req }))
            .offset(req?.QUERY_STRING?.skip || 0)
            .limit(req?.QUERY_STRING?.limit || 10)
            .getMany();

        // Transform results
        const items = branches.map((branch: any) => ({
            id: branch.id,
            name: branch.name,
            city: branch.city,
            email: branch.email,
            phone: branch.phone,
            model: branch.model,
            controlBranch: branch.controlBranch
                ? { id: branch.controlBranch.id, name: branch.controlBranch.name }
                : null,
            regionalManager: branch.regionalManager
                ? { id: branch.regionalManager.id, name: branch.regionalManager.name }
                : null,
            active: branch.active,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt,
            deletedAt: branch.deletedAt
        }));

        // Create query builder for additional queries
        const qb = this.branchRepository
            .createQueryBuilder('branch')
            // .where('branch.model = :model', { model: BranchModels.BRANCH })
            .andWhere('branch.deletedAt IS NULL')
            .andWhere(req.where || '1=1'); // Safe default for where clause

        return { qb, items };
    }

    async findById(id: number, manager?: EntityManager): Promise<Branch> {
        const repo = manager ? manager.getRepository(Branch) : this.branchRepository;
        const branch = await repo.findOne({
            where: { id },
            relations: {
                regionalManager: true,
                state: true
            }
        });
        if (!branch) throw new Error(`Branch with ID ${id} not found`);
        return branch;
    }

    async update(id: number, updateBranchDto: UpdateBranchDto): Promise<Branch> {
        return this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
            const branch = await this.findById(id, transactionalEntityManager);

            Object.assign(branch, {
                ...updateBranchDto,
                activationDate: updateBranchDto.activationDate,
                state: updateBranchDto.stateId ? { id: updateBranchDto.stateId } : branch.state,
                regionalManager: updateBranchDto.regionalManagerId
                    ? { id: updateBranchDto.regionalManagerId }
                    : branch.regionalManager,
                controlBranch: updateBranchDto.controlBranchId
                    ? { id: updateBranchDto.controlBranchId }
                    : branch.controlBranch
            });

            return await transactionalEntityManager.save(Branch, branch);
        });
    }

    async toggleStatus(id: number): Promise<Branch> {
        const branch = await this.branchRepository.findOne({ where: { id } });

        if (!branch) {
            throw new Error(`Branch with id ${id} not found`);
        }
        Logger.log('status', branch.isActive);
        branch.isActive = !branch.isActive;
        Logger.log('status 2', branch.isActive);

        return this.branchRepository.save(branch);
    }

    async remove(id: number): Promise<void> {
        await this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
            const branch = await this.findById(id, transactionalEntityManager);

            // await transactionalEntityManager.softDelete(BranchRevenue, { branchId: id });
            await transactionalEntityManager.softDelete(Branch, id);
        });
    }

    // async resolveBranchIds(employee: Employee): Promise<string[]> {
    //     switch (employee.designation) {
    //         case Designation.regionalManager:
    //             const regionalBranches = await this.dataSource.getRepository(Branch).find({
    //                 where: { regionalManager: { id: employee.id }, model: BranchModels.BRANCH },
    //                 select: ['id']
    //             });
    //             return regionalBranches.map((branch) => branch.id);
    //         case Designation.branchManager:
    //             const subBranches = await this.dataSource.getRepository(Branch).find({
    //                 where: { id: employee.branch.id },
    //                 relations: ['subBranches']
    //             });

    //             const subBranchIds = subBranches.flatMap((branch) => branch.subBranches.map((sub) => sub.id));
    //             return subBranchIds;

    //         case Designation.superAdmin:
    //             const allBranches = await this.dataSource.getRepository(Branch).find({
    //                 where: { model: BranchModels.BRANCH },
    //                 select: ['id']
    //             });
    //             return allBranches.map((branch) => branch.id);
    //         default:
    //             this.logger.warn(`Unsupported designation: ${employee.designation}`);
    //             return [];
    //     }
    // }

    async getAllBranches(): Promise<any> {
        try {
            return await this.branchRepository.find({
                select: ['id'],
                where: {
                    // model: In([BranchModels.BRANCH, BranchModels.FRANCHISE])
                }
            });
        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }

    async getBranch(): Promise<any> {
        try {
            const query = 'CALL get_branch()';

            const result = await this.branchRepository.query(query);
            return {
                status: 'success',
                message: 'success fully data fetch',
                result: result[0]
            };
        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }

    async getDetailsBranch(): Promise<any> {
        console.log('in get details branch api');

        // const branches = await this.branchRepository
        //     .createQueryBuilder('branch')
        //      .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
        //     .leftJoinAndSelect('branch.regionalManager', 'regionalManager')
        //     .leftJoinAndSelect('branch.state', 'state')
        //     .where('branch.deletedAt IS NULL')
        //     .getMany();
        const branches = await this.branchRepository.find({
            relations: {
                regionalManager: true,
                state: true
            }
        });

        for (let branch of branches) {
            if (branch.controlBranch) {
                branch['controlBranchDetails'] = await this.branchRepository.findOne({
                    where: { branchCode: branch.controlBranch },
                    select: {
                        id: true,
                        name: true,
                        branchCode: true
                    }
                });
            } else {
                branch['controlBranchDetails'] = null;
            }
        }

        console.log('branches is here ===================================', branches);
        // let branches = await this.branchRepository.find({
        //     relations: ['regionalManager', 'controlBranch', 'state']
        // });
        // Transform results
        const items = branches.map((branch: any) => ({
            branchId: branch?.id,
            branchCode: branch?.branchCode,
            branchName: branch?.name,
            email: branch?.email,
            phone: branch?.phone,
            pincode: branch?.pincode,
            contactPerson: branch?.contactPerson,
            panNumber: branch?.panNumber,
            activationDate: branch?.activationDate,
            stateId: branch?.state?.id,
            stateName: branch?.state?.name,
            regionalManagerId: branch?.regionalManager?.id || null,
            regionalManagerName: branch?.regionalManager
                ? `${branch.regionalManager.firstName || ''}(${branch.regionalManager.employeeCode || ''})`.trim()
                : null,
            controlBranchId: branch?.controlBranchDetails?.id,
            controlBranchName: branch?.controlBranchDetails
                ? `${branch.controlBranchDetails.name || ''}(${branch.controlBranchDetails.branchCode || ''})`.trim()
                : null,
            isActive: branch?.isActive,
            createdAt: branch?.createdAt,
            updatedAt: branch?.updatedAt,
            deletedAt: branch?.deletedAt
        }));
        console.log('after fetching branch here is data', items);

        return { items };
    }

    // bulk upload of branch

    async branchBulkUpload(reqBody: any): Promise<any> {
        const failed: { index: number; name: string; reason: string }[] = [];
        const data = reqBody.data || [];
        const startIndex = reqBody.startIndex;
        const userEntity = await this.loggedInsUserService.getCurrentUser();

        if (!userEntity) {
            return standardResponse(false, 'Logged user not found', 404, null, null, 'branches/branchBulkUpload');
        }

        try {
            if (!Array.isArray(data) || data.length === 0) {
                return standardResponse(
                    true,
                    'No data provided for bulk upload',
                    404,
                    {
                        successCount: 0,
                        failedCount: 0,
                        failed: []
                    },
                    null,
                    'branches/branchBulkUpload'
                );
            }

            const incomingBranchCodes = data.map((item) => item.Code);
            // console.log('incoming branch codes', incomingBranchCodes);

            const existingBranches = await this.branchRepository.find({
                where: { branchCode: In(incomingBranchCodes) }
            });

            const existingSet = new Set(existingBranches.map((b) => b.branchCode));
            // console.log('existing branch set', existingSet);

            const uniqueData = [];
            const headerOffset = 1;

            data.forEach((item, index) => {
                const rowIndex = startIndex + index + headerOffset;

                if (existingSet.has(item.Code)) {
                    failed.push({
                        index: rowIndex,
                        name: item.Code,
                        reason: `Branch '${item.Code}' already exists`
                    });
                } else {
                    uniqueData.push(item);
                }
            });
            console.log('failed data', failed);
            console.log('unique data is here', uniqueData);

            // -----------------------------
            // INSERTING CLEAN DATA
            // -----------------------------
            for (let i = 0; i < uniqueData.length; i++) {
                const item = uniqueData[i];
                const rowIndex = startIndex + i + headerOffset;

                try {
                    const state = await this.stateRepository.findOne({
                        where: { name: item['State Name'] }
                    });

                    // const controlBranch = await this.branchRepository.findOne({
                    //     where: { branchCode: item['Contrl Br'] }
                    // });

                    const newBranch = this.branchRepository.create({
                        branchCode: item.Code,
                        name: item.Name,
                        model: 'Branch',
                        city: item.City,
                        email: item.Email,
                        phone: item.Mobile,
                        panNumber: item['PAN No'],
                        pincode: item.Pincode,
                        region: item['Region Master'],
                        address: item.Address || null,
                        state: state || null,
                        controlBranch: item['Contrl Br'] || null,
                        company: { id: 1 }, // if company = 1
                        isActive: true,
                        createdAt: new Date()
                    });

                    // console.log('finally inserting data', newBranch);

                    await this.branchRepository.save(newBranch);
                } catch (error) {
                    failed.push({
                        index: rowIndex,
                        name: item.Code,
                        reason: error.message || 'Database error'
                    });
                }
            }

            const successCount = uniqueData.length - failed.length;
            const failedCount = failed.length;

            let message = 'Data inserted successfully.';
            if (successCount > 0 && failedCount > 0) message = 'Data partially inserted!';
            if (successCount === 0) message = 'Failed to insert data!';

            return standardResponse(
                true,
                message,
                200,
                {
                    successCount,
                    failedCount,
                    failed
                },
                null,
                'branches/branchBulkUpload'
            );
        } catch (error) {
            return standardResponse(
                false,
                'Failed! to insert data',
                500,
                {
                    successCount: 0,
                    failedCount: data.length,
                    failed: data.map((item, index) => ({
                        index: startIndex + index,
                        name: item.Code,
                        reason: error.message
                    }))
                },
                null,
                'branches/branchBulkUpload'
            );
        }
    }
}
