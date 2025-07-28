import { Module, forwardRef } from '@nestjs/common';
import { RoleFeatureActionService } from './role-feature-action.service';
import { RoleFeatureActionController } from './role-feature-action.controller';
import { RoleFeatureAction } from './entities/role-feature-action.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbilityModule } from '../ability/ability.module';
import { ActionModule } from '../action/action.module';
import { FeatureModule } from '../feature/feature.module';
import { FeatureActionModule } from '../feature-action/feature-action.module';
import { RoleModule } from '../role/role.module';
import { UserModule } from '../user/user.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        forwardRef(() => AuthModule),
        forwardRef(() => UserModule),
        UserRoleModule,
        ActionModule,
        FeatureModule,
        FeatureActionModule,
        forwardRef(() => RoleModule),
        TypeOrmModule.forFeature([RoleFeatureAction]),
        forwardRef(() => AbilityModule)
    ],
    controllers: [RoleFeatureActionController],
    providers: [RoleFeatureActionService],
    exports: [RoleFeatureActionService]
})
export class RoleFeatureActionModule {}
