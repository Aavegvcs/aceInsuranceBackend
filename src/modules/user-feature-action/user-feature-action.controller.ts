import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserFeatureActionService } from './user-feature-action.service';
import { UpdateUserFeatureActionDto } from './dto/update-user-feature-action.dto';
import { SETTINGS } from 'src/utils/app.utils';
import { CreateUserFeatureActionDto } from './dto/request/create-user-feature-action-dto';

@Controller('user-feature-action')
export class UserFeatureActionController {
    constructor(private readonly userFeatureActionService: UserFeatureActionService) {}

    @Post('assign')
    create(@Body(SETTINGS.VALIDATION_PIPE) createUserFeatureActionDto: CreateUserFeatureActionDto) {
        return this.userFeatureActionService.create(createUserFeatureActionDto);
    }

    @Get()
    findAll() {
        return this.userFeatureActionService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.userFeatureActionService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserFeatureActionDto: UpdateUserFeatureActionDto) {
        return this.userFeatureActionService.update(+id, updateUserFeatureActionDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userFeatureActionService.remove(+id);
    }
}
