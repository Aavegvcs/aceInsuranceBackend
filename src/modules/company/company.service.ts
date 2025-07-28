import {
    Injectable,
    HttpException,
    HttpStatus,
    ConflictException,
    NotFoundException,
    Inject,
    forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Company } from './entities/company.entity';
import { LogService } from '../log/log.service';
import { AddressService } from '../address/address.service';
import { MediaService } from '../media/media.service';
import { CompanyCreateDto } from './dto/company-create.dto';
import { CompanyUpdateDto } from './dto/update-company.dto';
import { User } from '../user/user.entity';
import { Features, fillOrReplaceObject, orderByKey, orderByValue } from 'src/utils/app.utils';
import { Action } from '../ability/ability.factory';
import { UserService } from '../user/user.service';

@Injectable()
export class CompanyService {
    constructor(
        private authService: AuthService,
        private logService: LogService,
        private addressService: AddressService,
        private mediaService: MediaService,
        @InjectRepository(Company)
        private companyRepo: Repository<Company>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @Inject(forwardRef(() => UserService))
        private userService: UserService
    ) {}

    async create(companyCreateDto: CompanyCreateDto, req: any) {
        const loggedInUser = req?.user?.email ? await this.userRepo.findOneBy({ email: req?.user?.email }) : null;

        let company: Company = new Company();
        fillOrReplaceObject(company, companyCreateDto);

        if (loggedInUser) {
            company.createdBy = loggedInUser.id;
        }

        try {
            const companyData = await this.companyRepo.save(company);
            const logsData = await this.logService.saveLogByRef(companyData, Features.company, Action.create, req);

            if (!logsData) throw new HttpException('could not save logs..', HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException(['Company Name already exists']);
            }
            throw error;
        }
    }

    async companyList(req: any): Promise<any> {
        const companies = await this.companyRepo
            .createQueryBuilder('company')
            .leftJoinAndSelect('company.state', 'state')
            .leftJoinAndSelect('company.city', 'city')
            .leftJoinAndSelect('company.country', 'country')
            .where(req?.QUERY_STRING?.where)
            .skip(req?.QUERY_STRING?.skip)
            .take(req?.QUERY_STRING?.limit)
            .orderBy(
                orderByKey({
                    key: req?.QUERY_STRING?.orderBy?.key,
                    repoAlias: 'company'
                }),
                orderByValue({ req })
            )
            .getMany();

        const qb = this.companyRepo.createQueryBuilder('company').where(req?.QUERY_STRING?.where).select([]);

        let res: any[] = [];

        for (const company of companies) {
            let clients = await this.userRepo
                .createQueryBuilder('user')
                .where('user.company = :company AND user.userType = :userType', {
                    company: company.id,
                    userType: 'client'
                })
                .getMany();

            let staff = await this.userRepo
                .createQueryBuilder('user')
                .where('user.company = :company AND user.userType = :userType', {
                    company: company.id,
                    userType: 'staff'
                })
                .getMany();

            let obj = {
                ...company,
                client: {
                    count: clients?.length,
                    records: [...clients]
                },
               
                staff: {
                    count: staff?.length,
                    records: [...staff]
                }
            };
            res.push(obj);
        }

        return { res, qb };
    }

    async findOneById(id: number) {
        return await this.companyRepo
            .createQueryBuilder('company')
            .leftJoinAndSelect('company.state', 'state')
            .leftJoinAndSelect('company.city', 'city')
            .leftJoinAndSelect('company.country', 'country')
            .where('company.id = :id', { id })
            .getOne();
    }

    async findCompanyById(id: number) {
        return await this.companyRepo.findOneBy({ id });
    }

    async updateCompany(updateCompanyDto: CompanyUpdateDto, req: any) {
        const loggedInUser = req?.user?.email ? await this.userRepo.findOneBy({ email: req?.user?.email }) : null;

        let company: Company = await this.findOne(+updateCompanyDto.id);
        if (!company) throw new NotFoundException(['Company not found']);

        fillOrReplaceObject(company, updateCompanyDto);

        if (loggedInUser) {
            company.updatedBy = loggedInUser.id;
        }

        try {
            const companyData = await this.companyRepo.save(company);

            const logsData = await this.logService.saveLogByRef(companyData, Features.company, Action.update, req);

            if (!logsData) throw new HttpException('could not save logs..', HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (error) {
            if (error.code === '23505') {
                throw new ConflictException(['Company Name already exists']);
            }
            throw error;
        }
    }

    async deleteCompany(req: any) {
        const loggedInUser = req?.user?.email ? await this.userRepo.findOneBy({ email: req?.user?.email }) : null;

        const company = req.body.id;
        await this.addressService.deleteAddressOfRef(company, 'company');

        // Using custom query to Soft-Delete records based on refid and refTypeid

        await this.companyRepo
            .createQueryBuilder()
            .update(Company)
            .set({ deletedAt: new Date(), updatedBy: loggedInUser?.id ?? null }) // Assuming userId is the value to update in updatedBy
            .where('id = :company', { company })
            .execute();
    }

    async findOne(id: number): Promise<Company> {
        return await this.companyRepo.findOneBy({ id });
    }
}
