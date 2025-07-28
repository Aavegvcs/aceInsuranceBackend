import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { CreateFeatureActionDto } from './dto/request/create-feature-action.dto';
import { UpdateFeatureActionDto } from './dto/update-feature-action.dto';
import { FeatureAction } from './entities/feature-action.entity';
import { In, Not, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ActionService } from '../action/action.service';
import { FeatureService } from '../feature/feature.service';
@Injectable()
export class FeatureActionService {
    constructor(
        @InjectRepository(FeatureAction)
        private featureActionRepo: Repository<FeatureAction>,
        private actionService: ActionService,
        @Inject(forwardRef(() => FeatureService))
        private featureService: FeatureService
    ) {}

    async create(createFeatureActionDto: CreateFeatureActionDto) {
        let currentIds: number[] = [];

        const dbFeature = await this.featureService.findOneByName(createFeatureActionDto?.featureName);

        for (const action of createFeatureActionDto?.actions) {
            const dbAction = await this.actionService.findOneByName(action);

            let newFeatureAction: FeatureAction = null;
            const dbFeatureAction = await this.findOneByFeatureAction(dbFeature.id, dbAction.id);
            if (!dbFeatureAction) {
                newFeatureAction = new FeatureAction();
                newFeatureAction.featureId = dbFeature;
                newFeatureAction.permissionId = dbAction;

                const dbNewFeatureAction = await this.featureActionRepo.save(newFeatureAction);
                currentIds.push(dbNewFeatureAction.id);
            }
            if (dbFeatureAction) currentIds.push(dbFeatureAction.id);
        }

        await this.deleteRecordsForFeatureExceptIds(dbFeature.id, currentIds);
    }

    async deleteRecordsForFeatureExceptIds(featureId: number, currentIds: number[]) {
        // Find and Delete all record for this Role with featureActionIds other than currentFeatureActionIds
        // const recordsToDelete = await this.featureActionRepo.find({
        //   where: {
        //     featureId: featureId,
        //     id: Not(In(currentIds)),
        //   },
        // });

        const recordsToDelete = await this.featureActionRepo
            .createQueryBuilder('featureAction')
            .where('featureAction.featureId = :featureId', { featureId })
            .andWhere('featureAction.id NOT IN (:...currentIds)', { currentIds })
            .getMany();

        // Delete the records
        await this.featureActionRepo.remove(recordsToDelete);
    }

    async findAll(): Promise<FeatureAction[]> {
        // return await this.featureActionRepo.find();
        return await this.featureActionRepo
            .createQueryBuilder('featureAction')
            .leftJoinAndSelect('featureAction.featureId', 'featureId')
            .leftJoinAndSelect('featureAction.permissionId', 'permissionId')
            .getMany();
    }

    findOne(id: number) {
        return `This action returns a #${id} featureAction`;
    }

    async findOneById(id: number): Promise<FeatureAction> {
        return await this.featureActionRepo.findOneBy({ id });
    }

    async findOneByFeatureAction(featureId: number, actionId: number): Promise<FeatureAction> {
        // return await this.featureActionRepo.findOneBy({ featureId, permissionId: actionId });
        return await this.featureActionRepo
            .createQueryBuilder('featureAction')
            .where(
                `featureAction.featureId = :featureId
            AND featureAction.permissionId = :actionId`,
                { featureId, actionId }
            )
            .getOne();
    }

    update(id: number, updateFeatureActionDto: UpdateFeatureActionDto) {
        return `This action updates a #${id} featureAction`;
    }

    remove(id: number) {
        return `This action removes a #${id} featureAction`;
    }

    async findFeaturesVsPermissons() {
        const allFeatures = await this.findAll();

        let obj: any = {};
        let actions = [];
        let featureValue: any = null;

        for (let element of allFeatures) {
            // const action = await this.actionService.findOne(element.permissionId)
            const action = element.permissionId;
            if (!action) continue;

            // const feature = await this.featureService.findOne(element.featureId);
            const feature = element.featureId;
            if (!feature) continue;

            if (featureValue !== feature?.featureName && featureValue !== null) actions = [];

            actions = [...(obj[feature?.featureName]?.actions ?? [])];
            actions.push(action?.actionName);

            obj[feature?.featureName] = {
                ['actions']: [...actions]
            };

            featureValue = feature?.featureName;
        }

        return obj;
    }

    async findFeaturesAndPermissions(userPermissions: any, allFeatures: any[], disabled = false) {
        // const allFeatures = await this.findAll();

        let res: any[] = [];
        let actions = {}; //[];
        let featureValue: any = null;

        for (let element of allFeatures) {
            // const action = await this.actionService.findOne(element.permissionId);
            const action = element.permissionId;
            if (!action) continue;

            // const feature = await this.featureService.findOne(element.featureId);
            const feature = element.featureId;
            if (!feature) continue;

            if (featureValue !== feature?.featureName && featureValue !== null) {
                actions = [];
            }

            // actions = [...(userPermissions[feature?.featureName]?.permissions ?? [])]
            actions = { ...(userPermissions[feature?.featureName]?.permissions ?? {}) };

            if (userPermissions[feature?.featureName]) {
                const notMatchedAction = Object.keys(userPermissions[feature?.featureName]?.permissions).every(
                    (element: any) => {
                        return userPermissions[feature?.featureName]?.permissions[element].title !== action?.actionName;
                    }
                );

                if (notMatchedAction) {
                    // actions.push({
                    //   title: action?.actionName,
                    //   allowed: false,
                    //   disabled: false
                    // });

                    actions[action?.actionName] = {
                        title: action?.actionName,
                        allowed: false,
                        disabled //: false
                    };
                }
            } else {
                // actions.push({
                //   title: action?.actionName,
                //   allowed: false,
                //   disabled: false
                // });

                actions[action?.actionName] = {
                    title: action?.actionName,
                    allowed: false,
                    disabled //: false
                };
            }

            userPermissions[feature?.featureName] = {
                ...userPermissions[feature?.featureName],
                ['title']: feature?.featureName,
                ['allowed']: Object.keys(actions).every((element: any) => actions[element]?.allowed === true),
                ['permissions']: { ...actions } //[...actions],
            };

            featureValue = feature?.featureName;
        }

        // for (let key in userPermissions) {
        //   res.push({...userPermissions[key]});
        // }

        // return res;
    }
}
