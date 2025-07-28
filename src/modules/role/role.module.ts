import { Module, forwardRef } from '@nestjs/common';
import { RoleService } from './role.service';
import { RoleController } from './role.controller';
import { Role } from './entities/role.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityModule } from '../ability/ability.module';
import { RoleFeatureActionModule } from '../role-feature-action/role-feature-action.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        forwardRef(() => AbilityModule),
        TypeOrmModule.forFeature([Role]),
        forwardRef(() => RoleFeatureActionModule),
        UserRoleModule,
        forwardRef(() => UserModule)
    ],
    controllers: [RoleController],
    providers: [RoleService],
    exports: [RoleService]
})
export class RoleModule {}
