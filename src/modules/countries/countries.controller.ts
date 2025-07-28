import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CountriesService } from './countries.service';
import { GetCountryDto } from './dto/request/get-country.dto';
import { UpdateCountryDto } from './dto/request/update-country.dto';
import { CreateteCountryDto } from './dto/request/create-country.dto';
import { SETTINGS } from 'src/utils/app.utils';

@Controller('countries')
export class CountriesController {
    constructor(private readonly countriesService: CountriesService) {}

    @Post()
    create(@Body() createCountryDto: CreateteCountryDto) {
        return this.countriesService.create(createCountryDto);
    }

    @Post('bulk-insert')
    bulkInsert(@Body() body: any) {
        return this.countriesService.bulkInsert(body);
    }

    @Get()
    async findAll() {
        return await this.countriesService.findAll();
    }

    @Post('get-one')
    async findOne(@Body(SETTINGS.VALIDATION_PIPE) body: GetCountryDto) {
        return await this.countriesService.findOne(body?.countryId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCountryDto: UpdateCountryDto) {
        return this.countriesService.update(+id, updateCountryDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.countriesService.remove(+id);
    }
}
