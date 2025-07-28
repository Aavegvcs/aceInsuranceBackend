// src/modules/imports/reports/report.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ReportLogs } from './entities/report-logs.entity';
import { RiskReport } from './entities/risk-report.entity';
import { ClientModule } from '@modules/client/client.module';
import { BranchModule } from '@modules/branch/branch.module';
import { EmployeeModule } from '@modules/employee/employee.module';
import { DashboardModule } from '@modules/dashboard/dashboard.module';
import { BullModule } from '@nestjs/bull';
import { ReportProcessor } from './report.processor';
import { LogModule } from '@modules/log/log.module';
import { NotificationModule } from '@modules/notification/notification.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([RiskReport, ReportLogs]),
        forwardRef(() => ClientModule), // Imports ClientService and its dependencies
        forwardRef(() => BranchModule), // Imports BranchService
        forwardRef(() => EmployeeModule), // Imports EmployeeeService
        forwardRef(() => DashboardModule), // Imports DashboardService
        forwardRef(()=> LogModule), // Imports LogService
        forwardRef(() => NotificationModule), // Imports NotificationService
        BullModule.registerQueue({
            name: 'report-processing',
        })
    ],
    controllers: [ReportController],
    providers: [ReportService,ReportProcessor], // Only local services
    exports: [ReportService],
})
export class ReportModule { }