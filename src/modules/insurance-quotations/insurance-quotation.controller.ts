import { Body, Controller, Get, HttpException, HttpStatus, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InsuranceQuotationService } from './insurance-quotation.service';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';

@ApiTags('insurance-quotation')
@Controller('insurance-quotation')
export class InsuranceQuotationController {
    constructor(private readonly quotationService: InsuranceQuotationService) {}

    @UseGuards(JwtInsAuthGuard)
    @Post('generateQuotation')
    async generateQuotation(@Body() reqBody: any) {
        try {
            return await this.quotationService.generateQuotation(reqBody);
        } catch (error) {
            throw new HttpException('Failed to generate quotation', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('sendQuotationMail')
    async sendQuotationMail(@Body() reqBody: any) {
        try {
            return await this.quotationService.sendQuotationMail(reqBody);
        } catch (error) {
            throw new HttpException('Failed to send quotation', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('downloadQuotation')
    async downloadQuotation(@Body() reqBody: { ticketId?: string; quotationId?: string }, @Res() res: any) {
        try {
            //   console.log('in download function-----------:');
            const { ticketId, quotationId } = reqBody;
            if (!ticketId || !quotationId) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    status: 'error',
                    message: 'ticketId and quotationId are required'
                });
            }

            const result = await this.quotationService.downloadQuotation(reqBody);

            if (result.status === 'error') {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    status: 'error',
                    message: result.message
                });
            }

            const pdfBuffer = result.data;
            if (!pdfBuffer || !(pdfBuffer instanceof Buffer)) {
                console.error('Invalid PDF buffer:', pdfBuffer);
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    status: 'error',
                    message: 'Invalid PDF buffer'
                });
            }

            // Set headers for file download
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=quotation_${ticketId}.pdf`,
                'Content-Length': pdfBuffer.length,
                'Access-Control-Expose-Headers': 'Content-Disposition'
            });

            // Send the buffer
            res.end(pdfBuffer);
        } catch (error) {
            console.error('Controller error:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                message: 'Failed to download quotation: ' + error.message
            });
        }
    }
    @Get('getQuotationByTicketId/:ticketId')
    async getQuotationByTicketId(@Param('ticketId') ticketId: any) {
        try {
            return await this.quotationService.getQuotationByTicketId(ticketId);
        } catch (error) {
            throw new HttpException('Failed to fetch quotation', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

     @UseGuards(JwtInsAuthGuard)
    @Post('changedQuotatinSatus')
    async changedQuotatinSatus(@Body() reqBody: any, @Req() req: any) {
        try {
            return await this.quotationService.changedQuotatinSatus(reqBody, req);
        } catch (error) {
            throw new HttpException('Failed to send quotation', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Get('getQuotationById/:quotationId')
    async getQuotationById(@Param('quotationId') quotationId: any) {
        try {
            // return await this.quotationService.getQuotationById(quotationId);
            return await this.quotationService.newGetQuotationById(quotationId);
        } catch (error) {
            throw new HttpException('Failed to fetch quotation', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
 @UseGuards(JwtInsAuthGuard)
    @Put('updateQuotation')
    async updateQuotation(@Body() reqBody: any) {
        try {
            return await this.quotationService.newUpdateQuotation(reqBody);
        } catch (error) {
            throw new HttpException('Failed to update quotation', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
