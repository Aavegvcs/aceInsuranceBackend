import { Module } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { StatesModule } from '../states/states.module';
@Module({
    imports: [StatesModule, TypeOrmModule.forFeature([City])],
    controllers: [CitiesController],
    providers: [CitiesService],
    exports: [CitiesService]
})
export class CitiesModule {}
