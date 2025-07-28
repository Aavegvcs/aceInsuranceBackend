import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { State } from './entities/state.entity';
import { Repository } from 'typeorm';
import { UpdateStateDto } from './dto/request/update-state.dto';
import { CreateStateDto } from './dto/request/create-state.dto';
import { CountriesService } from '../countries/countries.service';
import { Country } from '../countries/entities/country.entity';

@Injectable()
export class StatesService {
    constructor(
        @InjectRepository(State)
        private stateRepo: Repository<State>,
        private countriesServ: CountriesService
    ) {}

    async create(body: CreateStateDto) {
        let country: Country = await this.countriesServ.findOne(body?.countryId);
        if (!country) {
            throw new NotFoundException('This Country does not exist.');
        }

        let state: State = await this.findOneByNameAndCountry(body?.stateName, body?.countryId);
        if (state) {
            throw new ConflictException('This State already exists.');
        }

        state = new State();
        state.name = body?.stateName;
        state.country = country;

        return await this.stateRepo.save(state);
    }

    async findAll() {
        return await this.stateRepo.find();
    }

    async findOne(id: number) {
        return await this.stateRepo
            .createQueryBuilder('state')
            .leftJoinAndSelect('state.country', 'country')
            .leftJoinAndSelect('state.cities', 'cities')
            .where('state.id = :id', { id })
            .orderBy('cities.name', 'ASC')
            .getOne();
    }

    update(id: number, updateStateDto: UpdateStateDto) {
        return `This action updates a #${id} state`;
    }

    remove(id: number) {
        return `This action removes a #${id} state`;
    }

    async findOneByNameAndCountry(name: string, country: number): Promise<State> {
        return await this.stateRepo
            .createQueryBuilder('state')
            .where(`LOWER(state.name) LIKE  :name AND state.country = :country`, { name, country })
            .getOne();
    }
}
