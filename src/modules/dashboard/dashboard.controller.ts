import {
    Body,
    Controller,
    Get,
    HttpException,
    HttpStatus,
    InternalServerErrorException,
    Logger,
    Param,
    Post,
    Query,
    Req,
    UseGuards
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import * as moment from 'moment';
import 'moment-timezone';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { ClientDashboardStats } from './entities/client-stats.entity';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DateUtils } from 'src/utils/date.utils';

@Controller('dashboard')
export class DashboardController {
    constructor(
        private readonly dashboardService: DashboardService,
        @InjectQueue('dashboard-processor') private readonly dashboardQueue: Queue,
    ) { }

    @Post('compute')
    async computeDashboard(@Body() body: any) {
        try {
            const end = moment().tz('Asia/Kolkata').endOf('day');
            const start = moment(end).subtract(7, 'days').startOf('day');

            const tradeDates = await this.dashboardService.getValidTradeDates(start.toDate(), end.toDate());

            if (!tradeDates.length) {
                throw new HttpException('No trading data available for today', HttpStatus.BAD_REQUEST);
            }

            const tradeDate = tradeDates[tradeDates.length - 1]; // Latest available trade date
            const dateStr = moment.tz(tradeDate, 'Asia/Kolkata').format('YYYY-MM-DD');

            await this.dashboardQueue.add(
                'create-branch-dashboard-stats',
                { date: dateStr, isLastDate: true },
                {
                    jobId: `create-branch-dashboard-stats-${dateStr}`,
                    backoff: { type: 'exponential', delay: 1000 },
                    delay: 1000,
                    removeOnComplete: true,
                    removeOnFail: true,
                }
            );

            return {
                status: 'success',
                message: `Dashboard computation queued for ${dateStr}`,
            };
        } catch (error) {
            Logger.error(`Failed to queue dashboard computation: ${error.message}`, error.stack);
            throw {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to queue dashboard computation',
                error: error.message,
            };
        }
    }


    @Post('backfill-stats')
    async backfillStats(@Body() body: { startDate?: string; endDate?: string }) {
        try {
            // Validate date format (YYYY-MM-DD)
            const isValidDate = (dateStr: string): boolean => {
                return dateStr && moment(dateStr, 'YYYY-MM-DD', true).isValid();
            };

            // Determine endDate: use provided date if valid, otherwise default to yesterday
            const endDate = isValidDate(body.endDate)
                ? moment.tz(body.endDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day').toDate()
                : moment().tz('Asia/Kolkata').subtract(1, 'days').startOf('day').toDate();

            // Determine startDate: use provided date if valid, otherwise 7 days before endDate
            const startDate = isValidDate(body.startDate)
                ? moment.tz(body.startDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day').toDate()
                : moment(endDate).subtract(7, 'days').startOf('day').toDate();

            // Validate date range
            if (startDate > endDate) {
                throw new Error('startDate cannot be after endDate');
            }
            const daysDiff = moment(endDate).diff(startDate, 'days') + 1;
            if (daysDiff > 90) {
                throw new Error('Date range cannot exceed 90 days');
            }

            // Fetch valid trade dates within the range
            const tradeDates = await this.dashboardService.getValidTradeDates(startDate, endDate);

            if (!tradeDates.length) {
                throw new HttpException(
                    `No trading data available between ${startDate.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}`,
                    HttpStatus.BAD_REQUEST
                );
            }

            // Queue jobs for each valid trade date
            for (let i = 0; i < tradeDates.length; i++) {
                const date = tradeDates[i];
                const momentDate = moment.tz(date, 'Asia/Kolkata');
                const isLastDayOfMonth = momentDate.isSame(momentDate.clone().endOf('month'), 'day');
                const isLastDate = i === tradeDates.length - 1 || isLastDayOfMonth;
                try {
                    const istDate = momentDate.format('YYYY-MM-DD');
                    await this.dashboardQueue.add(
                        'create-branch-dashboard-stats',
                        { date: istDate, isLastDate },
                        {
                            jobId: `backfill-stats-${istDate}`,
                            backoff: { type: 'exponential', delay: 1000 },
                            delay: 1000,
                            removeOnComplete: true,
                            removeOnFail: true,
                            attempts: 3,
                        }
                    );
                } catch (error) {
                    Logger.error(`Failed to queue stats for ${date.toISOString().split('T')[0]}: ${error.message}`);
                }
            }

            return {
                status: 'success',
                message: `Backfill computation queued for ${tradeDates.length} valid trade dates from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            };
        } catch (error) {
            Logger.error(`Failed to queue backfill stats: ${error.message}`, error.stack);
            throw {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to queue backfill stats',
                error: error.message,
            };
        }
    }

    @Post('backfill-dealer-stats')
    async backfillDealerStats(@Body() body: { startDate?: string; endDate?: string }) {
        try {
            // Validate date format (YYYY-MM-DD)
            const isValidDate = (dateStr: string): boolean => {
                return dateStr && moment(dateStr, 'YYYY-MM-DD', true).isValid();
            };

            // Determine endDate: use provided date if valid, otherwise default to yesterday
            const endDate = isValidDate(body.endDate)
                ? moment.tz(body.endDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day').toDate()
                : moment().tz('Asia/Kolkata').subtract(1, 'days').startOf('day').toDate();

            // Determine startDate: use provided date if valid, otherwise 7 days before endDate
            const startDate = isValidDate(body.startDate)
                ? moment.tz(body.startDate, 'YYYY-MM-DD', 'Asia/Kolkata').startOf('day').toDate()
                : moment(endDate).subtract(7, 'days').startOf('day').toDate();

            // Validate date range
            if (startDate > endDate) {
                throw new Error('startDate cannot be after endDate');
            }
            const daysDiff = moment(endDate).diff(startDate, 'days') + 1;
            if (daysDiff > 90) {
                throw new Error('Date range cannot exceed 90 days');
            }

            // Fetch valid trade dates within the range
            const tradeDates = await this.dashboardService.getValidTradeDates(startDate, endDate);

            if (!tradeDates.length) {
                throw new HttpException(
                    `No trading data available between ${startDate.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}`,
                    HttpStatus.BAD_REQUEST
                );
            }

            // Queue jobs for each valid trade date
            for (let i = 0; i < tradeDates.length; i++) {
                const date = tradeDates[i];
                const momentDate = moment.tz(date, 'Asia/Kolkata');
                try {
                    const istDate = momentDate.format('YYYY-MM-DD');
                    await this.dashboardQueue.add(
                        'create-dealer-dashboard-stats',
                        { date: istDate },
                        {
                            jobId: `backfill-dealer-stats-${istDate}`,
                            backoff: { type: 'exponential', delay: 1000 },
                            delay: 1000,
                            removeOnComplete: true,
                            removeOnFail: true,
                            attempts: 3,
                        }
                    );
                } catch (error) {
                    Logger.error(`Failed to queue stats for ${date.toISOString().split('T')[0]}: ${error.message}`);
                }
            }

            return {
                status: 'success',
                message: `Backfill dealer computation queued for ${tradeDates.length} valid trade dates from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
            };
        } catch (error) {
            Logger.error(`Failed to queue backfill stats: ${error.message}`, error.stack);
            throw {
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'Failed to queue backfill stats',
                error: error.message,
            };
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('branch-stats')
    async getStats(@Req() req: any) {
        const { date } = req.body;
        const { genericId } = req.user;

        if (!date) {
            throw new HttpException('Date is required', HttpStatus.BAD_REQUEST);
        }

        try {
            const branchIds = await this.dashboardService.resolveBranchIds(genericId);
            if (!branchIds.length) {
                throw new HttpException('No branches found for the user', HttpStatus.NOT_FOUND);
            }
            return await this.dashboardService.getDailyStats(branchIds, date);
        } catch (error) {
            Logger.error(`Error fetching stats for user ${genericId}: ${error.message}`);
            throw new HttpException(error.message || 'Failed to fetch branch stats', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('daily-analysis')
    async getDailyAnalysis(@Req() req: any): Promise<{ period: string; dailyAnalysis: { date: Date; brokerage: number }[] }> {
        const { date, branchId, period } = req.body;
        const { genericId } = req.user;
        try {
            // Convert single branchId to array for compatibility with DailyAnalysisApi
            const branchIds = await this.dashboardService.resolveBranchIds(genericId);
            const dailyAnalysis = await this.dashboardService.getDailyAnalysis(branchIds, date, period);
            return dailyAnalysis;
        } catch (error) {
            throw new HttpException(
                `Failed to fetch ${period} analysis for branch ${branchId} on ${date}: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('generate/:clientId')
    async generateStats(@Param('clientId') clientId: string): Promise<ClientDashboardStats> {
        try {
            const stats = await this.dashboardService.generateClientDashboardStats(clientId);
            return stats;
        } catch (error) {
            throw new HttpException(
                `Failed to generate dashboard stats for client ${clientId}: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('generate-client-stats')
    async generateAllClientStats(): Promise<any> {
        try {
            await this.dashboardService.generateClientDashboardStatsForAll();
            return { message: 'Dashboard stats generation completed' };
        } catch (error) {
            throw new HttpException(
                `Failed to generate dashboard stats for clients: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Post('client-stats')
    async getClientStats(@Req() req: any): Promise<ClientDashboardStats> {
        const { clientId } = req.body;
        // Validate clientId
        if (!clientId || clientId.trim() === '') {
            throw new HttpException('Client ID is required and cannot be empty', HttpStatus.BAD_REQUEST);
        }

        try {
            const stats = await this.dashboardService.getClientDashboardStats(clientId);
            return stats;
        } catch (error) {
            if (error.message.includes('No dashboard stats found')) {
                throw new HttpException(`No dashboard stats found for client ${clientId}`, HttpStatus.NOT_FOUND);
            }
            throw new HttpException(
                `Failed to fetch dashboard stats for client ${clientId}: ${error.message}`,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    @Get('check-today-stats')
    async checkTodayStats(): Promise<{ hasTodayStats: boolean }> {
        try {
            const hasStats = await this.dashboardService.checkTodayStats();
            return { hasTodayStats: hasStats };
        } catch (error) {
            Logger.error(`Failed to check today's stats`);
            throw new Error(`Failed to check today's stats`);
        }
    }
}
