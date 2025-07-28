import { Inject, Injectable, Logger, NotFoundException, forwardRef } from '@nestjs/common';
import { UpdateUserFeatureActionDto } from './dto/update-user-feature-action.dto';
import { UserService } from '../user/user.service';
import { UserRoleService } from '../user-role/user-role.service';
import { RoleService } from '../role/role.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleFeatureAction } from '../role-feature-action/entities/role-feature-action.entity';
import { UserFeatureAction } from './entities/user-feature-action.entity';
import { ActionService } from '../action/action.service';
import { FeatureService } from '../feature/feature.service';
import { FeatureActionService } from '../feature-action/feature-action.service';
import { CreateUserFeatureActionDto } from './dto/request/create-user-feature-action-dto';
import { User } from '../user/user.entity';
import { FeatureAction } from '../feature-action/entities/feature-action.entity';
// import { Logger } from 'winston';
@Injectable()
export class UserFeatureActionService {
    constructor(
        @InjectRepository(UserFeatureAction)
        private userFeatureActionRepo: Repository<UserFeatureAction>,
        @InjectRepository(RoleFeatureAction)
        private roleFeatureActionRepo: Repository<RoleFeatureAction>,
        private actionService: ActionService,
        @Inject(forwardRef(() => FeatureService))
        private featureService: FeatureService,
        private featureActionService: FeatureActionService,
        @Inject(forwardRef(() => RoleService))
        private roleService: RoleService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private userRoleService: UserRoleService
    ) {}

    async create(createUserFeatureActionDto: CreateUserFeatureActionDto) {
        let currentIds: number[] = [];

        const dbUser = await this.userService.findOneById(createUserFeatureActionDto?.userId);
        if (!dbUser) throw new NotFoundException(['User not found']);

        const dbUserRole = await this.userRoleService.findByUserId(dbUser.id);
        if (!dbUserRole) throw new NotFoundException(['User does not have role']);

        for (const feature of createUserFeatureActionDto.features) {
            const dbFeature = await this.featureService.findOneByName(feature.name);

            for (const action of feature['actions']) {
                const dbAction = await this.actionService.findOneByName(action['name']);
                const dbFeatureAction = await this.featureActionService.findOneByFeatureAction(
                    dbFeature.id,
                    dbAction.id
                );

                let newUserFeatureAction: UserFeatureAction;

                // const dbRoleFeatureAction = await this.roleFeatureActionRepo.findOneBy({ roleId: dbUserRole.roleId, featureActionId: dbFeatureAction.id });
                const dbRoleFeatureAction = await this.roleFeatureActionRepo
                    .createQueryBuilder('role_feature_action')
                    .where(
                        'role_feature_action.roleId = :roleId AND role_feature_action.featureActionId = :featureActionId',
                        { roleId: dbUserRole.roleId, featureActionId: dbFeatureAction.id }
                    )
                    .getOne();

                const dbUserFeatureAction = await this.findByUserAndFeatureAction(dbUser, dbFeatureAction);

                // if (!dbRoleFeatureAction && !dbUserFeatureAction) {
                if (action['allowedInSpecial'] !== null && !dbUserFeatureAction) {
                    newUserFeatureAction = new UserFeatureAction();
                    newUserFeatureAction.allowed = action['allowedInSpecial'];
                    newUserFeatureAction.user = dbUser;
                    newUserFeatureAction.featureAction = dbFeatureAction;

                    const dbNewUserFeatureAction = await this.userFeatureActionRepo.save(newUserFeatureAction);
                    currentIds.push(dbNewUserFeatureAction.id);
                }
                // if (!dbRoleFeatureAction && dbUserFeatureAction) {
                if (action['allowedInSpecial'] !== null && dbUserFeatureAction) {
                    dbUserFeatureAction.allowed = action['allowedInSpecial'];
                    await this.userFeatureActionRepo.save(dbUserFeatureAction);

                    currentIds.push(dbUserFeatureAction.id);
                }
            }
        }

        await this.deleteRecordsForUserExceptIds(dbUser, currentIds);
    }

    async deleteRecordsForUserExceptIds(user: User, currentIds: number[]) {
        const numberOfUserRecordsToDelete = await this.userFeatureActionRepo
            .createQueryBuilder('user_feature_action')
            .where('user_feature_action.user = :user', { user: user.id })
            .getCount();

        if (numberOfUserRecordsToDelete > 0) {
            await this.userFeatureActionRepo
                .createQueryBuilder('user_feature_action')
                .delete()
                .from(UserFeatureAction)
                .where(
                    currentIds.length > 0
                        ? 'user_feature_action.user = :user AND user_feature_action.id NOT IN (:...currentIds)'
                        : 'user_feature_action.user = :user',
                    { user: user.id, currentIds }
                )
                .execute();
        }
    }

    async findByUserAndFeatureAction(user: User, featureAction: FeatureAction): Promise<UserFeatureAction> {
        return await this.userFeatureActionRepo
            .createQueryBuilder('user_feature_action')
            .where('user_feature_action.user = :user AND user_feature_action.featureAction = :featureAction ', {
                user: user.id,
                featureAction: featureAction.id
            })
            .getOne();
    }

    findAll() {
        return `This action returns all userFeatureAction`;
    }

    async findUserDirectPermissions(userId: number) {
        // return await this.userFeatureActionRepo.createQueryBuilder('user_feature_action')
        // .innerJoinAndSelect('user_feature_action.featureAction', 'feature_action')
        // .where(`user_feature_action.user = :user`, { user: userId })
        // .getMany();

        return await this.userFeatureActionRepo
            .createQueryBuilder('user_feature_action')
            .leftJoinAndSelect('user_feature_action.featureAction', 'featureAction')
            .leftJoinAndSelect('featureAction.featureId', 'feature')
            .leftJoinAndSelect('featureAction.permissionId', 'permission')
            .where(`user_feature_action.user = :user`, { user: userId })
            .getMany();
    }

    async findOne(id: number) {
        let dbUser: any = null;
        let userRoleId: any = null;
        let userRole: any = null;
        let allRoleFeatures: any = null;
        let allUserFeatures: any = null;

        if (id) {
            dbUser = await this.userService.findOneById(id);
            if (!dbUser) throw new Error('User not found');

            userRoleId = await this.userRoleService.findByUserId(dbUser.id);
            if (!userRoleId) return {};

            userRole = await this.roleService.findOne(userRoleId.roleId);
            if (!userRole) return {};

            // allRoleFeatures = await this.roleFeatureActionRepo.find({
            //   where: { roleId: userRole.id },
            // });

            allRoleFeatures = await this.roleFeatureActionRepo
                .createQueryBuilder('roleFeatureAction')
                .leftJoinAndSelect('roleFeatureAction.featureActionId', 'featureAction')
                .leftJoinAndSelect('roleFeatureAction.roleId', 'role')
                .leftJoinAndSelect('featureAction.featureId', 'feature')
                .leftJoinAndSelect('featureAction.permissionId', 'permission')
                .where('roleFeatureAction.roleId = :roleId', { roleId: userRole.id })
                .getMany();

            allUserFeatures = await this.findUserDirectPermissions(dbUser.id);
        }

        let res: any = null;
        let rolePermissions: any = {};
        let specialPermissions: any = {};

        const allFeatures = await this.featureActionService.findAll();

        // const formattedRolePermissions = await this.getFormattedRoleFeatures(allRoleFeatures, rolePermissions, allFeatures, true);
        await this.getFormattedRoleFeatures(allRoleFeatures, rolePermissions, allFeatures, true);
        // const formattedSpecialPermissions = await this.getFormattedUserFeatures(allUserFeatures, specialPermissions, allFeatures);
        await this.getFormattedUserFeatures(allUserFeatures, specialPermissions, allFeatures);

        // Logger.log('rolePermissions--  ' + JSON.stringify(rolePermissions, null, 2))
        // Logger.log('specialPermissions--  ' + JSON.stringify(specialPermissions, null, 2))
        // return

        res = this.comparePermissionsForUser(specialPermissions, rolePermissions);
        // res = await this.featureActionService.findFeaturesAndPermissions(obj);

        return res;
    }

    async getFormattedRoleFeatures(features: any[], obj: any, allFeatures: any[], disabled = false) {
        let actions = {}; //[];
        let featureValue: any = null;

        for (const element of features) {
            // const featureAction = await this.featureActionService.findOneById(element?.featureActionId);
            const featureAction = element?.featureActionId;
            if (!featureAction) continue;

            // const action = await this.actionService.findOne(featureAction?.permissionId);
            const action = featureAction?.permissionId;
            if (!action) continue;

            // const feature = await this.featureService.findOne(featureAction?.featureId);
            const feature = featureAction?.featureId;
            if (!feature) continue;

            if (featureValue !== feature?.featureName && featureValue !== null) actions = {}; //[];

            // actions = [...(obj[feature?.featureName]?.permissions ?? [])]
            actions = { ...(obj[feature?.featureName]?.permissions ?? {}) };

            // actions.push({
            //   title: action?.actionName,
            //   allowed: true,
            //   disabled
            // });

            actions[action?.actionName] = {
                title: action?.actionName,
                allowed: true,
                disabled
            };

            obj[feature?.featureName] = {
                ...obj[feature?.featureName],
                ['permissions']: { ...actions }, //[...actions],
                ['fields']: null,
                ['conditions']: null
            };

            featureValue = feature?.featureName;
        }

        await this.featureActionService.findFeaturesAndPermissions(obj, allFeatures, disabled);
    }

    async getFormattedUserFeatures(features: any[], obj: any, allFeatures: any[], disabled = false) {
        let actions = {}; //[];
        let featureValue: any = null;

        for (const element of features) {
            // const action = await this.actionService.findOne(element?.featureAction?.permissionId);
            const action = element?.featureAction?.permissionId;
            if (!action) continue;

            // const feature = await this.featureService.findOne(element?.featureAction?.featureId);
            const feature = element?.featureAction?.featureId;
            if (!feature) continue;

            if (featureValue !== feature?.featureName && featureValue !== null) actions = {}; //[];

            // actions = [...(obj[feature?.featureName]?.permissions ?? [])]
            actions = { ...(obj[feature?.featureName]?.permissions ?? {}) };

            // if (obj[feature?.featureName]) {

            //   const notMatchedAction = Object.keys(obj[feature?.featureName]?.permissions).every((element: any) => {
            //     return obj[feature?.featureName]?.permissions[element].title !== action?.actionName;
            //   })

            //   if (notMatchedAction) {
            //     actions.push({
            //       title: action?.actionName,
            //       allowed: true,
            //       disabled
            //     });
            //   }

            // } else {
            //   actions.push({
            //     title: action?.actionName,
            //     allowed: true,
            //     disabled
            //   });
            // }

            actions[action?.actionName] = {
                title: action?.actionName,
                allowed: element?.allowed, //true,
                disabled
            };

            obj[feature?.featureName] = {
                ...obj[feature?.featureName],
                ['permissions']: { ...actions }, //[...actions],
                ['fields']: null,
                ['conditions']: null
            };

            featureValue = feature?.featureName;
        }
    }

    comparePermissionsForUser(userPermissions: any, rolePermissions: any) {
        let featuresRes: any[] = [];
        let permissionsRes: any[] = [];

        for (const feature in rolePermissions) {
            for (let action in rolePermissions[feature]?.permissions) {
                if (userPermissions[feature]?.permissions?.[action]) {
                    rolePermissions[feature]['permissions'][action] = {
                        ...userPermissions[feature]?.permissions?.[action],
                        allowedInRole: rolePermissions[feature].permissions?.[action]?.allowed,
                        allowedInSpecial: userPermissions[feature]?.permissions?.[action]?.allowed
                    };
                } else {
                    rolePermissions[feature]['permissions'][action] = {
                        ...rolePermissions[feature]?.permissions?.[action],
                        allowedInRole: rolePermissions[feature].permissions?.[action]?.allowed,
                        allowedInSpecial: null
                    };
                }
            }
        }

        for (let key in rolePermissions) {
            permissionsRes = [];
            for (let key2 in rolePermissions[key]?.permissions) {
                permissionsRes.push({
                    ...rolePermissions[key]?.permissions[key2]
                });
            }
            rolePermissions[key].permissions = [...permissionsRes];

            featuresRes.push({ ...rolePermissions[key] });
        }

        return featuresRes;
    }

    update(id: number, updateUserFeatureActionDto: UpdateUserFeatureActionDto) {
        return `This action updates a #${id} userFeatureAction`;
    }

    remove(id: number) {
        return `This action removes a #${id} userFeatureAction`;
    }
}
