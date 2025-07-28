import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Patch,
    Delete,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    Req,
    Query,
    Logger,
    HttpStatus,
    HttpException
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { DashboardService } from '@modules/dashboard/dashboard.service';
import { EmployeeService } from '@modules/employee/employee.service';
import { Designation } from 'src/utils/app.utils';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
    constructor(private readonly branchService: BranchService, private readonly dashboardService: DashboardService, private readonly employeeService: EmployeeService) { }

    // @UseGuards(JwtAuthGuard)
    @Post('create')
    @ApiOperation({ summary: 'Create a new branch' })
    async create(@Body() createBranchDto: CreateBranchDto) {
        return this.branchService.create(createBranchDto);
    }

    // @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Get all branches' })
    @Post('list')
    async findAll(@Req() req: any) {
        return this.branchService.findAll(req);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    @ApiOperation({ summary: 'Get a branch by ID' })
    async findOne(@Param('id') id: string) {
        return this.branchService.findById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    @ApiOperation({ summary: 'Update a branch' })
    async update(@Param('id') id: string, @Body() updateBranchDto: UpdateBranchDto) {
        return this.branchService.update(id, updateBranchDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a branch' })
    async remove(@Param('id') id: string) {
        return this.branchService.remove(id);
    }

    @Post('getFranchiseesMis')
    @ApiOperation({ summary: 'Get franchisee data' })
    async getFranchiseeData(@Req() req: any) {
        return this.branchService.getFranchiseeMis(req);
    }

    @Post('getFranchisees')
    @ApiOperation({ summary: 'Get franchisee data' })
    async getFranchisees(@Req() req: any) {
        return this.branchService.getFranchisees(req);
    }

    @Post('updateFranchiseeMapping')
    @ApiOperation({ summary: 'Update franchisee Mapping' })
    async updateFranchiseeMapping(@Req() req: any) {
        return this.branchService.updateFranchiseeMapping(req);
    }

    @Post('getFranchiseeMapping')
    @ApiOperation({ summary: 'get franchisee Mapping' })
    async getFranchiseeMapping(@Req() req: any) {
        return this.branchService.getFranchiseeMapping(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('getSubBranchRevenue')
    async getSubbranchRevenue(@Req() req: any): Promise<any> {
        const { genericId } = req.user;
        const { date, isDashboard } = req.body;
        try {
            const employee = await this.employeeService.getEmployeeById(genericId);
            const branchIds = await this.branchService.resolveBranchIds(employee);
            const result = await this.branchService.getSubbranchRevenue({ branchIds, date, isDashboard, req, employee });
            return result;
        } catch (error) {
            Logger.error(`Error fetching subbranch revenue: ${error.message}`);

            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('getRevenueReports')
    async getRevenueReports(@Req() req: any): Promise<any> {
        const { genericId } = req.user;
        const { date, isDashboard, branchId } = req.body;
        try {
            const employee = await this.employeeService.getEmployeeById(genericId);
            const branchIds = await this.branchService.resolveBranchIds(employee);
            const filteredBranchIds = employee.designation === Designation.branchManager ? [branchId] : Array.from(new Set(branchIds));
            // Logger.log(`Branch IDs: ${branchIds}`);
            const subBranchRevenue = await this.branchService.getSubbranchRevenue({
                branchIds,
                date,
                isDashboard,
                req,
                employee
            });

            const { segments, products } = await this.branchService.getRevenueStats({ branchIds: filteredBranchIds, date });
            const churn = await this.branchService.getBranchClientStats({ branchIds: filteredBranchIds, date });
            return { subBranchRevenue, segmentWiseRevenue: segments, productWiseRevenue: products, churn };
        } catch (error) {
            Logger.error(`Error fetching subbranch revenue: ${error.message}`);

            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('calculate-branch-revenue')
    async calculateAndStoreBranchRevenue(@Body() body: any): Promise<void> {
        try {
            const statsDate = new Date(body.statsDate);
            await this.branchService.calculateAndStoreBranchStats(statsDate);
            // Logger.log(`Manually calculated and stored BranchRevenue for ${body.statsDate}`);
        } catch (error) {
            Logger.error(`Error calculating BranchRevenue: ${error.message}`);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
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

    @Post('get-regional-managers')
    async getRegionalManagers(@Body() body: any): Promise<any> {
        try {
            return await this.branchService.getRegionalManagers()
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

    @Post('generate-branch-stats')
    async generateBranchStats(@Body('date') date?: string) {
        try {
            // Use provided date or fallback to today
            const inputDate = date ? new Date(date) : new Date();
            inputDate.setHours(0, 0, 0, 0); // normalize to 00:00:00

            if (isNaN(inputDate.getTime())) {
                throw new HttpException('Invalid date format', HttpStatus.BAD_REQUEST);
            }

            const tradeDates = await this.dashboardService.getValidTradeDates(inputDate, inputDate);

            if (!tradeDates.length) {
                throw new HttpException('No trading data available for the given date', HttpStatus.BAD_REQUEST);
            }

            const tradeDate = tradeDates[tradeDates.length - 1]; // Use the latest available date
            await this.branchService.computeDailyBranchStats(tradeDate);

            return {
                status: 'success',
                message: `Branch stats generated successfully for ${tradeDate.toISOString().split('T')[0]}`,
            };
        } catch (error) {
            Logger.error(`Failed to generate branch stats: ${error.message}`, error.stack);
            throw new HttpException(
                `Failed to generate branch stats: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }



}