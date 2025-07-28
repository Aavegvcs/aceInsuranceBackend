import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { Branch } from './entities/branch.entity';
import { BranchRevenue } from './entities/branch-revenue.entity';
import { EmployeeModule } from '@modules/employee/employee.module';
import { Employee } from '@modules/employee/entities/employee.entity';
import { DashboardModule } from '@modules/dashboard/dashboard.module';

@Module({
    imports: [TypeOrmModule.forFeature([Branch, BranchRevenue, Employee]), forwardRef(() => EmployeeModule), forwardRef(() => DashboardModule)],
    controllers: [BranchController],
    providers: [BranchService],
    exports: [BranchService]
})
export class BranchModule { }
