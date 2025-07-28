import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) {}

    @Post()
    create(@Body() createDepartmentDto: CreateDepartmentDto) {
        return this.departmentService.create(createDepartmentDto);
    }

    @Get()
    findAll() {
        return this.departmentService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: number) {
        return this.departmentService.findById(id);
    }

    @Patch(':id')
    update(@Param('id') id: number, @Body() updateDepartmentDto: UpdateDepartmentDto) {
        return this.departmentService.update(id, updateDepartmentDto);
    }

    @Delete(':id')
    remove(@Param('id') id: number) {
        return this.departmentService.remove(id);
    }
}
