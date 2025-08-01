import { Controller, Get, Post, Body, Param, Delete, UseGuards, HttpCode, HttpStatus, Put, Req } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { UpdateRoleDto } from './dto/request/update-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
@Controller('roles')
export class RoleController {
    constructor(private readonly roleService: RoleService) {}

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

    @UseGuards(JwtAuthGuard)
    @Put()
    async update(@Body() updateRoleDto: UpdateRoleDto) {
        await this.roleService.findAndUpdateRole(+updateRoleDto.id, updateRoleDto);
    }

}
