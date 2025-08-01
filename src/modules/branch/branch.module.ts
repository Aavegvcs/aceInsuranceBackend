import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { Branch } from './entities/branch.entity';
import { EmployeeModule } from '@modules/employee/employee.module';
import { Employee } from '@modules/employee/entities/employee.entity';
@Module({
    imports: [
        TypeOrmModule.forFeature([Branch, Employee]),
        forwardRef(() => EmployeeModule),
    ],
    controllers: [BranchController],
    providers: [BranchService],
    exports: [BranchService]
})
export class BranchModule {}
