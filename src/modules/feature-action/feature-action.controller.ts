import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FeatureActionService } from './feature-action.service';
import { CreateFeatureActionDto } from './dto/request/create-feature-action.dto';
import { UpdateFeatureActionDto } from './dto/update-feature-action.dto';
import { SETTINGS } from 'src/utils/app.utils';

@Controller('feature-action')
export class FeatureActionController {
    constructor(private readonly featureActionService: FeatureActionService) {}

    @Post('assign')
    create(@Body(SETTINGS.VALIDATION_PIPE) createFeatureActionDto: CreateFeatureActionDto) {
        return this.featureActionService.create(createFeatureActionDto);
    }

    @Get('all')
    async findAll() {
        return { features: await this.featureActionService.findFeaturesVsPermissons() };
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.featureActionService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFeatureActionDto: UpdateFeatureActionDto) {
        return this.featureActionService.update(+id, updateFeatureActionDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.featureActionService.remove(+id);
    }
}
