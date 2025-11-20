import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    UseGuards,
    Req,
    Query,
    Logger,
    HttpStatus,
    HttpException
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { EmployeeService } from '@modules/employee/employee.service';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
    constructor(private readonly branchService: BranchService, private readonly employeeService: EmployeeService) { }

    @UseGuards(JwtInsAuthGuard)
    @Post('create')
    @ApiOperation({ summary: 'Create a new branch' })
    async create(@Body() reqBody: any) {
        return this.branchService.create(reqBody);
    }

    @UseGuards(JwtInsAuthGuard)
    @Patch('updateBranch')
    async updateBranch(@Body() reqBody:any) {
        return this.branchService.updateBranch(reqBody);
    }

    // @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get all branches' })
    @Post('list')
    async findAll(@Req() req: any) {
        console.log("hamara kaam ho gya")
        return this.branchService.findAll(req);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'Get a branch by ID' })
    async findOne(@Param('id') id: any) {
        return this.branchService.findById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @ApiOperation({ summary: 'Update a branch' })
    async update(@Param('id') id: any, @Body() updateBranchDto: UpdateBranchDto) {
        return this.branchService.update(id, updateBranchDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a branch' })
    async remove(@Param('id') id: any) {
        return this.branchService.remove(id);
    }


    @Post('get-all-branches')
    async getAllBranches(@Body() body: any): Promise<any> {
        try {
            return await this.branchService.getAllBranches()
        } catch (error) {
            Logger.error(`Error fetching control branch and regional managers: ${error.message}`);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @Post('toggle-status')
    async toggleStatus(@Body() body: any): Promise<any> {
        try {
            return await this.branchService.toggleStatus(body.id)
        } catch (error) {
            Logger.error
        }

    }

    
    @Post('getBranch')
    async getBranch(@Body() body: any){
        try {
            return await this.branchService.getBranch()
        } catch (error) {
            Logger.error(`Error fetching control branch and regional managers: ${error.message}`);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
 

    
    @Post('getDetailsBranch')
    async getDetailsBranch(@Body() body:any) {
    
        
        const response = await this.branchService.getDetailsBranch();
        return response;
       
    }


    @UseGuards(JwtInsAuthGuard)
    @Post('branchBulkUpload')
    @ApiOperation({ summary: 'bulk upload of product' })
    async productBulkUpbranchBulkUploadload(@Body() reqBody: any) {
        return this.branchService.branchBulkUpload(reqBody);
    }


}