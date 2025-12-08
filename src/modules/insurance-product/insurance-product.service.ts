import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InsuranceProduct } from './entities/insurance-product.entity';
import { read } from 'fs';
import { Branch } from '@modules/branch/entities/branch.entity';
import { InsuranceSubType } from './entities/insurance-subtype.entity';
import { CreateInsuranceProductDto, UpdateInsuranceProductDto } from './dto/insurance-product.dto';
import { InsuranceCompanies } from '@modules/insurance-product/entities/insurance-companies.entity';
import { CreateInsuranceCompanyDto, UpdateInsuranceCompanyDto } from './dto/insurance-companies.dto';
import { CreateInsuranceSubTypeDto, UpdateInsuranceSubTypeDto } from './dto/insurance-subtype.dto';
import { User } from '@modules/user/user.entity';
import { InsuranceAgent } from '@modules/insurance-ticket/entities/insurance-agent.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import { InsurancePurchasedProduct } from './entities/insurance-puchased-product.entity';
import { CreateInsurancePurchasedDto } from './dto/insurance-purchased.dto';
import { response } from 'express';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { exceptions, log } from 'winston';
import { InsuranceTicketService } from '@modules/insurance-ticket/insurance-ticket.service';
import { CommonConnectionOptions } from 'tls';
import { CommonQuotationService } from '@modules/insurance-quotations/common-quotation.service';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { InsuranceFeatures } from '@modules/insurance-features/entities/insurance-features.entity';

@Injectable()
export class InsuranceProductService {
    constructor(
        @InjectRepository(InsuranceCompanies)
        private readonly insuranceCompanyRepo: Repository<InsuranceCompanies>,

        @InjectRepository(InsuranceProduct)
        private readonly productRepo: Repository<InsuranceProduct>,

        @InjectRepository(Branch)
        private readonly branchRepo: Repository<Branch>,

        @InjectRepository(InsuranceCompanies)
        private readonly companyRepo: Repository<InsuranceCompanies>,

        @InjectRepository(InsuranceSubType)
        private readonly subTypeRepo: Repository<InsuranceSubType>,

        @InjectRepository(InsuranceUser)
        private readonly insuranceUserRepo: Repository<InsuranceUser>,

        @InjectRepository(InsuranceAgent)
        private readonly agentRepo: Repository<InsuranceAgent>,

        @InjectRepository(InsurancePurchasedProduct)
        private readonly purchasedRepo: Repository<InsurancePurchasedProduct>,
        @InjectRepository(InsuranceTypeMaster)
        private readonly insuranceTypeRepo: Repository<InsuranceTypeMaster>,
        @InjectRepository(InsuranceFeatures)
        private readonly insuranceFeaturesRepo: Repository<InsuranceFeatures>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private readonly loggedInsUserService: LoggedInsUserService
    ) {}

    //------------------------------- company services ------------------------------//

    async createCompany(requestParam: CreateInsuranceCompanyDto): Promise<InsuranceCompanies> {
        const company = await this.insuranceCompanyRepo.findOne({ where: { companyName: requestParam.companyName } });

        if (company) {
            throw new ConflictException(`Company with name ${requestParam.companyName} already exists`);
        }
        const newCompany = this.insuranceCompanyRepo.create(requestParam);

        return await this.insuranceCompanyRepo.save(newCompany);
    }
    async updateCompany(reqBody: any, req: any): Promise<any> {
        let response: any = {};
        console.log('in company reqBody', reqBody);
        try {
            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser', loggedInUser);
            // const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!loggedInUser) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }

            const company = await this.insuranceCompanyRepo.findOne({ where: { id: reqBody.id } });

            if (!company) {
                return {
                    status: 'error',
                    message: `Company with ID ${reqBody.id} not found`,
                    data: null
                };
            }

            const result = await this.insuranceCompanyRepo.update(reqBody.id, {
                companyName: reqBody.companyName,
                companyLogo: reqBody.companyLogo,
                companyAddress: reqBody.companyAddress,
                email: reqBody.email,
                contactPerson: reqBody.contactPerson,
                contactNumber: reqBody.contactNumber,
                secondaryContactPerson: reqBody.secondaryContactPerson,
                secondaryContactNumber: reqBody.secondaryContactNumber,
                secondaryEmail: reqBody.secondaryEmail,
                isActive: reqBody.isActive,
                updatedAt: reqBody.updatedAt,
                updatedBy: loggedInUser
            });

            if (result.affected === 0) {
                return {
                    status: 'error',
                    message: `Failed to update company with ID ${reqBody.id}`,
                    data: null
                };
            }

            return {
                status: 'success',
                message: `Company updated successfully`,
                data: reqBody
            };
        } catch (error) {
            console.log('api- insurance-product/updateCompany', error.message);

            return {
                status: 'error',
                message: 'Error updating company',
                data: null
            };
        }
    }

    async getAllCompany() {
        const company = await this.insuranceCompanyRepo.createQueryBuilder('company').getMany();
        // const query = 'CALL get_insuranceCompany()';
        // const company = await this.insuranceCompanyRepo.query(query);
        // console.log('compnay is ', company);
        // return company[0];
        return company;
    }

    async getInsuranceCompany() {
        const query = 'CALL get_allInsuranceCompany()';
        const result = await this.insuranceCompanyRepo.query(query);
        return result[0];
    }

    async getCompanyById(id: number) {
        return await this.insuranceCompanyRepo.findOne({ where: { id } });
    }
    async deleteCompany(reqBody: any) {
        let result = {};
        try {
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }
            const { companyId } = reqBody;
            if (!companyId) {
                throw new BadRequestException('Company ID is required.');
            }

            result = await this.insuranceCompanyRepo.update(companyId, {
                isActive: false,
                deletedAt: new Date(),
                updatedAt: new Date(),
                updatedBy: userEntity
            });
        } catch (error) {
            console.log('api- insurance-product/deleteCompany', error.message);

            result = {
                status: 'error',
                message: 'Error deleting company',
                data: null
            };
        }
        return result;
    }

    async companyBulkUpload(reqBody: any): Promise<any> {
        const failed: { index: number; name: string; reason: string }[] = [];
        const data = reqBody.data || [];
        const startIndex = reqBody.startIndex || 1;
        const userEntity = await this.loggedInsUserService.getCurrentUser();

        if (!userEntity) {
            return standardResponse(
                false,
                'Logged user not found',
                404,
                null,
                null,
                'insurance-claim/companyBulkUpload'
            );
        }
        try {
            if (!Array.isArray(data) || data.length === 0) {
                const result = {
                    successCount: 0,
                    failedCount: 0,
                    failed: [],
                    message: 'No data provided for bulk upload'
                };
                return standardResponse(
                    true,
                    'No data provided for bulk upload',
                    404,
                    result,
                    null,
                    'insurance-product/companyBulkUpload'
                );
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const incomingNames = data.map((item) => item.companyName);
            const existingCompanies = await this.insuranceCompanyRepo.find({
                where: { companyName: In(incomingNames) },
                select: ['companyName']
            });

            const existingNames = new Set(existingCompanies.map((c) => c.companyName));
            const uniqueData = [];
            const headerOffset = 1;
            data.forEach((item, index) => {
                const rowIndex = startIndex + index + headerOffset;

                if (existingNames.has(item.companyName)) {
                    failed.push({
                        index: rowIndex,
                        name: item.companyName,
                        reason: `Company with name ${item.companyName} already exists`
                    });
                    return;
                }

                if (item.email && !emailRegex.test(item.email)) {
                    failed.push({
                        index: rowIndex,
                        name: item.companyName || 'Unknown',
                        reason: `Invalid email format: ${item.email}`
                    });
                    return;
                }

                uniqueData.push(item);
            });

            // Step 4: Bulk insert only unique data if any
            if (uniqueData.length > 0) {
                try {
                    const insertData = uniqueData.map((item) => ({
                        ...item,
                        createdBy: userEntity // or whatever field represents the user in your table
                    }));
                    await this.insuranceCompanyRepo
                        .createQueryBuilder()
                        .insert()
                        .into(this.insuranceCompanyRepo.metadata.tableName)
                        .values(insertData)
                        .execute();
                } catch (error) {
                    uniqueData.forEach((item, index) => {
                        failed.push({
                            index: startIndex + data.indexOf(item),
                            name: item.companyName,
                            reason: error.message || 'Database insert error'
                        });
                    });
                }
            }

            let message = null;
            const successCount = uniqueData.length - failed.length;
            const failedCount = failed.length;
            console.log('before set message in company bulk upload', successCount, failedCount);
            if (successCount > 0 && failedCount > 0) {
                message = 'Data partialy inserted!';
            } else if (successCount < 0 && failedCount > 0) message = 'Failed to inserted data';
            else {
                console.log('else part in company bulk upload', successCount, failedCount);

                message = 'Data inserted successfully.';
            }
            return standardResponse(
                true,
                message,
                202,
                {
                    successCount: successCount,
                    failedCount: failedCount,
                    failed
                },
                null,
                'insurance-product/companyBulkUpload'
            );
        } catch (error) {
            return standardResponse(
                true,
                'Failed! to insert data',
                404,
                {
                    successCount: 0,
                    failedCount: data.length,
                    failed: data.map((item, index) => ({
                        index: startIndex + index,
                        name: item.companyName || 'Unknown',
                        reason: error.message || 'Unexpected server error'
                    }))
                },
                null,
                'insurance-product/companyBulkUpload'
            );
        }
    }

    //------------------------------- product services ------------------------------//

    async createProduct(requestParam: CreateInsuranceProductDto): Promise<InsuranceProduct> {
        // const branch = await this.branchRepo.findOne({ where: { id: requestParam.branchId } });
        const insuranceCompany = await this.companyRepo.findOne({ where: { id: requestParam.insuranceCompanyId } });
        // const insuranceSubType = await this.subTypeRepo.findOne({ where: { id: requestParam.insuranceSubType } });

        if (!insuranceCompany) {
            throw new Error('Invalid insurance company ID.');
        }

        const newProduct = this.productRepo.create({
            ...requestParam,
            insuranceCompanyId: insuranceCompany
        });

        return await this.productRepo.save(newProduct);
    }

    async updateProduct(reqBody: any, req: any): Promise<any> {
        try {
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }

            const product = await this.productRepo.findOne({ where: { id: reqBody.id } });
            const insuranceCompany = await this.companyRepo.findOne({ where: { id: reqBody.insuranceCompanyId } });
            if (!product || !insuranceCompany) {
                throw new Error(`product or insurance company not found`);
            }
            const insuranceTypeMaster = await this.insuranceTypeRepo.findOne({
                where: { code: reqBody.insuranceType }
            });

            const result = await this.productRepo.update(reqBody.id, {
                name: reqBody.name,
                insuranceType: reqBody.insuranceType,
                insuranceTypes: insuranceTypeMaster,
                insuranceCompanyId: reqBody.insuranceCompanyId,
                insurancePrice: reqBody.insurancePrice,
                incentivePercentage: reqBody.incentivePercentage,
                durationMonths: reqBody.durationMonths,
                shortDescription: reqBody.shortDescription,
                features: reqBody.features,
                advantages: reqBody.advantages,
                benefits: reqBody.benefits,
                payoutPercentage: reqBody.payoutPercentage,
                isActive: reqBody.isActive,
                updatedAt: reqBody.updatedAt,
                updatedBy: userEntity
            });

            if (result.affected === 0) {
                return {
                    status: 'error',
                    message: `Failed to update product with ID ${reqBody.id}`,
                    data: null
                };
            }

            return {
                status: 'success',
                message: `product updated successfully`,
                data: reqBody
            };
        } catch (error) {
            console.log('api- insurance-product/updateProduct', error.message);

            return {
                status: 'error',
                message: 'Error updating product',
                data: null
            };
        }
    }

    async getAllProducts(): Promise<InsuranceProduct[]> {
        const query = 'CALL get_allProduct()';
        const result = await this.productRepo.query(query);
        return result[0];
    }

    async getProductById(id: number): Promise<InsuranceProduct | null> {
        return await this.productRepo.findOne({ where: { id } });
    }

    async getAllProductByCompany(id: number) {
        const query = 'CALL get_ProductByCompany(?)';
        const result = await this.companyRepo.query(query, [id]);

        if (!result || result.length === 0) {
            throw new Error(`No products found for company with ID ${id}`);
        }

        return result[0];
    }

    async getAllProductByType(reqBody: any): Promise<any> {
        try {
            console.log('reqBody', reqBody);

            const query = 'CALL get_ProductByType(?, ?)';
            const result = await this.companyRepo.query(query, [reqBody.insuranceCompanyId, reqBody.insuranceType]);

            if (!result || result.length === 0) {
                throw new Error(`No products found for company with ID ${reqBody.insuranceCompanyId}`);
            }

            return result[0];
        } catch (err) {
            console.log('error in getAllProductByType', err.message);
        }
    }

    async productBulkUpload(reqBody: any): Promise<any> {
        const failed: { index: number; name: string; reason: string }[] = [];
        const data = reqBody.data || [];
        const incomingCompany = reqBody.insuranceCompanyId;
        const startIndex = reqBody.startIndex;
        const userEntity = await this.loggedInsUserService.getCurrentUser();

        if (!userEntity) {
            return standardResponse(
                false,
                'Logged user not found',
                404,
                null,
                null,
                'insurance-product/productBulkUpload'
            );
        }

        try {
            // Step 1: Validate incoming data
            if (!Array.isArray(data) || data.length === 0) {
                return standardResponse(
                    true,
                    'No data provided for bulk upload',
                    404,
                    { successCount: 0, failedCount: 0, failed: [] },
                    null,
                    'insurance-product/productBulkUpload'
                );
            }

            // Step 2: Validate company existence
            const insuranceCompany = await this.companyRepo.findOne({ where: { id: incomingCompany } });
            if (!insuranceCompany) {
                return standardResponse(
                    false,
                    'Invalid Insurance Company',
                    400,
                    null,
                    null,
                    'insurance-product/productBulkUpload'
                );
            }

            // Step 3: Extract incoming product names
            const incomingNames = data.map((item) => item.name);
            const existingProducts = await this.productRepo
                .createQueryBuilder('product')
                .leftJoinAndSelect('product.insuranceCompanyId', 'company')
                .where('product.name IN (:...names)', { names: incomingNames })
                .andWhere('company.id = :companyId', { companyId: insuranceCompany.id })
                .getMany();

            // console.log("data is ", data);

            console.log('existing product', existingProducts);

            const existingSet = new Set(existingProducts.map((p) => `${p.name}-${p.insuranceCompanyId.id}`));
            console.log('existing set', existingSet);

            // Step 5: Filter unique data
            const uniqueData: any[] = [];
            const headerOffset = 1;
            data.forEach((item, index) => {
                // const rowIndex = startIndex + index;
                const rowIndex = startIndex + index + headerOffset;
                const key = `${item.name}-${incomingCompany}`;
                if (existingSet.has(key)) {
                    failed.push({
                        index: rowIndex,
                        name: item.name,
                        reason: `Product '${item.name}' already exists for company '${insuranceCompany.companyName}'`
                    });
                } else {
                    console.log('in else part', item);

                    uniqueData.push(item);
                }
            });
            console.log('unique data is here', uniqueData);

            // Step 6: Bulk insert unique data
            if (uniqueData.length > 0) {
                try {
                    const insertData = uniqueData.map((item) => ({
                        ...item,
                        insuranceCompanyId: insuranceCompany,
                        createdBy: userEntity.id,
                        createdAt: new Date()
                    }));
                    console.log('in last insert data, ', insertData);

                    await this.productRepo
                        .createQueryBuilder()
                        .insert()
                        .into(this.productRepo.metadata.tableName)
                        .values(insertData)
                        .execute();
                } catch (error) {
                    uniqueData.forEach((item) => {
                        failed.push({
                            index: startIndex + data.indexOf(item),
                            name: item.name,
                            reason: error.message || 'Database insert error'
                        });
                    });
                }
            }

            // Step 7: Prepare response
            const successCount = uniqueData.length - failed.length > 0 ? uniqueData.length - failed.length : 0;
            const failedCount = failed.length;
            let message = 'Data inserted successfully.';

            if (successCount > 0 && failedCount > 0) {
                message = 'Data partially inserted!';
            } else if (successCount === 0 && failedCount > 0) {
                message = 'Failed to insert data!';
            }

            return standardResponse(
                true,
                message,
                202,
                { successCount, failedCount, failed },
                null,
                'insurance-product/productBulkUpload'
            );
        } catch (error) {
            return standardResponse(
                false,
                'Failed! to insert data',
                500,
                {
                    successCount: 0,
                    failedCount: data.length,
                    failed: data.map((item, index) => ({
                        index: startIndex + index,
                        name: item.name || 'Unknown',
                        reason: error.message || 'Unexpected server error'
                    }))
                },
                null,
                'insurance-product/productBulkUpload'
            );
        }
    }

    async createSubType(requestParam: CreateInsuranceSubTypeDto): Promise<InsuranceSubType> {
        const newObj = this.subTypeRepo.create(requestParam);

        return await this.subTypeRepo.save(newObj);
    }

    async updateSubType(id: number, requestParam: UpdateInsuranceSubTypeDto): Promise<InsuranceSubType> {
        const subType = await this.subTypeRepo.findOne({ where: { id } });
        if (!subType) {
            throw new Error(`Insurance SubType with ID ${id} not found`);
        }
        const updatedSubType = this.subTypeRepo.merge(subType, requestParam);
        return await this.subTypeRepo.save(updatedSubType);
    }

    async getAllSubTypes(): Promise<InsuranceSubType[]> {
        return await this.subTypeRepo.find({ where: { isActive: true } });
    }

    //------------------------------- purchased product services ------------------------------//
    async purchasedProduct(reqObj: CreateInsurancePurchasedDto, req: any): Promise<InsurancePurchasedProduct> {
        let createdBy = null;
        const insuranceUser = await this.insuranceUserRepo.findOne({ where: { id: reqObj.insuranceUserId } });
        const agent = await this.agentRepo.findOne({ where: { id: reqObj.agentId } });
        const product = await this.productRepo.findOne({ where: { id: reqObj.productId } });

        if (!insuranceUser || insuranceUser == null || !agent || agent == null || !product || product == null) {
            throw new BadRequestException('Invalid insurance User or agent or product ID.');
        }

        if (req.user) {
            const dbUser = await this.userRepo.findOne(req.user.email);
            if (dbUser) {
                createdBy = dbUser.id;
            }
        }

        const query = 'CALL ins_insurancePurchased(?, ?, ?, ?, ?, ?)';
        const result = await this.purchasedRepo.query(query, [
            insuranceUser.id,
            agent.id,
            product.id,
            reqObj.ticketId || null,
            reqObj.anyRemarks || null,
            createdBy
        ]);

        if (result[0][0].RESCODE != 1) {
            console.log('api-/insurance-purchased/purchased-', result[0][0].RESMSZ);
            throw new InternalServerErrorException('Error in creating insurance purchased product.');
        }

        return result[0][0];
    }

    async getAllPurchasedProducts(reqObj: any): Promise<InsurancePurchasedProduct[]> {
        const query = 'CALL get_allPurchaseProduct(?, ?, ?, ?)';
        const result = await this.purchasedRepo.query(query, [
            reqObj.clientId,
            reqObj.agentId,
            reqObj.fromDate,
            reqObj.toDate
        ]);

        let returnData = null;
        if (result[1][0].RESCODE == -1) {
            console.log('api-/insurance-ticket/getPurchasedProduct-', result[1][0].RESMSZ);
            throw new InternalServerErrorException('Error in getPurchasedProduct');
        } else if (result[1][0].RESCODE == 0) {
            returnData = result[1][0];
            console.log('api-/insurance-ticket/getPurchasedProduct-', result[1][0].RESMSZ);
            throw new NotFoundException(result[1][0].RESMSZ);
        } else {
            returnData = result[0][0];
        }

        return returnData;
    }

    async getProductByIds(reqBody: any): Promise<void> {
        const query = 'CALL get_purchaseProductByIds(?, ?, ?)';

        const result = await this.productRepo.query(query, [
            reqBody.purchasedId,
            reqBody.policyNumber,
            reqBody.productId
        ]);
        let returnData = null;
        if (result[1][0].RESCODE == -1) {
            console.log('api-/insurance-ticket/getPurchasedProduct-', result[1][0].RESMSZ);
            throw new InternalServerErrorException('Error in getPurchasedProduct');
        } else if (result[1][0].RESCODE == 0) {
            returnData = result[1][0];
            console.log('api-/insurance-ticket/getPurchasedProduct-', result[1][0].RESMSZ);
            throw new NotFoundException(result[1][0].RESMSZ);
        } else {
            returnData = result[0][0];
        }

        return returnData;
    }

    async deleteProduct(reqBody: any, req: any): Promise<any> {
        let result = {};
        try {
            const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }
            const { productId } = reqBody;
            if (!productId) {
                throw new BadRequestException('Company ID is required.');
            }

            result = await this.productRepo.update(productId, {
                isActive: false,
                deletedAt: new Date(),
                updatedAt: new Date(),
                updatedBy: userEntity
            });
        } catch (error) {
            console.log('api- insurance-product/deleteProduct', error.message);

            result = {
                status: 'error',
                message: 'Error deleting product',
                data: null
            };
        }
    }

    async getProductForSelection(reqBody: any): Promise<any> {
        const query = 'CALL get_productForSelection(?)';

        const result = await this.productRepo.query(query, [reqBody.ticketId]);
        // console.log('data is product', result[0]);
        let returnData = null;
        const response = {
            status: 'success',
            message: 'Product fetched successfully',
            data: result[0]
        };

        return response;
    }


}
