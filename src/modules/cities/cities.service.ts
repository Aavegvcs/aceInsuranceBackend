import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { Repository } from 'typeorm';
import { CreateCityDto } from './dto/request/create-city.dto';
import { UpdateCityDto } from './dto/request/update-city.dto';
import { State } from '../states/entities/state.entity';
import { StatesService } from '../states/states.service';

@Injectable()
export class CitiesService {
    constructor(
        @InjectRepository(City)
        private cityRepo: Repository<City>,
        private statesService: StatesService
    ) {}

    async create(body: CreateCityDto) {
        let state: State = await this.statesService.findOne(body?.stateId);
        if (!state) {
            throw new NotFoundException('This State does not exist.');
        }

        let city: City = await this.findOneByNameAndState(body?.cityName, body?.stateId);
        if (city) {
            throw new ConflictException('This City already exists.');
        }

        city = new City();
        city.name = body?.cityName;
        city.state = state;

        return await this.cityRepo.save(city);
    }

    async findAll() {
        return await this.cityRepo.find();
    }

    async findOne(id: number) {
        return await this.cityRepo
            .createQueryBuilder('city')
            .leftJoinAndSelect('city.state', 'state')
            .leftJoinAndSelect('state.country', 'country')
            .where('city.id = :id', { id })
            .getOne();
    }

    update(id: number, updateCityDto: UpdateCityDto) {
        return `This action updates a #${id} city`;
    }

    remove(id: number) {
        return `This action removes a #${id} city`;
    }

    async findOneByNameAndState(name: string, state: number): Promise<City> {
        return await this.cityRepo
            .createQueryBuilder('city')
            .where(`LOWER(city.name) LIKE :name AND city.state = :state`, { name, state })
            .getOne();
    }
}
