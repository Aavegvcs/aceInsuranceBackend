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
import { generateUUID, roleIds, Roles } from 'src/utils/app.utils';
import { BranchService } from '@modules/branch/branch.service';
import { DepartmentService } from '@modules/department/department.service';
import { Dealer, DealerType } from './entities/dealer.entity';
import { Department } from '@modules/department/entities/department.entity';
import { UserRole } from '@modules/user-role/entities/user-role.entity';
import { Company } from '@modules/company/entities/company.entity';
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

        const empId = generateUUID('EMP', branch.id.toString());
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
            // console.log("body---------->", body);
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
}
