import { Module, forwardRef } from '@nestjs/common';
import { UserFeatureActionService } from './user-feature-action.service';
import { UserFeatureActionController } from './user-feature-action.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFeatureAction } from './entities/user-feature-action.entity';
import { UserModule } from '../user/user.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { RoleFeatureAction } from '../role-feature-action/entities/role-feature-action.entity';
import { RoleModule } from '../role/role.module';
import { ActionModule } from '../action/action.module';
import { FeatureModule } from '../feature/feature.module';
import { FeatureActionModule } from '../feature-action/feature-action.module';
import { AbilityModule } from '../ability/ability.module';
@Module({
    imports: [
        forwardRef(() => UserModule),
        UserRoleModule,
        forwardRef(() => AbilityModule),
        forwardRef(() => RoleModule),
        ActionModule,
        forwardRef(() => FeatureModule),
        FeatureActionModule,
        TypeOrmModule.forFeature([UserFeatureAction, RoleFeatureAction])
    ],
    controllers: [UserFeatureActionController],
    providers: [UserFeatureActionService],
    exports: [UserFeatureActionService]
})
export class UserFeatureActionModule {}
