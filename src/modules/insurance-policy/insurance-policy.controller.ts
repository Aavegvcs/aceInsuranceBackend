import { JwtInsAuthGuard } from "@modules/auth/jwt-ins-auth.guard";
import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InsurancePolicyService } from "./insurance-policy.service";

@ApiTags('insurance-policy')
@Controller('insurance-policy')
export class InsurancePolicyController {
    constructor(
        private readonly _policyService: InsurancePolicyService
    ){}

    //  @UseGuards(JwtInsAuthGuard)
        @Post('getInsurancePolicyCard')
        @ApiOperation({ summary: 'change Steps' })
        async changeSteps(@Body() reqBody: any, @Req() req: any) {
            const response = await this._policyService.getInsurancePolicyCard(reqBody);
            return response;
        }

}
