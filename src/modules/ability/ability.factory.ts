import { createMongoAbility, MongoAbility, AbilityBuilder, InferSubjects, ExtractSubjectType } from '@casl/ability';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { User } from '../user/user.entity';
import { Organization } from '../organization/entities/organization.entity';
import { Media } from '../media/entities/media.entity';
import { UserService } from '../user/user.service';
import { RoleFeatureActionService } from '../role-feature-action/role-feature-action.service';
import { UserRoleService } from '../user-role/user-role.service';
import { ActionService } from '../action/action.service';
import { FeatureService } from '../feature/feature.service';
import { Role } from '../role/entities/role.entity';
import { FeatureActionService } from '../feature-action/feature-action.service';
import { RoleService } from '../role/role.service';
import { Company } from '../company/entities/company.entity';
import { UserFeatureActionService } from '../user-feature-action/user-feature-action.service';

export enum Action {
    manage = 'manage',
    create = 'create',
    read = 'read',
    update = 'update',
    delete = 'delete',
    start = 'start',
    stop = 'stop',
    pause = 'pause',
    record = 'record',
    print = 'print'
}

export type Subjects = InferSubjects<
    typeof User | typeof Organization | typeof Media | typeof Role | typeof Company | 'Billing' | 'all'
>;

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class AbilityFactory {
    constructor(
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private userRoleService: UserRoleService,
        @Inject(forwardRef(() => RoleService))
        private roleService: RoleService,
        @Inject(forwardRef(() => RoleFeatureActionService))
        private roleFeatureActionService: RoleFeatureActionService,
        @Inject(forwardRef(() => FeatureActionService))
        private featureActionService: FeatureActionService,
        @Inject(forwardRef(() => ActionService))
        private actionService: ActionService,
        @Inject(forwardRef(() => FeatureService))
        private featureService: FeatureService,
        @Inject(forwardRef(() => UserFeatureActionService))
        private userFeatureActionService: UserFeatureActionService
    ) {}

    async defineAbility(user: any) {
        const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

        for (const element of user.allPermissions) {
            const featureName = element.title;
            for (const action of element.permissions) {
                if (action.allowed !== true) continue;
                await this.returnModuleName(action.title, featureName, can);
            }
        }

        return build({
            detectSubjectType: (item) => item.constructor as ExtractSubjectType<Subjects>
        });
    }

    async returnModuleName(action: string, subject: string, can: any) {
        if (subject === 'User') {
            return can(Action[action], User);
        } else if (subject === 'Organization') {
            return can(Action[action], Organization);
        } else if (subject === 'Media') {
            return can(Action[action], Media);
        } else if (subject === 'Role') {
            return can(Action[action], Role);
        } else {
            return 'all';
        }
    }
}
