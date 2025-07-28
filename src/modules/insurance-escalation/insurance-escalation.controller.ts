import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TicketNotificationService } from './ticket-notification-service';
import { InsuranceEscalationService } from './insurance-escalation.service';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';

@ApiTags('insurance-escalation')
@Controller('insurance-escalation')
export class InsuranceEscalationController {
    constructor(
        private _notificationService: TicketNotificationService,
        private _escalationService: InsuranceEscalationService
    ) {}

    @Post('checkRedisq')
    @ApiOperation({ summary: 'change Steps' })
    async checkRedis(@Body() reqObj: any, @Req() req: any) {
        console.log('this is check redis api in notif', reqObj.id);
        return this._notificationService.checkRediss(reqObj);
    }

    @Post('getNotificationForDashboard')
    @ApiOperation({ summary: 'Get Notification For Dashboard' })
    async getNotificationForDashboard(@Body() reqObj: any, @Req() req: any) {
        return this._notificationService.getNotificationForDashboard(reqObj, req);
    }

    @Post('markAllReadNotification')
    @ApiOperation({ summary: 'Get Notification For Dashboard' })
    async markAllReadNotification(@Body() reqObj: any, @Req() req: any) {
        return this._notificationService.markAllReadNotification(reqObj, req);
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('createEscalationDetails')
    @ApiOperation({ summary: 'create getEscalationDetails' })
    async createEscalationDetails(@Body() reqObj: any, @Req() req: any) {
        // console.log('this is getEscalationDetails api 🔴', reqObj);
        return this._escalationService.createEscalationDetails(reqObj, req);
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('getEscalationCase')
    @ApiOperation({ summary: 'Get getEscalationDetails' })
    async getEscalationCase(@Body() reqObj: any, @Req() req: any) {
        // console.log('this is getEscalationDetails api 🔴', reqObj);
        return this._escalationService.getEscalationCase(reqObj, req);
    }
    @UseGuards(JwtInsAuthGuard)
    @Post('getEscalationDetails')
    @ApiOperation({ summary: 'Get getEscalationDetails' })
    async getEscalationDetails(@Body() reqObj: any, @Req() req: any) {
        // console.log('this is getEscalationDetails api 🔴', reqObj);
        return this._escalationService.getEscalationDetails(reqObj, req);
    }

    @UseGuards(JwtInsAuthGuard)
    @Get('getEscalationDetailsByCaseId/:caseId')
    @ApiOperation({ summary: 'Get getEscalationDetails' })
    async getEscalationDetailsByCaseId(@Param('caseId') caseId: string, @Body() reqObj: any) {
        // console.log('this is getEscalationDetails api 🔴', reqObj);
        return this._escalationService.getEscalationDetailsByCaseId(Number(caseId), reqObj);
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('checkneedTeleCall')
    @ApiOperation({ summary: 'Get checkneedTeleCall' })
    async checkneedTeleCall(@Body() reqObj: any, @Req() req: any) {
        // console.log('this is getEscalationDetails api 🔴', reqObj);
        return this._escalationService.checkneedTeleCall(reqObj, req);
    }
    @UseGuards(JwtInsAuthGuard)
    @Post('updateTelliCommEscalationDetails')
    @ApiOperation({ summary: 'Get checkneedTeleCall' })
    async updateTelliCommEscalationDetails(@Body() reqObj: any, @Req() req: any) {
        // console.log('this is getEscalationDetails api 🔴', reqObj);
        return this._escalationService.updateTelliCommEscalationDetails(reqObj, req);
    }


    @UseGuards(JwtInsAuthGuard)
    @Patch('updateEscalation')
    @ApiOperation({ summary: 'Get checkneedTeleCall' })
    async updateEscalation(@Body() reqObj: any, @Req() req: any) {
        // console.log('this is updateEscalation api 🔴', reqObj);
        return this._escalationService.updateEscalation(reqObj, req);
    }
}
