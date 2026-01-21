import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InsuranceFeatures } from './entities/insurance-features.entity';
import { User } from '@modules/user/user.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { InsuranceWaitingPeriod } from './entities/insurance-waiting-period.entity';

@Injectable()
export class InsuranceFeaturesService {
    constructor(
        @InjectRepository(InsuranceTypeMaster)
        private readonly insuranceTypeRepo: Repository<InsuranceTypeMaster>,
        @InjectRepository(InsuranceFeatures)
        private readonly insuranceFeaturesRepo: Repository<InsuranceFeatures>,
        @InjectRepository(InsuranceWaitingPeriod)
        private readonly waitingPeriodRepo: Repository<InsuranceWaitingPeriod>,

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
                'insurance-features/createInsuranceFeatures'
            );
        } catch (error) {
            console.log('api- insurance-features/createInsuranceFeatures:', error);

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
                where: { id: featuresId },
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
            console.log('duplicate check', duplicateCheck.id, featuresId);

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
                'insurance-features/updateInsuranceFeatures'
            );
        } catch (error) {
            console.log('api- insurance-features/updateInsuranceFeatures:', error);
            return standardResponse(false, 'Error updating insurance features', 500);
        }
    }

    async getAllInsuranceFeatures(reqBody: any): Promise<any> {
        try {
            const { pageNo, pageSize } = reqBody;

            const skip = Number((pageNo - 1) * pageSize);
            // console.log(pageNo, pageSize, skip);

            // Build query
            const qb = this.insuranceFeaturesRepo.createQueryBuilder('f').leftJoinAndSelect('f.insuranceTypes', 'it');

            qb.skip(skip).take(pageSize).orderBy('f.createdAt', 'DESC');

            const [data, total] = await qb.getManyAndCount();
            //   console.log("in get features api", data, total);
            return standardResponse(
                true,
                'Insurance features fetched successfully',
                200,
                { total, pageNo: Number(pageNo), pageSize: Number(pageSize), data },
                null,
                'insurance-features/getAllInsuranceFeatures'
            );
        } catch (error) {
            console.log('api- insurance-features/getAllInsuranceFeatures:', error);
            return standardResponse(
                false,
                'Error fetching insurance features',
                500,
                null,
                'insurance-features/getAllInsuranceFeatures'
            );
        }
    }

    async deleteInsuranceFeatures(reqBody: any): Promise<any> {
        try {
            const { featuresId } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 400);
            }

            // 2. Check if feature exists
            const feature = await this.insuranceFeaturesRepo.findOne({
                where: { id: featuresId }
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
                'insurance-features/deleteInsuranceFeatures'
            );
        } catch (error) {
            console.log('api- insurance-features/deleteInsuranceFeatures:', error);
            return standardResponse(false, 'Error deleting insurance feature', 500);
        }
    }

    async featuresBulkUpload(reqBody: any): Promise<any> {
        const failed: { index: number; name: string; reason: string }[] = [];
        const data = reqBody.data || [];
        const startIndex = reqBody.startIndex || 0;
        const headerOffset = 1;

        const userEntity = await this.loggedInsUserService.getCurrentUser();
        if (!userEntity) {
            return standardResponse(
                false,
                'Logged user not found',
                404,
                null,
                null,
                'insurance-features/featuresBulkUpload'
            );
        }

        try {
            if (!Array.isArray(data) || data.length === 0) {
                return standardResponse(
                    true,
                    'No data provided for bulk upload',
                    200,
                    {
                        successCount: 0,
                        failedCount: 0,
                        failed: []
                    },
                    null,
                    'insurance-features/featuresBulkUpload'
                );
            }

            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                const rowIndex = startIndex + i + headerOffset;

                try {
                    const featuresName = item['Features Name'];
                    const insuranceTypeCode = item['Insurance Type'];
                    const coverage = item['coverage'];
                    const isBasicRaw = item['is basic'];
                    const description = item['description'];

                    // ---------------- VALIDATION ----------------
                    if (!featuresName || !insuranceTypeCode) {
                        failed.push({
                            index: rowIndex,
                            name: featuresName || 'N/A',
                            reason: 'Missing required fields'
                        });
                        continue;
                    }

                    const insuranceTypeEntity = await this.insuranceTypeRepo.findOne({
                        where: { code: insuranceTypeCode }
                    });

                    if (!insuranceTypeEntity) {
                        failed.push({
                            index: rowIndex,
                            name: featuresName,
                            reason: `Invalid insurance type: ${insuranceTypeCode}`
                        });
                        continue;
                    }

                    const existingFeature = await this.insuranceFeaturesRepo.findOne({
                        where: {
                            featuresName: featuresName,
                            insuranceTypes: { id: insuranceTypeEntity.id }
                        }
                    });

                    if (existingFeature) {
                        failed.push({
                            index: rowIndex,
                            name: featuresName,
                            reason: 'Feature already exists'
                        });
                        continue;
                    }

                    // ---------------- BOOLEAN MAPPING ----------------
                    let isStandard = false;
                    if (typeof isBasicRaw === 'string') {
                        if (isBasicRaw.toLowerCase() === 'yes') isStandard = true;
                        if (isBasicRaw.toLowerCase() === 'no') isStandard = false;
                    }

                    // ---------------- INSERT ----------------
                    const newFeature = this.insuranceFeaturesRepo.create({
                        featuresName,
                        insuranceTypes: insuranceTypeEntity,
                        coverage: coverage || null,
                        isStandard,
                        description: description || null,
                        isActive: true,
                        createdAt: new Date(),
                        createdBy: userEntity
                    });

                    await this.insuranceFeaturesRepo.save(newFeature);
                } catch (error) {
                    failed.push({
                        index: rowIndex,
                        name: item?.['Features Name'] || 'Unknown',
                        reason: error.message || 'Database error'
                    });
                }
            }

            const successCount = data.length - failed.length;
            const failedCount = failed.length;

            let message = 'Features inserted successfully.';
            if (successCount > 0 && failedCount > 0) message = 'Features partially inserted.';
            if (successCount === 0) message = 'Failed to insert features.';

            return standardResponse(
                true,
                message,
                200,
                {
                    successCount,
                    failedCount,
                    failed
                },
                null,
                'insurance-features/featuresBulkUpload'
            );
        } catch (error) {
            return standardResponse(
                false,
                'Failed to insert features',
                500,
                {
                    successCount: 0,
                    failedCount: data.length,
                    failed: data.map((item, index) => ({
                        index: startIndex + index + headerOffset,
                        name: item?.['Features Name'] || 'Unknown',
                        reason: error.message
                    }))
                },
                null,
                'insurance-features/featuresBulkUpload'
            );
        }
    }

    async getInsuranceFeatures(insuranceType: any) {
        try {
            const typeData = await this.insuranceTypeRepo.findOne({ where: { code: insuranceType } });
            // console.log('insurae type data', typeData.id);

            const features = await this.insuranceFeaturesRepo
                .createQueryBuilder('features')
                .select([
                    'features.id AS featureId',
                    'features.featuresName AS featureName',
                    'features.description AS featureDescription',
                    'features.isStandard AS isStandard',
                    'features.coverage AS coverage'
                ])
                .where('features.insuranceTypes = :id', { id: typeData.id })
                .andWhere('features.isActive = true')
                .getRawMany();

            return standardResponse(
                true,
                'Features get successfully',
                200,
                features,
                null,
                'insurance-features/getInsuranceFeatures'
            );
        } catch (error) {
            console.log('error: api -insurance-features/getInsuranceFeatures');
            return standardResponse(
                false,
                'Error fetching insurance features',
                500,
                null,
                'insurance-features/getInsuranceFeatures'
            );
        }
    }

    async getInsuranceWaitingPeriods(insuranceType: any) {
        try {
            // console.log("in waiting insurance type", insuranceType);

            const typeData = await this.insuranceTypeRepo.findOne({ where: { code: insuranceType } });
            if (!typeData) {
                return standardResponse(
                    false,
                    'InsuranceType is undefined',
                    404,
                    null,
                    null,
                    'insurance-features/getInsuranceWaitingPeriods'
                );
            }
            // console.log("in waiting typedata ", typeData);

            const periods = await this.waitingPeriodRepo
                .createQueryBuilder('insuranceWaiting')
                .select([
                    'insuranceWaiting.id AS insuranceWaitingPeriodId',
                    'insuranceWaiting.name AS insuranceWaitingPeriodName',
                    'insuranceWaiting.waitingTime AS insuranceWaitingTime',
                    'insuranceWaiting.timeType AS insuranceWaitingTimeType'
                ])
                .where('insuranceWaiting.insuranceTypes = :id', { id: typeData.id })
                .andWhere('insuranceWaiting.isActive = true')
                .getRawMany();

            //   console.log('waiting peried is here', periods);

            return standardResponse(
                true,
                'data get successfully',
                200,
                periods,
                null,
                'insurance-features/getInsuranceWaitingPeriods'
            );
        } catch (error) {
            console.log('error: api -insurance-features/getInsuranceWaitingPeriods');
            return standardResponse(
                false,
                'Error fetching insurance waiting period',
                500,
                null,
                null,
                'insurance-features/getInsuranceWaitingPeriods'
            );
        }
    }

    // waiting periods--------

    async createWaitingPeriod(reqBody: any): Promise<any> {
        try {
            const { name, insuranceType, waitingTime, timeType } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 400);
            }

            const insuranceTypeEntity = await this.insuranceTypeRepo.findOne({
                where: { code: insuranceType }
            });
            if (!insuranceTypeEntity) {
                return standardResponse(false, 'Invalid insurance type', 400);
            }

            const existingWaitingPeriod = await this.waitingPeriodRepo.findOne({
                where: {
                    name: name,
                    insuranceTypes: { id: insuranceTypeEntity.id }
                }
            });

            console.log('exsiing waiting period', existingWaitingPeriod);

            if (existingWaitingPeriod) {
                return standardResponse(
                    false,
                    'Waiting period already exists',
                    409,
                    null,
                    null,
                    'insurance-features/createWaitingPeriod'
                );
            }

            const newWaitingPeriod = this.waitingPeriodRepo.create({
                name,
                insuranceTypes: insuranceTypeEntity,
                waitingTime,
                timeType,
                isActive: true,
                createdAt: new Date(),
                createdBy: userEntity
            });
            await this.waitingPeriodRepo.save(newWaitingPeriod);

            return standardResponse(
                true,
                'Waiting period created successfully',
                201,
                newWaitingPeriod,
                null,
                'insurance-features/createWaitingPeriod'
            );
        } catch (error) {
            console.log('api- insurance-features/createWaitingPeriod:', error.message);

            return standardResponse(
                false,
                'Error creating waiting period',
                500,
                null,
                null,
                'insurance-features/createWaitingPeriod'
            );
        }
    }

    async updateWaitingPeriod(reqBody: any): Promise<any> {
        try {
            const { waitingPeriodId, name, insuranceType, waitingTime, timeType, isActive } = reqBody;

            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 400);
            }

            const waitingPeriod = await this.waitingPeriodRepo.findOne({
                where: { id: waitingPeriodId },
                relations: ['insuranceTypes']
            });

            if (!waitingPeriod) {
                return standardResponse(false, 'Waiting Period not found', 404);
            }

            const insuranceTypeEntity = await this.insuranceTypeRepo.findOne({
                where: { code: insuranceType }
            });

            if (!insuranceTypeEntity) {
                return standardResponse(false, 'Invalid insurance type', 400);
            }

            const duplicateCheck = await this.waitingPeriodRepo.findOne({
                where: {
                    name: name,
                    insuranceTypes: { id: insuranceTypeEntity.id }
                }
            });
            // console.log('duplicate check', duplicateCheck.id, waitingPeriodId);

            if (duplicateCheck && duplicateCheck.id !== waitingPeriodId) {
                return standardResponse(
                    false,
                    'Waiting period already exists with same name',
                    409,
                    null,
                    null,
                    'insurance-features/updateWaitingPeriod'
                );
            }

            waitingPeriod.name = name;
            waitingPeriod.insuranceTypes = insuranceTypeEntity;
            waitingPeriod.waitingTime = waitingTime;
            waitingPeriod.timeType = timeType;
            waitingPeriod.isActive = isActive;
            waitingPeriod.updatedAt = new Date();
            waitingPeriod.updatedBy = userEntity;

            await this.waitingPeriodRepo.save(waitingPeriod);

            return standardResponse(
                true,
                'Waiting period updated successfully',
                200,
                waitingPeriod,
                null,
                'insurance-features/updateWaitingPeriod'
            );
        } catch (error) {
            console.log('api- insurance-features/updateWaitingPeriod:', error.message);
            return standardResponse(
                false,
                'Error updating waiting period',
                500,
                null,
                null,
                'insurance-features/updateWaitingPeriod'
            );
        }
    }

    async getAllWaitingPeriod(reqBody: any): Promise<any> {
        try {
            const { pageNo, pageSize, filterType } = reqBody;

            const skip = Number((pageNo - 1) * pageSize);
            // console.log(pageNo, pageSize, skip);

            // Build query
            const qb = this.waitingPeriodRepo.createQueryBuilder('w').leftJoinAndSelect('w.insuranceTypes', 'it');
            if (filterType) {
                qb.where('it.code = :code', { code: filterType });
            }
            qb.skip(skip).take(pageSize).orderBy('w.createdAt', 'DESC');

            const [data, total] = await qb.getManyAndCount();
            //   console.log("in get features api", data, total);
            return standardResponse(
                true,
                'Waiting period fetched successfully',
                200,
                { total, pageNo: Number(pageNo), pageSize: Number(pageSize), data },
                null,
                'insurance-features/getAllWaitingPeriod'
            );
        } catch (error) {
            console.log('api- insurance-features/getAllWaitingPeriod:', error);
            return standardResponse(
                false,
                'Error fetching insurance features',
                500,
                null,
                'insurance-features/getAllWaitingPeriod'
            );
        }
    }

    async deleteWaitingPeriod(reqBody: any): Promise<any> {
        try {
            const { waitingPeriodId } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 400);
            }

            const waitingPeriod = await this.waitingPeriodRepo.findOne({
                where: { id: waitingPeriodId }
            });

            if (!waitingPeriod) {
                return standardResponse(
                    false,
                    'Waiting Period not found',
                    404,
                    null,
                    null,
                    'insurance-features/deleteWaitingPeriod'
                );
            }

            if (!waitingPeriod.isActive) {
                return standardResponse(
                    false,
                    'Waiting Period already deleted',
                    400,
                    null,
                    null,
                    'insurance-features/deleteWaitingPeriod'
                );
            }
            console.log('id---------', waitingPeriodId, waitingPeriod);

            // 3. Soft delete the record
            waitingPeriod.isActive = false;
            waitingPeriod.deletedAt = new Date();
            waitingPeriod.updatedBy = userEntity;

            const result = await this.waitingPeriodRepo.save(waitingPeriod);
            console.log('result is ', result);

            return standardResponse(
                true,
                'Waiting period deleted successfully',
                200,
                waitingPeriod,
                null,
                'insurance-features/deleteWaitingPeriod'
            );
        } catch (error) {
            console.log('api- insurance-features/deleteWaitingPeriod:', error);
            return standardResponse(false, 'Error deleting insurance waiting period', 500);
        }
    }

    async waitingPeriodBulkUpload(reqBody: any): Promise<any> {
        const failed: { index: number; name: string; reason: string }[] = [];
        const data = reqBody.data || [];
        const startIndex = reqBody.startIndex || 0;
        const headerOffset = 1;

        const userEntity = await this.loggedInsUserService.getCurrentUser();
        if (!userEntity) {
            return standardResponse(
                false,
                'Logged user not found',
                404,
                null,
                null,
                'insurance-features/waitingPeriodBulkUpload'
            );
        }

        try {
            if (!Array.isArray(data) || data.length === 0) {
                return standardResponse(
                    true,
                    'No data provided for bulk upload',
                    200,
                    {
                        successCount: 0,
                        failedCount: 0,
                        failed: []
                    },
                    null,
                    'insurance-features/waitingPeriodBulkUpload'
                );
            }

            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                const rowIndex = startIndex + i + headerOffset;

                try {
                    const name = item['Name'];
                    const insuranceTypeCode = item['Insurance Type'];
                    const waitingTime = item['Waiting Time'];
                    const timeType = item['Time Type'];

                    // ---------------- VALIDATIONS ----------------
                    if (!name || !insuranceTypeCode || !waitingTime || !timeType) {
                        failed.push({
                            index: rowIndex,
                            name: name || 'N/A',
                            reason: 'Missing required fields'
                        });
                        continue;
                    }

                    const insuranceTypeEntity = await this.insuranceTypeRepo.findOne({
                        where: { code: insuranceTypeCode }
                    });

                    if (!insuranceTypeEntity) {
                        failed.push({
                            index: rowIndex,
                            name,
                            reason: `Invalid insurance type: ${insuranceTypeCode}`
                        });
                        continue;
                    }

                    const existing = await this.waitingPeriodRepo.findOne({
                        where: {
                            name,
                            insuranceTypes: { id: insuranceTypeEntity.id }
                        }
                    });

                    if (existing) {
                        failed.push({
                            index: rowIndex,
                            name,
                            reason: 'Waiting period already exists'
                        });
                        continue;
                    }

                    // ---------------- INSERT ----------------
                    const newWaitingPeriod = this.waitingPeriodRepo.create({
                        name,
                        insuranceTypes: insuranceTypeEntity,
                        waitingTime: Number(waitingTime),
                        timeType: timeType,
                        isActive: true,
                        createdAt: new Date(),
                        createdBy: userEntity
                    });

                    await this.waitingPeriodRepo.save(newWaitingPeriod);
                } catch (error) {
                    console.log('error! api- insurance-features/wiatingPeriodBulkUpload');
                    failed.push({
                        index: rowIndex,
                        name: item?.Name || 'Unknown',
                        reason: error.message || 'Database error'
                    });
                }
            }

            const successCount = data.length - failed.length;
            const failedCount = failed.length;

            let message = 'Waiting periods inserted successfully.';
            if (successCount > 0 && failedCount > 0) message = 'Waiting periods partially inserted.';
            if (successCount === 0) message = 'Failed to insert waiting periods.';

            return standardResponse(
                true,
                message,
                200,
                {
                    successCount,
                    failedCount,
                    failed
                },
                null,
                'insurance-features/waitingPeriodBulkUpload'
            );
        } catch (error) {
            return standardResponse(
                false,
                'Bulk upload failed',
                500,
                {
                    successCount: 0,
                    failedCount: data.length,
                    failed: data.map((item, index) => ({
                        index: startIndex + index + headerOffset,
                        name: item?.Name || 'Unknown',
                        reason: error.message
                    }))
                },
                null,
                'insurance-features/waitingPeriodBulkUpload'
            );
        }
    }
}
