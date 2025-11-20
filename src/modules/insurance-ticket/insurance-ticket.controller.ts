import { Body, Controller, Get, Headers, Logger, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsuranceTicketService } from './insurance-ticket.service';
import { CreateInsuranceTicketDto, UpdateInsuranceTicketDto } from './dto/insurance-ticket.dto';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';
import { Ticket_Status } from 'src/utils/app.utils';

@ApiTags('insurance-ticket')
@Controller('insurance-ticket')
export class InsuranceTicketController {
    constructor(private readonly _ticketService: InsuranceTicketService) {}

    @ApiOperation({ summary: 'Create new insurance ticket' })
    @UseGuards(JwtInsAuthGuard)
    @Post('create')
    async createTicket(@Body() requestObj: CreateInsuranceTicketDto, @Req() req: any) {
        return this._ticketService.createInsuranceTicket(requestObj, req);
    }

    @UseGuards(JwtInsAuthGuard)
    @Patch('reassignedTo')
    @ApiOperation({ summary: 'reassign ticket' })
    async reassignedTo(@Body() requestObj: any) {
        return this._ticketService.reAssignedTicket(requestObj);
    }

    @Patch('update')
    @ApiOperation({ summary: 'Update insurance ticket' })
    async updateTicket(@Body() requestObj: UpdateInsuranceTicketDto, @Req() req: any) {
        return this._ticketService.updateTicket(requestObj, req);
    }

    @Get('getAll')
    @ApiOperation({ summary: 'Get all insurance tickets' })
    async getAllTickets() {
        // console.log("this is get all api 🔴");

        return this._ticketService.getAllTickets();
    }

    @Post('getbyid')
    @ApiOperation({ summary: 'Get insurance ticket by ID' })
    async getTicketById(@Body() reqObj: any) {
        // console.log('this is get by id api 🔴', reqObj);

        return this._ticketService.getTicketById(reqObj);
    }

   @UseGuards(JwtInsAuthGuard)
    @Post('getInsuranceTicket')
    @ApiOperation({ summary: 'Get all tickets for a given agent' })
    async getInsuranceTicket(@Body() reqObj: any, @Req() req: any, @Headers() headers: any) {
        
        return this._ticketService.getTicket(reqObj);
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('createInsuranceTicket')
    @ApiOperation({ summary: 'Create new insurance ticket' })
    async createInsuranceTicket(@Body() reqObj: any, @Req() req: any) {
        return this._ticketService.createInsuranceTicket(reqObj, req);
    }

    @Get('getAllAgent')
    @ApiOperation({ summary: 'Get all insurance agent' })
    async getAllAgent() {
        return this._ticketService.getAllAgent();
    }
    @Get('getEmployee')
    @ApiOperation({ summary: 'Get all insurance employee' })
    async getEmployee() {
        return this._ticketService.getEmployee();
    }

    @Get('getTicketStatus')
    getTicketStatus() {
        return Object.values(Ticket_Status);
    }

    @UseGuards(JwtInsAuthGuard)
    @Get('getTicketDetails/:ticketId')
    async getTicketDetails(@Param('ticketId') ticketId: string) {
        return this._ticketService.getTicketDetails(Number(ticketId));
    }

    @UseGuards(JwtInsAuthGuard)
    @Put('updateTicketDetails/:ticketId')
    async updateTicketDetails(@Param('ticketId') ticketId: string, @Body() reqBody: any) {
        return this._ticketService.updateTicketDetails(Number(ticketId), reqBody);
    }

    @UseGuards(JwtInsAuthGuard)
    @Put('updateTicketStatus/:ticketId')
    async updateTicketStatus(@Param('ticketId') ticketId: string, @Body() reqBody: any) {
        return this._ticketService.updateTicketStatus(Number(ticketId), reqBody);
    }

   @UseGuards(JwtInsAuthGuard)
    @Post('changeStep')
    @ApiOperation({ summary: 'change Steps' })
    async changeSteps(@Body() reqObj: any, @Req() req: any) {
        return this._ticketService.changeSteps(reqObj, req);
    }

    @Post('getStepStatusByRole')
    @ApiOperation({ summary: 'getStepStatusByRole' })
    async getStepStatusByRole(@Body() reqObj: any, @Req() req: any) {
        return this._ticketService.getStepStatusByRole(reqObj, req);
    }
    
}
