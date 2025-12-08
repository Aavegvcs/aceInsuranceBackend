import { Body, Controller, Delete, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsuranceFeaturesService } from './insurance-features.service';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';

@ApiTags('insurance-features')
@Controller('insurance-features')
export class InsuranceFeaturesController {
    constructor(private readonly _featuresService: InsuranceFeaturesService) {}

    @UseGuards(JwtInsAuthGuard)
    @Post('createInsuranceFeatures')
    @ApiOperation({ summary: 'create insurance features' })
    async createInsuranceFeatures(@Body() reqBody: any) {
        const response = await this._featuresService.createInsuranceFeatures(reqBody);
        return response;
    }
   
    @UseGuards(JwtInsAuthGuard)
    @Patch('updateInsuranceFeatures')
    @ApiOperation({ summary: 'update insurance features' })
    async updateInsuranceFeatures(@Body() reqBody: any) {
        const response = await this._featuresService.updateInsuranceFeatures(reqBody);
        return response;
    }

     @UseGuards(JwtInsAuthGuard)
    @Post('getAllInsuranceFeatures')
    @ApiOperation({ summary: 'get insurance features' })
    async getAllInsuranceFeatures(@Body() reqBody: any) {
      
        
        const response = await this._featuresService.getAllInsuranceFeatures(reqBody);
        return response;
    }

    @UseGuards(JwtInsAuthGuard)
    @Patch('deleteInsuranceFeatures')
    @ApiOperation({ summary: 'delete insurance features' })
    async deleteInsuranceFeatures(@Body() reqBody: any) {
        const response = await this._featuresService.deleteInsuranceFeatures(reqBody);
        return response;
    }
}
