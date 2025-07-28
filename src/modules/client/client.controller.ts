import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards, Req, Res, Logger, InternalServerErrorException } from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { ClientPdfService } from './client-pdf.service';
import { Response } from 'express';

@Controller('clients')
export class ClientController {
    constructor(
        private readonly clientService: ClientService,
        private readonly clientPdfService: ClientPdfService
    ) { }

    @Post('create')
    async create(@Body() createClientDto: CreateClientDto) {
        return this.clientService.create(createClientDto);
    }

    @Get()
    async findAll() {
        return this.clientService.findAll();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.clientService.getClientById(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('getClient')
    async getClient(@Body() body: any) {
        return await this.clientService.getClientDetails(body);
    }

    @UseGuards(JwtAuthGuard)
    @Post('getSegmentBrokerage')
    async getSegmentBrokerage(@Req() req: any) {
        return await this.clientService.getSegmentBrokerage(req);
    }

    // @UseGuards(JwtAuthGuard)
    @Post('clientsPerBranch')
    async clientsPerBranch(@Req() req: any) {
        return await this.clientService.clientsPerBranch(req);
    }

    @Post('getAllClients')
    async getAllClients(@Req() req: any) {
        return await this.clientService.getAllClients(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('updateProfile')
    async updateProfile(@Body() body: any) {
        return await this.clientService.updateProfile(body);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
        return this.clientService.update(id, updateClientDto);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id') id: string) {
        return this.clientService.remove(id);
    }

    // @UseGuards(JwtAuthGuard)
    @Post('getClientLedger')
    async getClientLedger(@Req() req: any) {
        return await this.clientService.getClientLedger(req);
    }

    // @UseGuards(JwtAuthGuard)
    @Post('getProfitLossEquity')
    async getClientPLEquity(@Req() req: any) {
        return await this.clientService.getClientPLEquity(req);
    }

    // @UseGuards(JwtAuthGuard)
    @Post('getAnnualClientPLReport')
    async getAnnualClientPLReport(@Req() req: any): Promise<any> {
        return await this.clientService.getAnnualClientPLReport(req);
    }

    // @UseGuards(JwtAuthGuard)
    @Post('getProfitLossCommodity')
    async getClientPLCommodity(@Req() req: any) {
        return await this.clientService.getClientPLCommodity(req);
    }

    // @Post('sync-client-profit-loss')
    // async syncPLs() {
    //     await this.clientService.syncClientPLEquity();
    //     await this.clientService.syncClientPLCommodity();
    //     return { message: 'PL sync completed' };
    // }

    @Post('updateClientMapping')
    async clientDealersMapping(@Body() reqBody: any) {
        const result = await this.clientService.updateClientMapping(reqBody);
        return result;
    }

    @Post('getClientMappingById')
    async getClientMappingById(@Req() req: any) {
        return await this.clientService.getClientMappingById(req.body.id);
    }

    @Post('getClientNotTrade')
    async clientNotTrade(@Req() req: any) {
        return await this.clientService.clientsNotTraded(req);
    }

    @Post('nonTradedClientsPerBranch')
    async nonTradedClientsPerBranch(@Req() req: any) {
        return await this.clientService.clientsNotTraded(req);
    }

    @Post('getClientHoldings')
    async getClientHoldings(@Req() req: any) {
        return await this.clientService.getClientHoldings(req);
    }

    @Post('getClientFASummary')
    async getClientFASummary(@Req() req: any) {
        return await this.clientService.getClientFASummary(req);
    }


    // @Post('generate-client-pdf')
    // async generateClientPdf(
    //     @Body() body: { clientId: string; dbYear: string; mode: string },
    //     @Res() res: Response,
    // ) {
    //     Logger.log('Received request to generate PDF');
    //     const { clientId, dbYear = '2025', mode = 'test' } = body;

    //     if (!clientId || !dbYear || !mode) {
    //         Logger.warn('Missing required parameters');
    //         return res.status(400).json({ message: 'Missing required parameters' });
    //     }

    //     try {
    //         Logger.log(`Generating PDF for clientId: ${clientId}, dbYear: ${dbYear}, mode: ${mode}`);
    //         const pdfBuffer = await this.clientPdfService.generateClientPdf(clientId, dbYear, mode);

    //         // Set response headers for PDF
    //         res.set({
    //             'Content-Type': 'application/pdf',
    //             'Content-Disposition': `attachment; filename="client-${clientId}.pdf"`,
    //             'Content-Length': pdfBuffer.length.toString(),
    //         });

    //         // Send the raw PDF buffer
    //         res.send(pdfBuffer);
    //     } catch (error) {
    //         Logger.error(`Error in controller: ${error.message}`);
    //         res.status(500).json({ message: 'Error generating PDF' });
    //     }
    // }

    @Post('generate-client-data')
    async generateClientData(
        @Body() body: any,
    ): Promise<any> {
        // Logger.log('Received request to fetch client data');
        const { clientId = "hexxa56", dbYear = '2025', mode = 'test' } = body;

        try {
            // Logger.log(`Fetching client data for clientId: ${clientId}, dbYear: ${dbYear}, mode: ${mode}`);
            return await this.clientPdfService.generateClientData(clientId, dbYear);

        } catch (error) {
            Logger.error(`Error in controller: ${error.message}`);
            throw new InternalServerErrorException('Error fetching client data');
        }
    }
}
