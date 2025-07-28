import { Injectable } from '@nestjs/common';
import { Country } from './entities/country.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateteCountryDto } from './dto/request/create-country.dto';

@Injectable()
export class CountriesService {
    constructor(
        @InjectRepository(Country)
        private countryRepo: Repository<Country>
    ) {}

    create(createCountryDto: any) {
        return 'This action adds a new country';
    }

    async bulkInsert(body: any) {
        const createCountryDtos = body.countries;
        const countries = createCountryDtos.map((dto) => {
            const country = this.countryRepo.create(dto as Partial<Country>); // Creates an instance of Country
            return country;
        });

        await this.countryRepo.save(countries);
        return { message: `${countries.length} countries inserted successfully.` };
    }

    async findAll() {
        return await this.countryRepo.createQueryBuilder('country').orderBy('country.name', 'ASC').getMany();
    }

    async findOne(id: number) {
        return await this.countryRepo
            .createQueryBuilder('country')
            .leftJoinAndSelect('country.states', 'states')
            .where('country.id = :id', { id })
            .orderBy('states.name', 'ASC')
            .getOne();
    }

    update(id: number, updateCountryDto: any) {
        return `This action updates a #${id} country`;
    }

    remove(id: number) {
        return `This action removes a #${id} country`;
    }
}
