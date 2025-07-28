import { Module, forwardRef } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { RoleFeatureActionModule } from '../role-feature-action/role-feature-action.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { FeatureModule } from '../feature/feature.module';
import { ActionModule } from '../action/action.module';
import { AbilityFactory } from './ability.factory';
import { FeatureActionModule } from '../feature-action/feature-action.module';
import { RoleModule } from '../role/role.module';
import { UserFeatureActionModule } from '../user-feature-action/user-feature-action.module';

@Module({
    imports: [
        forwardRef(() => UserModule),
        UserRoleModule,
        forwardRef(() => FeatureActionModule),
        forwardRef(() => FeatureModule),
        forwardRef(() => UserFeatureActionModule),
        forwardRef(() => ActionModule),
        forwardRef(() => RoleModule),
        forwardRef(() => RoleFeatureActionModule)
    ],
    controllers: [],
    providers: [AbilityFactory],
    exports: [AbilityFactory]
})
export class AbilityModule {}
