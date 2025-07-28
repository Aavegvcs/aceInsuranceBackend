import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { CreateRoleFeatureActionDto } from './dto/create-role-feature-action.dto';
import { UpdateRoleFeatureActionDto } from './dto/update-role-feature-action.dto';
import { RoleFeatureAction } from './entities/role-feature-action.entity';
import { In, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FeatureService } from '../feature/feature.service';
import { ActionService } from '../action/action.service';
import { FeatureActionService } from '../feature-action/feature-action.service';
import { RoleService } from '../role/role.service';
import { UserService } from '../user/user.service';
import { UserRoleService } from '../user-role/user-role.service';
@Injectable()
export class RoleFeatureActionService {
    constructor(
        @InjectRepository(RoleFeatureAction)
        private roleFeatureActionRepo: Repository<RoleFeatureAction>,
        private actionService: ActionService,
        private featureService: FeatureService,
        private featureActionService: FeatureActionService,
        @Inject(forwardRef(() => RoleService))
        private roleService: RoleService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private userRoleService: UserRoleService
    ) {}

    async create(createRoleFeatureActionDto: CreateRoleFeatureActionDto) {
        let currentIds: number[] = [];

        const dbRole = await this.roleService.findOneByName(createRoleFeatureActionDto?.roleName);

        for (const feature of createRoleFeatureActionDto.features) {
            const dbFeature = await this.featureService.findOneByName(feature.name);

            for (const action of feature['actions']) {
                const dbAction = await this.actionService.findOneByName(action['name']);
                const dbFeatureAction = await this.featureActionService.findOneByFeatureAction(
                    dbFeature.id,
                    dbAction.id
                );

                let newRoleFeatureAction: any;

                const dbRoleFeatureAction = await this.findByRoleAndFeatureAction(dbRole.id, dbFeatureAction.id);
                if (!dbRoleFeatureAction) {
                    newRoleFeatureAction = new RoleFeatureAction();
                    newRoleFeatureAction.roleId = dbRole.id;
                    newRoleFeatureAction.featureActionId = dbFeatureAction.id;

                    const dbNewRoleFeatureAction = await this.roleFeatureActionRepo.save(newRoleFeatureAction);
                    currentIds.push(dbNewRoleFeatureAction.id);
                }
                if (dbRoleFeatureAction) currentIds.push(dbRoleFeatureAction.id);
            }
        }

        // Find and Delete all record for this Role with featureActionIds other than currentFeatureActionIds
        await this.deleteRecordsForRoleExceptIds(dbRole.id, currentIds);
    }

    async deleteRecordsForRoleExceptIds(roleId: number, currentIds: number[]) {
        // const recordsToDelete = await this.roleFeatureActionRepo.find({
        //   where: {
        //     roleId: dbRole,
        //     id: Not(In(currentIds)),
        //   },
        // });
        const recordsToDelete = await this.roleFeatureActionRepo
            .createQueryBuilder('roleFeatureAction')
            .where('roleFeatureAction.roleId = :roleId', { roleId })
            .andWhere('roleFeatureAction.id NOT IN (:...currentIds)', { currentIds })
            .getMany();
        // Delete the records
        await this.roleFeatureActionRepo.remove(recordsToDelete);
    }

    async deleteRecordsForRole(roleId: number) {
        // const recordsToDelete = await this.roleFeatureActionRepo.find({
        //   where: {
        //     roleId: roleId
        //   },
        // });

        const recordsToDelete = await this.roleFeatureActionRepo
            .createQueryBuilder('roleFeatureAction')
            .where('roleFeatureAction.roleId = :roleId', { roleId })
            .getMany();

        if (!recordsToDelete || !recordsToDelete.length) return null;

        // Delete the records
        await this.roleFeatureActionRepo.remove(recordsToDelete);
    }

    async findRoleVsFeatures({ email, roleId }: { email?: string; roleId?: number }) {
        let allFeatures: any = null;
        let userRole: any = null;

        if (email && !roleId) {
            userRole = await this.getUserRoleByEmail(email);
            if (!userRole) return {};
            allFeatures = await this.getFeaturesByRoleId(userRole.id);
        } else if (roleId && !email) {
            allFeatures = await this.getFeaturesByRoleId(roleId);
        }

        const features = await this.constructFeatureObject(allFeatures);

        if (email && !roleId) {
            return {
                features,
                role: {
                    name: userRole?.roleName,
                    id: userRole?.id
                }
            };
        }

        if (roleId && !email) return features;
    }

    private async getUserRoleByEmail(email: string) {
        const dbUser = await this.userService.findOneByEmail(email);
        if (!dbUser) throw new Error('User not found');

        const userRoleId = await this.userRoleService.findByUserId(dbUser.id);
        if (!userRoleId) return null;

        return await this.roleService.findOne(userRoleId.roleId);
    }

    private async getFeaturesByRoleId(roleId: number) {
        // return await this.roleFeatureActionRepo.find({
        //     where: { roleId },
        // });

        const result = await this.roleFeatureActionRepo
            .createQueryBuilder('roleFeatureAction')
            .leftJoinAndSelect('roleFeatureAction.featureActionId', 'featureAction')
            .leftJoinAndSelect('featureAction.featureId', 'feature')
            .leftJoinAndSelect('featureAction.permissionId', 'permission')
            .leftJoinAndSelect('roleFeatureAction.roleId', 'role')
            .where('roleFeatureAction.roleId = :roleId', { roleId })
            .getMany();

        return result;
    }

    private async constructFeatureObject(allFeatures: any) {
        let obj: any = {};
        let featureValue: any = null;
        let actions = [];

        for (const element of allFeatures) {
            // const featureAction = await this.featureActionService.findOneById(element?.featureActionId);
            const featureAction = element?.featureActionId;
            if (!featureAction) continue;

            // const action = await this.actionService.findOne(featureAction?.permissionId);
            const action = featureAction?.permissionId;
            if (!action) continue;

            // const feature = await this.featureService.findOne(featureAction?.featureId);
            const feature = featureAction?.featureId;
            if (!feature) continue;

            if (featureValue !== feature?.featureName && featureValue !== null) actions = [];

            actions = [...(obj[feature?.featureName]?.actions ?? [])];
            actions.push(action?.actionName);

            obj[feature?.featureName] = {
                actions: [...actions],
                fields: null,
                conditions: null
            };

            featureValue = feature?.featureName;
        }
        return obj;
    }

    async findByRoleId(roleId: number): Promise<RoleFeatureAction[]> {
        // return await this.roleFeatureActionRepo.findBy({ roleId });
        return await this.roleFeatureActionRepo
            .createQueryBuilder('roleFeatureAction')
            .leftJoinAndSelect('roleFeatureAction.featureActionId', 'featureAction')
            .leftJoinAndSelect('roleFeatureAction.roleId', 'role')
            .leftJoinAndSelect('featureAction.featureId', 'feature')
            .leftJoinAndSelect('featureAction.permissionId', 'permission')
            .where('roleFeatureAction.roleId = :roleId', { roleId })
            .getMany();
    }

    async findByRoleAndFeatureAction(roleId: number, featureActionId: number): Promise<RoleFeatureAction> {
        // return await this.roleFeatureActionRepo.findOneBy({ roleId, featureActionId });
        return await this.roleFeatureActionRepo
            .createQueryBuilder('roleFeatureAction')
            .where(
                `roleFeatureAction.roleId = :roleId
            AND roleFeatureAction.featureActionId = :featureActionId`,
                { roleId, featureActionId }
            )
            .getOne();
    }

    findOne(id: number) {
        return `This action returns a #${id} roleFeatureAction`;
    }

    findAll() {
        return `This action returns all roleFeatureAction`;
    }

    update(id: number, updateRoleFeatureActionDto: UpdateRoleFeatureActionDto) {
        return `This action updates a #${id} roleFeatureAction`;
    }

    remove(id: number) {
        return `This action removes a #${id} roleFeatureAction`;
    }
}
