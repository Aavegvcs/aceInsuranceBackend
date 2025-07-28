import { Controller, Get, Body, Patch, Param, Delete } from '@nestjs/common';
import { UserRoleService } from './user-role.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
@Controller('user-role')
export class UserRoleController {
    constructor(private readonly userRoleService: UserRoleService) {}

    @Get()
    findAll() {
        return this.userRoleService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.userRoleService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto) {
        return this.userRoleService.update(+id, updateUserRoleDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.userRoleService.remove(+id);
    }
}
