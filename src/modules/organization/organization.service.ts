import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/response/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Organization } from './entities/organization.entity';
import { LogService } from '../log/log.service';
import { MediaService } from '../media/media.service';
import { AddressService } from '../address/address.service';
import { Features } from 'src/utils/app.utils';
import { Action } from '../ability/ability.factory';

@Injectable()
export class OrganizationService {
    constructor(
        private authService: AuthService,
        private logService: LogService,
        private mediaService: MediaService,
        private addressService: AddressService,
        @InjectRepository(Organization)
        private organizationRepo: Repository<Organization>
    ) {}

    async create(createOrganizationDto: CreateOrganizationDto, req: any) {
        let orgData: any = await this.findAll();

        let org = orgData?.[0];

        // If the record doesn't exist, create a new Address instance
        if (!orgData.length) {
            org = new Organization();
        } else {
            org = await this.findOneById(org.id);
        }

        org.orgName = req.body.orgName;
        org.website = req.body.website;
        org.timezone = req.body.timezone;
        org.currency = req.body.currency;
        org.siteShortName = req.body.siteShortName;
        org.legalName = req.body.legalName;
        org.dateFormat = req.body.dateFormat;
        org.phone = req.body.phone;
        org.secondaryPhone = req.body.secondaryPhone;
        org.logo = req.body.logo;
        org.tax = req.body.tax;
        org.address = req.body.address;
        org.country = req.body.country;
        org.city = req.body.city;
        org.state = req.body.state;
        org.fax = req.body.fax;
        org.zip = req.body.zip;

        orgData = await this.organizationRepo.save(org);
        // const logsData = await this.logService.saveLogByRef(orgData, Features.organization, Action.create, req);

        // if (!logsData) throw new HttpException('could not save logs..', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    async findAll(): Promise<Organization[]> {
        await this.mediaService.findOneByRef(2, 2);

        return await this.organizationRepo.find();
    }

    async findOneById(id: number) {
        return await this.organizationRepo.findOneBy({ id });
    }

    async findOne(id: number) {
        return await this.organizationRepo.findOneBy({ id });
    }

    update(id: number, updateOrganizationDto: UpdateOrganizationDto) {
        return `This action updates a #${id} organization`;
    }

    remove(id: number) {
        return `This action removes a #${id} organization`;
    }
}
