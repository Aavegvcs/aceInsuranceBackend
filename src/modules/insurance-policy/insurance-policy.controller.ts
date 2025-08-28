import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';
import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsurancePolicyService } from './insurance-policy.service';

@ApiTags('insurance-policy')
@Controller('insurance-policy')
export class InsurancePolicyController {
    constructor(private readonly _policyService: InsurancePolicyService) {}

    //  @UseGuards(JwtInsAuthGuard)
    @Post('getInsurancePolicyCard')
    @ApiOperation({ summary: 'get policy details for show on card' })
    async getInsurancePolicyCard(@Body() reqBody: any, @Req() req: any) {
        const response = await this._policyService.getInsurancePolicyCard(reqBody);
        return response;
    }

    
    @UseGuards(JwtInsAuthGuard)
    @Get('getInsurancePolicyDetails/:policyId')
    @ApiOperation({ summary: 'get insurance policy details' })
    async getInsurancePolicyDetails(@Param('policyId') policyId: string) {
        const response = await this._policyService.getInsurancePolicyDetails(Number(policyId));
        return response;
    }
}
