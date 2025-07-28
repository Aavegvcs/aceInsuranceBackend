import { forwardRef, Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { BullModule } from '@nestjs/bull';
import { DashboardProcessor } from './dashboard.processor';
import { LogModule } from '@modules/log/log.module';
import { BranchModule } from '@modules/branch/branch.module';

@Module({
    imports: [
        LogModule,
        forwardRef(() => BranchModule), // Imports BranchService
        BullModule.registerQueue({
            name: "dashboard-processor",
        })
    ],
    providers: [DashboardService,DashboardProcessor],
    controllers: [DashboardController],
    exports: [DashboardService],
})
export class DashboardModule { }
