import { ConflictException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { Feature } from './entities/feature.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserFeatureActionService } from '../user-feature-action/user-feature-action.service';
import { orderByKey, orderByValue } from 'src/utils/app.utils';
@Injectable()
export class FeatureService {
    constructor(
        @InjectRepository(Feature)
        private featureRepo: Repository<Feature>,
        @Inject(forwardRef(() => UserFeatureActionService))
        private userFeatureActionService: UserFeatureActionService
    ) {}
    async create(req: any) {
        const feature = new Feature();
        feature.featureName = req.body.featureName;
        feature.description = req.body.description;
        feature.createdBy = req.body.createdBy;

        try {
            return await this.featureRepo.save(feature);
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException(['Feature Name already exists']);
            }
            throw error;
        }
    }

    async findAll(body: any, req: any) {
        const items = await this.featureRepo
            .createQueryBuilder('feature')
            .where(req?.QUERY_STRING?.where)
            .skip(req?.QUERY_STRING?.skip)
            .take(req?.QUERY_STRING?.limit)
            .orderBy(
                orderByKey({
                    key: req?.QUERY_STRING?.orderBy?.key,
                    repoAlias: 'feature'
                }),
                orderByValue({ req })
            )
            .getMany();

        const qb = this.featureRepo.createQueryBuilder('feature').where(req?.QUERY_STRING?.where).select([]);

        return {
            items,
            qb
        };
    }

    async findOne(id: number) {
        return await this.featureRepo.findOneBy({ id });
    }

    async findOneByName(featureName: string) {
        return await this.featureRepo.findOneBy({ featureName });
    }

    async findOneById(id: number) {
        return await this.featureRepo.findOneBy({ id });
    }

    async update(req: any) {
        const feature = await this.findOneById(req.body.id);
        if (!feature) throw new NotFoundException(['Feature not found']);

        feature.featureName = req.body.featureName;
        feature.description = req.body.description;
        feature.createdBy = req.body.createdBy;

        try {
            await this.featureRepo.save(feature);
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException(['Feature Name already exists']);
            }
            throw error;
        }
    }

    async delete(req: any) {
        const featureId = req.body.id;

        try {
            // Using custom query to delete records based on refid and refTypeid
            await this.featureRepo
                .createQueryBuilder()
                .delete()
                .from(Feature)
                .where('id = :featureId', { featureId })
                .execute();
        } catch (error) {
            // Handle error
            console.error('Error removing feature:', error);
            throw error;
        }
    }
}
