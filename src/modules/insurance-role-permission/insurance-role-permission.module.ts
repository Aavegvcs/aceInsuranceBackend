import { Global, Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { RoleModule } from '../role/role.module';
import { HttpModule } from '@nestjs/axios';
import { InsuranceRolePermissionService } from './insurance-role-permission.service';
import { InsuranceRolePermissionController } from './insurance-role-permission.controller';
import { InsuranceRoleAccess } from './entities/insurance-role-access.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { InsurancePermission } from './entities/insurance-permission.entity';

@Global()
@Module({
    imports: [
        RoleModule,
        TypeOrmModule.forFeature([User, InsuranceRoleAccess, InsurancePermission]),
        forwardRef(() => UserModule),
        HttpModule
    ],
    providers: [InsuranceRolePermissionService, LoggedInsUserService],
    controllers: [InsuranceRolePermissionController],
    exports: [InsuranceRolePermissionService]
})
export class InsuranceRolePermissionModule {}
