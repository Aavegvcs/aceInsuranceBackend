import { Module } from '@nestjs/common';
import { StatesService } from './states.service';
import { StatesController } from './states.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { State } from './entities/state.entity';
import { CountriesService } from '../countries/countries.service';
import { Country } from '../countries/entities/country.entity';

@Module({
    imports: [TypeOrmModule.forFeature([State, Country])],
    controllers: [StatesController],
    providers: [StatesService, CountriesService],
    exports: [StatesService]
})
export class StatesModule {}
