import { Process, Processor } from "@nestjs/bull";
import { DashboardService } from "./dashboard.service";
import { LogService } from "@modules/log/log.service";
import { Logger } from "@nestjs/common";
import { Job } from "bull";
import { BranchService } from "@modules/branch/branch.service";
import * as moment from 'moment';
import 'moment-timezone';

@Processor("dashboard-processor")
export class DashboardProcessor {
    constructor(
        private readonly dashboardService: DashboardService,
        private readonly branchService: BranchService,
        private readonly logService: LogService,
    ) { }

    @Process('create-branch-dashboard-stats')
    async handleCreateBranchDashboardStats(job: Job<{ date?: string; isLastDate?: boolean }>): Promise<any> {
        Logger.log(`Processing job ${job.id}`);
        try {
            // Extract date and isLastDate from job data, default to today if not provided
            const istDate = job.data.date
                ? moment.tz(job.data.date, 'YYYY-MM-DD', 'Asia/Kolkata').toDate()
                : moment().tz('Asia/Kolkata').subtract(1, 'days').toDate();
            const isLastDate = job.data.isLastDate || false;

            // Call service methods with the specified date
            const result = await this.dashboardService.computeDailyStats(istDate);
            await this.branchService.computeDailyBranchStats(istDate, isLastDate);

            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'dashboard-processor' },
                'CREATE_BRANCH_DASHBOARD_STATS_SUCCESS',
            );
            return result;
        } catch (error) {
            Logger.error(`Job ${job.id} failed: ${error.message}`);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'dashboard-processor' },
                'CREATE_BRANCH_DASHBOARD_STATS_FAILED',
                error.message,
            );
            throw error;
        }
    }

    @Process('create-dealer-dashboard-stats')
    async handleCreateDealerDashboardStats(job: Job<{ date?: string; isLastDate?: boolean }>): Promise<any> {
        Logger.log(`Processing job ${job.id}`);
        try {
            // Extract date and isLastDate from job data, default to today if not provided
            const istDate = job.data.date
                ? moment.tz(job.data.date, 'YYYY-MM-DD', 'Asia/Kolkata').toDate()
                : moment().tz('Asia/Kolkata').subtract(1, 'days').toDate();

            // Call service methods with the specified date
            const result = await this.dashboardService.generateDailyDealerStatsForDate(istDate);

            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'dashboard-processor' },
                'CREATE_DEALER_DASHBOARD_STATS_SUCCESS',
            );
            return result;
        } catch (error) {
            Logger.error(`Job ${job.id} failed: ${error.message}`);
            await this.logService.saveQueueLog(
                { id: String(job.id), name: job.name, queueName: 'dashboard-processor' },
                'CREATE_DEALER_DASHBOARD_STATS_FAILED',
                error.message,
            );
            throw error;
        }
    }
}