import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoleFeatureActionService } from './role-feature-action.service';
import { CreateRoleFeatureActionDto } from './dto/create-role-feature-action.dto';
import { UpdateRoleFeatureActionDto } from './dto/update-role-feature-action.dto';
import { SETTINGS } from 'src/utils/app.utils';
@Controller('role-feature-action')
export class RoleFeatureActionController {
    constructor(private readonly roleFeatureActionService: RoleFeatureActionService) {}

    @Post('assign')
    create(@Body(SETTINGS.VALIDATION_PIPE) createRoleFeatureActionDto: CreateRoleFeatureActionDto) {
        return this.roleFeatureActionService.create(createRoleFeatureActionDto);
    }

    @Get(':id')
    async findRoleVsFeatures(@Param() params: any) {
        return { features: await this.roleFeatureActionService.findRoleVsFeatures({ roleId: +params.id }) };
    }

    @Get('all')
    findOne() {
        return this.roleFeatureActionService.findAll();
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateRoleFeatureActionDto: UpdateRoleFeatureActionDto) {
        return this.roleFeatureActionService.update(+id, updateRoleFeatureActionDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.roleFeatureActionService.remove(+id);
    }
}
