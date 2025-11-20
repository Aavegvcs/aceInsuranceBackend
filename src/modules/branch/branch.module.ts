import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { Branch } from './entities/branch.entity';
import { EmployeeModule } from '@modules/employee/employee.module';
import { Employee } from '@modules/employee/entities/employee.entity';
import { User } from '@modules/user/user.entity';
import { UserModule } from '@modules/user/user.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { State } from '@modules/states/entities/state.entity';
@Module({
    imports: [
        TypeOrmModule.forFeature([Branch, Employee, User, State]),
        forwardRef(() => EmployeeModule),
        forwardRef(() => UserModule),
    ],
    controllers: [BranchController],
    providers: [BranchService, LoggedInsUserService],
    exports: [BranchService]
})
export class BranchModule {}
