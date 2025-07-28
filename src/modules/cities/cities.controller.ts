import { Controller, Get, Post, Body, Patch, Param, Delete, Logger } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { CreateCityDto } from './dto/request/create-city.dto';
import { UpdateCityDto } from './dto/request/update-city.dto';
import { SETTINGS } from 'src/utils/app.utils';
import { GetCityDto } from './dto/request/get-city.dto';

@Controller('cities')
export class CitiesController {
    constructor(private readonly citiesService: CitiesService) {}

    @Post()
    async create(@Body(SETTINGS.VALIDATION_PIPE) body: CreateCityDto) {
        return this.citiesService.create(body);
    }

    @Post('create-many')
    async createMany(@Body() body: any) {
        const { cities } = body;
        if (!cities.length) return { message: 'No cities to create' };
        for (let i = 0; i < cities.length; i++) {
            await this.citiesService.create(cities[i]);
        }
        return { message: 'Cities created successfully' };
    }

    @Get()
    async findAll() {
        return await this.citiesService.findAll();
    }

    @Post('get-one')
    async findOne(@Body(SETTINGS.VALIDATION_PIPE) body: GetCityDto) {
        return await this.citiesService.findOne(body?.cityId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCityDto: UpdateCityDto) {
        return this.citiesService.update(+id, updateCityDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.citiesService.remove(+id);
    }
}
