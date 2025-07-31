import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';

@Controller('employee')
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) {}

    @Post('create')
    async create(@Body() createEmployeeDto: CreateEmployeeDto) {
        return this.employeeService.create(createEmployeeDto);
    }

    @ApiOperation({ summary: 'Update an existing employee' })
    @Patch('update/:id')
    async updateEmployee(@Param('id') id: string, @Body() body: UpdateEmployeeDto) {
        return this.employeeService.update(id, body);
    }

    @ApiOperation({ summary: 'Get all employees' })
    @Get('getAll')
    async getAllEmployees() {
        return this.employeeService.getAllEmployees();
    }

    @ApiOperation({ summary: 'Get an employee by ID' })
    @Get('getById/:id')
    async getEmployeeById(@Param('id') id: string) {
        return this.employeeService.getEmployeeById(id);
    }

    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get an mapping data by branch id' })
    @Post('getDealersPerBranch')
    async getMappingData(@Body() body: any) {
        return this.employeeService.getDealersPerBranch(body.branchId);
    }

    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get branch dealers brokerage' })
    @Post('getDealersBrokerage')
    async getDealersBrokerage(@Req() req: any) {
        return this.employeeService.getDealersBrokerage(req);
    }

    @Get('createBranchManagersForAllBranches')
    async createBranchManagersForAllBranches(@Req() req: any) {
        return this.employeeService.createBranchManagersForAllBranches();
    }
    
        @UseGuards(JwtInsAuthGuard)
    @Post('createInsuranceEmployee')
    async createInsuranceEmployee(@Body() createEmployeeDto: CreateEmployeeDto) {
        return this.employeeService.createInsuranceEmployee(createEmployeeDto);
    }

        @UseGuards(JwtInsAuthGuard)
    @Patch('updateInsuranceEmployee')
    async updateInsuranceEmployee(@Body() reqBody:any) {
        return this.employeeService.updateInsuranceEmployee(reqBody);
    }

        @UseGuards(JwtInsAuthGuard)
     @Post('deleteEmployee')
    @ApiOperation({ summary: 'delete employee' })
    async deleteEmployee(@Body() reqBody: any) {
        return this.employeeService.deleteEmployee(reqBody);
    }
}
