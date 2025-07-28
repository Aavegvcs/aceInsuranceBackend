import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ReportService } from './report.service';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { DashboardService } from '@modules/dashboard/dashboard.service';
import { EmployeeService } from '@modules/employee/employee.service';
import { LogService } from '@modules/log/log.service';
import { NotificationService } from '@modules/notification/notification.service';
import { ClientService } from '@modules/client/client.service';

@Processor('report-processing')
export class ReportProcessor {
    private readonly logger = new Logger(ReportProcessor.name);

    constructor(
        private readonly reportService: ReportService,
        private readonly dashboardService: DashboardService,
        private readonly employeeService: EmployeeService,
        private readonly clientService: ClientService,
        private readonly notificationService: NotificationService,
        @Inject(forwardRef(() => LogService))
        private readonly logService: LogService,
    ) { }

    @Process('update-not-traded-days')
    async handleUpdateNotTradedDays(job: Job): Promise<void> {
        try {
            await this.clientService.updateNotTradedDays();
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'UPDATE_NOT_TRADED_DAYS_SUCCESS',
                `Updated for ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
            );
            this.logger.log(`Job ${job.id} completed successfully`);
        } catch (error) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'UPDATE_NOT_TRADED_DAYS_FAILED',
                error.message,
            );
            throw error;
        }
    }

    @Process('update-client-summary')
    async handleUpdateClientSummary(job: Job): Promise<any> {
        try {
            const result = await this.reportService.updateClientSummaryIncrementally();
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'UPDATE_CLIENT_SUMMARY_SUCCESS',
            );
            return result;
        } catch (error) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'UPDATE_CLIENT_SUMMARY_FAILED',
                error.message,
            );
            throw error;
        }
    }

    @Process('create-client-dashboard-stats')
    async handleCreateClientDashboardStats(job: Job): Promise<any> {
        try {
            const result = await this.dashboardService.generateClientDashboardStatsForAll();

            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'CREATE_CLIENT_DASHBOARD_STATS_SUCCESS',
            );
            return result;
        } catch (error) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'CREATE_CLIENT_DASHBOARD_STATS_FAILED',
                error.message,
            );
            throw error;
        }
    }

    @Process('create-dealer-revenue')
    async handleCreateDealerRevenue(job: Job): Promise<void> {
        try {
            const { tradeDate } = job.data;
            await this.employeeService.calculateDealerRevenue();
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'CREATE_DEALER_REVENUE_SUCCESS',
                `Trade date: ${tradeDate}`,
            );
        } catch (error) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'CREATE_DEALER_REVENUE_FAILED',
                error.message,
            );
            throw error;
        }
    }

    @Process('create-client-mail-report')
    async handleCreateClientMailReport(job: Job): Promise<void> {
        try {
            const clientId = job.data?.clientId;
            const date = job.data?.date;

            await this.reportService.createClientMailReport(date, clientId);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'CREATE_CLIENT_MAIL_REPORT_SUCCESS',
            );
            this.logger.log(`Job ${job.id} completed successfully`);
        } catch (error) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'report-processing' },
                'CREATE_CLIENT_MAIL_REPORT_FAILED',
                error.message,
            );
            throw error;
        }
    }

    @Process('send-client-mail-report')
    async handleSendClientMailReport(job: Job): Promise<void> {
        this.logger.log(`Job ${job.id} started`);
        try {
            await this.notificationService.sendClientDashboardReport({ ...job.data });
            await this.logService
                .saveQueueLog(
                    { id: String(job.id), name: job.name, queueName: 'mail-queue' },
                    'SEND_CLIENT_MAIL_REPORT_SUCCESS',
                )
        }
        catch (error) {
            this.logger.error(`Job ${job.id} failed: ${error.message}`);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'mail-queue' },
                'SEND_CLIENT_MAIL_REPORT_FAILED',
                error.message,
            );
            throw error;
        }
    }
}
