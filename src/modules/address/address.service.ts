import { Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ReferenceService } from '../reference/reference.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './entities/address.entity';

@Injectable()
export class AddressService {
    constructor(
        private referenceService: ReferenceService,
        @InjectRepository(Address)
        private addressRepo: Repository<Address>
    ) {}
    create(createAddressDto: CreateAddressDto) {
        return 'This action adds a new address';
    }

    findAll() {
        return `This action returns all address`;
    }

    findOne(id: number) {
        return `This action returns a #${id} address`;
    }

    update(id: number, updateAddressDto: UpdateAddressDto) {
        return `This action updates a #${id} address`;
    }

    remove(id: number) {
        return `This action removes a #${id} address`;
    }

    async findOneByRef(refId: number, refTypeId: number): Promise<Address> {
        return this.addressRepo.findOneBy({ refId, refTypeId });
    }

    async findAndUpdate(userId: number, defaultLocation: string): Promise<any> {
        // Retrieve the reference for 'user'
        const ref = await this.referenceService.findOneByName('user');

        // Try to find the existing Address record
        let dbAddr: Address = await this.findOneByRef(userId, ref.id);

        // If the record doesn't exist, create a new Address instance
        if (!dbAddr) {
            dbAddr = new Address();
        }

        // Update the properties of the Address instance
        dbAddr.refId = userId;
        dbAddr.refTypeId = ref.id;
        dbAddr.state = defaultLocation;

        // Save the Address record
        const updatedAddress = await this.addressRepo.save(dbAddr);

        return updatedAddress;
    }

    async saveAddressByRef(refDetails, refType: string, CLIENT_INFO = null): Promise<Address> {
        // Create a new log entry with refId and refTypeId populated
        const addr = new Address();
        addr.refId = refDetails.id; // Set the refId with the newly created user's id

        // Fix error by fetching reference entity instead of hardcoded number
        const ref = await this.referenceService.findOneByName(refType);
        addr.refTypeId = ref.id; // Set refTypeId to reference entity

        // Save the log entry to the database
        return await this.addressRepo.save(addr);
    }

    async addAddressOfRef(refId: number, referenceType: string, req): Promise<any> {
        // Retrieve the reference for 'user'
        const ref = await this.referenceService.findOneByName(referenceType);

        const address = new Address();
        address.addr = req.body.address;
        address.country = req.body.country;
        address.city = req.body.city;
        address.state = req.body.state;
        address.fax = req.body.fax;
        address.zip = req.body.zip;
        address.refId = refId;
        address.refTypeId = ref.id;

        // Save the Address record
        const addressData = await this.addressRepo.save(address);

        return addressData;
    }

    async updateAddressOfRef(refId: number, referenceType: string, data: any): Promise<any> {
        // Retrieve the reference for 'user'
        const ref = await this.referenceService.findOneByName(referenceType);

        const address = await this.findOneByRef(refId, ref.id);
        address.addr = data.address;
        address.country = data.country;
        address.city = data.city;
        address.state = data.state;
        address.fax = data.fax;
        address.zip = data.zip;
        address.refId = refId;
        address.refTypeId = ref.id;

        // Save the Address record
        const addressData = await this.addressRepo.save(address);

        return addressData;
    }

    async updateAddressOfOrganization(refId: number, referenceType: string, req: any): Promise<any> {
        // Retrieve the reference for 'user'
        const ref = await this.referenceService.findOneByName(referenceType);

        const address = await this.findOneByRef(refId, ref.id);
        address.addr = req.body.addr;
        address.country = req.body.country;
        address.city = req.body.city;
        address.state = req.body.state;
        address.fax = req.body.fax;
        address.zip = req.body.zip;
        address.refId = refId;
        address.refTypeId = ref.id;

        // Save the Address record
        const addressData = await this.addressRepo.save(address);

        return addressData;
    }

    async deleteAddressOfRef(refId: number, referenceType: string): Promise<any> {
        // Retrieve the reference for 'user'
        const ref = await this.referenceService.findOneByName(referenceType);
        const refTypeId = ref.id;

        // Using custom query to delete records based on refid and refTypeid
        await this.addressRepo
            .createQueryBuilder()
            .delete()
            .from(Address)
            .where('refId = :refId AND refTypeId = :refTypeId', { refId, refTypeId })
            .execute();
    }

    async getAddressOfRef(refId: number, referenceType: string): Promise<any> {
        // Retrieve the reference for 'user'
        const ref = await this.referenceService.findOneByName(referenceType);

        // get the Address record
        const refAddress = await this.findOneByRef(refId, ref.id);

        return refAddress;
    }
}
