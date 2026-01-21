import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';
import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsuranceClaimService } from './insurance-claim.service';

@ApiTags('insurance-claim')
@Controller('insurance-claim')
export class InsuranceClaimController {
    constructor(private readonly _claimService: InsuranceClaimService) {}

    @UseGuards(JwtInsAuthGuard)
    @Post('createClaim')
    @ApiOperation({ summary: 'this api create new cliam' })
    async createClaim(@Body() reqBody: any) {
        const response = await this._claimService.createClaim(reqBody);
        return response;
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('getAllClaims')
    @ApiOperation({ summary: 'this api get all cliam' })
    async getAllClaims(@Body() reqBody: any) {
        const response = await this._claimService.getAllClaims(reqBody);
        return response;
    }

    @UseGuards(JwtInsAuthGuard)
    @Patch('updateClaim')
    @ApiOperation({ summary: 'this api update claims' })
    async updateClaim(@Body() reqBody: any) {   
        const response = await this._claimService.updateClaim(reqBody);
        return response;
    }

     @UseGuards(JwtInsAuthGuard)
    @Patch('changeClaimStatus')
    @ApiOperation({ summary: 'this api update claims status' })
    async changeClaimStatus(@Body() reqBody: any) {
        const response = await this._claimService.changeClaimStatus(reqBody);
        return response;
    }

    @Post('getClaimsStatusForChange')
    @ApiOperation({ summary: 'this api getClaimsStatusForChange' })
    async getClaimsStatusForChange(@Body() reqBody: any) {
        const response = await this._claimService.getClaimsStatusForChange(reqBody);
        return response;
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('approveClaim')
    @ApiOperation({ summary: 'this api approveClaim' })
    async approveClaim(@Body() reqBody: any) {
        const response = await this._claimService.approveClaim(reqBody);
        return response;
    }
    @UseGuards(JwtInsAuthGuard)
    @Post('settleClaim')
    @ApiOperation({ summary: 'this api settleClaim' })
    async settleClaim(@Body() reqBody: any) {
        const response = await this._claimService.settleClaim(reqBody);
        return response;
    }

    @Post('getClaimDocuments')
    @ApiOperation({ summary: 'this api getClaimDocuments' })
    async getClaimDocuments(@Body() reqBody: any) {
        const response = await this._claimService.getClaimDocuments(reqBody);
        return response;
    }
}
