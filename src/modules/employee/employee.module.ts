import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { Employee } from './entities/employee.entity';
import { UserService } from '@modules/user/user.service';
import { User } from '@modules/user/user.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { UserModule } from '@modules/user/user.module';
import { BranchModule } from '@modules/branch/branch.module';
import { DepartmentModule } from '@modules/department/department.module';
import { Dealer } from './entities/dealer.entity';
import { CompanyModule } from '@modules/company/company.module';
import { Company } from '@modules/company/entities/company.entity';
import { UserRole } from '@modules/user-role/entities/user-role.entity';
import { Department } from '@modules/department/entities/department.entity';
import { DealerRMRevenue } from './entities/dealer-rm-revenue.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Employee, User, Branch, Dealer, Company, UserRole, Department, DealerRMRevenue, Company]),
        forwardRef(() => UserModule),
        forwardRef(() => BranchModule),
        forwardRef(() => DepartmentModule),
        forwardRef(()=> CompanyModule),
        forwardRef(() => DepartmentModule),
        forwardRef(() => CompanyModule),

    ],
    controllers: [EmployeeController],
    providers: [EmployeeService],
    exports: [EmployeeService]
})
export class EmployeeModule {}
