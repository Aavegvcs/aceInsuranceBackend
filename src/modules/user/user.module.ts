import { MiddlewareConsumer, Module, RequestMethod, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notification/notification.module';
import { AddressModule } from '../address/address.module';
import { MediaModule } from '../media/media.module';
import { ReferenceModule } from '../reference/reference.module';
import { UserRoleModule } from '../user-role/user-role.module';
import { FeatureActionModule } from '../feature-action/feature-action.module';
import { FeatureModule } from '../feature/feature.module';
import { ActionModule } from '../action/action.module';
import { RoleFeatureActionModule } from '../role-feature-action/role-feature-action.module';
import { RoleModule } from '../role/role.module';
import { CompanyModule } from '../company/company.module';
import { UserFeatureAction } from '../user-feature-action/entities/user-feature-action.entity';
import { Role } from '../role/entities/role.entity';
import { CheckDtTableMiddleware } from 'src/middlewares/dtTables.middleware';
import { UserFeatureActionModule } from '../user-feature-action/user-feature-action.module';
import { Branch } from '@modules/branch/entities/branch.entity';
import { BranchModule } from '@modules/branch/branch.module';
import { EmailService } from '@modules/email/email.service';
import { HttpModule } from '@nestjs/axios';
import { EmailModule } from '@modules/email/email.module';

@Module({
    imports: [
        forwardRef(() => RoleModule),
        UserRoleModule,
        FeatureActionModule,
        FeatureModule,
        UserFeatureActionModule,
        ActionModule,
        forwardRef(() => CompanyModule),
        forwardRef(() => RoleFeatureActionModule),
        forwardRef(() => RoleFeatureActionModule),
        NotificationModule,
        AddressModule,
        ReferenceModule,
        TypeOrmModule.forFeature([User, UserFeatureAction, Role, Branch]),
        forwardRef(() => MediaModule),
        HttpModule,
        forwardRef(() => EmailModule),
        forwardRef(() => AuthModule),
        forwardRef(() => BranchModule),

    ],
    providers: [UserService, EmailService],
    controllers: [UserController],
    exports: [UserService]
})
export class UserModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CheckDtTableMiddleware).forRoutes({
            path: 'users-test-list',
            method: RequestMethod.POST
        }); // Apply middleware to this route
    }
}
