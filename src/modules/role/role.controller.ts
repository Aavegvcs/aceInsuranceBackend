import { Controller, Get, Post, Body, Param, Delete, UseGuards, HttpCode, HttpStatus, Put, Req } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { UpdateRoleDto } from './dto/request/update-role.dto';
import { AbilitiesGuard } from '../ability/abilities.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Role } from './entities/role.entity';
import { Action } from '../ability/ability.factory';
import { CheckAbilities } from '../ability/abilities.decorator';
@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

    //@UseGuards(JwtAuthGuard, AbilitiesGuard)
    @CheckAbilities({ action: Action.create, subject: Role })
    @Post('create')
    create(@Body() createRoleDto: CreateRoleDto) {
        return this.roleService.create(createRoleDto);
    }

    @Post('all')
    async findAll(@Req() req: any, @Body() body: any) {
        return await this.roleService.findAll(body, req);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.roleService.findOne(+id);
    }

    @UseGuards(JwtAuthGuard, AbilitiesGuard)
    @Put()
    async update(@Body() updateRoleDto: UpdateRoleDto) {
        await this.roleService.findAndUpdateRole(+updateRoleDto.id, updateRoleDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeById(@Param() params: any) {
        return this.roleService.removeById(params.id);
    }
}
