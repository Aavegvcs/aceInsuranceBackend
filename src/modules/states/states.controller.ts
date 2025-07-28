import { Controller, Get, Post, Body, Patch, Param, Delete, Logger } from '@nestjs/common';
import { StatesService } from './states.service';
import { CreateStateDto } from './dto/request/create-state.dto';
import { UpdateStateDto } from './dto/request/update-state.dto';
import { GetStateDto } from './dto/request/get-state.dto';
import { SETTINGS } from 'src/utils/app.utils';

@Controller('states')
export class StatesController {
    constructor(private readonly statesService: StatesService) {}

    @Post('create')
    async create(@Body(SETTINGS.VALIDATION_PIPE) body: CreateStateDto) {
        return this.statesService.create(body);
    }

    @Post('create-many')
    async createMany(@Body() body: any) {
        // Logger.log('Creating states...', body);
        const {states} = body;
        if (!states.length) return { message: 'No states to create' };
        for (let i = 0; i < states.length; i++) {
            await this.statesService.create(states[i]);
        }
        return { message: 'States created successfully' };
    }

    @Get()
    async findAll() {
        return await this.statesService.findAll();
    }

    @Post('get-one')
    async findOne(@Body(SETTINGS.VALIDATION_PIPE) body: GetStateDto) {
        return await this.statesService.findOne(body?.stateId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateStateDto: UpdateStateDto) {
        return this.statesService.update(+id, updateStateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.statesService.remove(+id);
    }
}
