import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

            const result = await this.productRepo.update(reqBody.id, {
                name: reqBody.name,
                insuranceType: reqBody.insuranceType,
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
        const query = 'CALL get_ProductByType(?, ?)';
        const result = await this.companyRepo.query(query, [reqBody.insuranceCompanyId, reqBody.insuranceType]);

        if (!result || result.length === 0) {
            throw new Error(`No products found for company with ID ${reqBody.insuranceCompanyId}`);
        }

        return result[0];
    }

    //------------------------------- sub type services ------------------------------//
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
