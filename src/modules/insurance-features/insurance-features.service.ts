import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InsuranceFeatures } from './entities/insurance-features.entity';
import { User } from '@modules/user/user.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';

@Injectable()
export class InsuranceFeaturesService {
    constructor(
        @InjectRepository(InsuranceTypeMaster)
        private readonly insuranceTypeRepo: Repository<InsuranceTypeMaster>,
        @InjectRepository(InsuranceFeatures)
        private readonly insuranceFeaturesRepo: Repository<InsuranceFeatures>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly loggedInsUserService: LoggedInsUserService
    ) {}

    async createInsuranceFeatures(reqBody: any): Promise<any> {
        try {
            const { featuresName, insuranceType, coverage, isStandard, description } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 400);
            }

            const insuranceTypeEntity = await this.insuranceTypeRepo.findOne({
                where: { code: insuranceType }
            });
            console.log('insurance type', insuranceTypeEntity);

            if (!insuranceTypeEntity) {
                return standardResponse(false, 'Invalid insurance type', 400);
            }

            const existingFeature = await this.insuranceFeaturesRepo.findOne({
                where: {
                    featuresName: featuresName,
                    insuranceTypes: { id: insuranceTypeEntity.id }
                }
            });

            console.log('exsiing features', existingFeature);

            if (existingFeature) {
                return standardResponse(false, 'Feature already exists', 409);
            }

            const newFeature = this.insuranceFeaturesRepo.create({
                featuresName,
                insuranceTypes: insuranceTypeEntity,
                coverage,
                isStandard,
                description,
                isActive: true,
                createdAt: new Date(),
                createdBy: userEntity
            });
            await this.insuranceFeaturesRepo.save(newFeature);

            return standardResponse(
                true,
                'Insurance feature created successfully',
                201,
                newFeature,
                null,
                'insurance-product/createInsuranceFeatures'
            );
        } catch (error) {
            console.log('api- insurance-product/createInsuranceFeatures:', error);

            return standardResponse(false, 'Error creating insurance features', 500);
        }
    }

async updateInsuranceFeatures(reqBody: any): Promise<any> {
    try {
        const { featuresId, featuresName, insuranceType, coverage, isStandard, description, isActive } = reqBody;

        const userEntity = await this.loggedInsUserService.getCurrentUser();
        if (!userEntity) {
            return standardResponse(false, 'Logged user not found', 400);
        }

        const feature = await this.insuranceFeaturesRepo.findOne({
            where: { id:featuresId },
            relations: ['insuranceTypes']
        });

        if (!feature) {
            return standardResponse(false, 'Feature not found', 404);
        }

        const insuranceTypeEntity = await this.insuranceTypeRepo.findOne({
            where: { code: insuranceType }
        });

        if (!insuranceTypeEntity) {
            return standardResponse(false, 'Invalid insurance type', 400);
        }

        const duplicateCheck = await this.insuranceFeaturesRepo.findOne({
            where: {
                featuresName: featuresName,
                insuranceTypes: { id: insuranceTypeEntity.id }
            }
        });

        if (duplicateCheck && duplicateCheck.id !== featuresId) {
            return standardResponse(false, 'Feature already exists with same name', 409);
        }

        feature.featuresName = featuresName;
        feature.insuranceTypes = insuranceTypeEntity;
        feature.coverage = coverage;
        feature.isStandard = isStandard;
        feature.description = description;
        feature.isActive = isActive;
        feature.updatedAt = new Date();
        feature.updatedBy = userEntity;

        await this.insuranceFeaturesRepo.save(feature);

        return standardResponse(
            true,
            'Insurance feature updated successfully',
            200,
            feature,
            null,
            'insurance-product/updateInsuranceFeatures'
        );

    } catch (error) {
        console.log('api- insurance-product/updateInsuranceFeatures:', error);
        return standardResponse(false, 'Error updating insurance features', 500);
    }
}

async getAllInsuranceFeatures(reqBody: any): Promise<any> {
    try {
        const { page = 1, limit = 10 } = reqBody;

        const skip = (page - 1) * limit;

        // Build query
        const qb = this.insuranceFeaturesRepo.createQueryBuilder('f')
            .leftJoinAndSelect('f.insuranceTypes', 'it')
            .where('f.isActive = :active', { active: true });

        qb.skip(skip).take(limit).orderBy('f.createdAt', 'DESC');

        const [data, total] = await qb.getManyAndCount();
  console.log("in get features api", data, total);
        return standardResponse(
            true,
            'Insurance features fetched successfully',
            200,
            { total, page: Number(page), limit: Number(limit), data },
            null,
            'insurance-product/getAllInsuranceFeatures'
        );

    } catch (error) {
        console.log('api- insurance-product/getAllInsuranceFeatures:', error);
        return standardResponse(false, 'Error fetching insurance features', 500);
    }
}


async deleteInsuranceFeatures(id: number): Promise<any> {
    try {
        // 1. Logged-in user
        const userEntity = await this.loggedInsUserService.getCurrentUser();
        if (!userEntity) {
            return standardResponse(false, 'Logged user not found', 400);
        }

        // 2. Check if feature exists
        const feature = await this.insuranceFeaturesRepo.findOne({
            where: { id }
        });

        if (!feature) {
            return standardResponse(false, 'Feature not found', 404);
        }

        if (!feature.isActive) {
            return standardResponse(false, 'Feature already deleted', 400);
        }

        // 3. Soft delete the record
        feature.isActive = false;
        feature.deletedAt = new Date();
        feature.updatedBy = userEntity;

        await this.insuranceFeaturesRepo.save(feature);

        return standardResponse(
            true,
            'Insurance feature deleted successfully',
            200,
            feature,
            null,
            'insurance-product/softDeleteInsuranceFeature'
        );

    } catch (error) {
        console.log('api- insurance-product/softDeleteInsuranceFeature:', error);
        return standardResponse(false, 'Error deleting insurance feature', 500);
    }
}
}
