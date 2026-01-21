import { Body, Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InsuranceDashboardService } from "./insurance-dashboard.service";
import { JwtInsAuthGuard } from "@modules/auth/jwt-ins-auth.guard";

@ApiTags('insurance-dashboard')
@Controller('insurance-dashboard')
export class InsuranceDashboardController {
    constructor(
        private _dashboardService: InsuranceDashboardService
    ) {}

    @UseGuards(JwtInsAuthGuard)
    @Get('getAdminDashboardDetails')
    @ApiOperation({ summary: 'Get getEscalationDetails' })
    async getAdminDashboardDetails(@Body() reqObj: any) {
        //  console.log('this is getAdminDashboardDetails api 🔴');
        return this._dashboardService.getAdminDashboardDetails();
    }
   @UseGuards(JwtInsAuthGuard)
    @Get('getAgentDashboardDetails')
    @ApiOperation({ summary: 'Get getEscalationDetails' })
    async getAgentDashboardDetails(@Body() reqObj: any) {
        // console.log('this is getAgentDashboardDetails api 🔴');
        return this._dashboardService.getAgentDashboardDetails();
    }

    

}