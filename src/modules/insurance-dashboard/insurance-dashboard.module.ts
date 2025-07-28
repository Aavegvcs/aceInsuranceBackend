import { UserModule } from '@modules/user/user.module';
import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceDashboardService } from './insurance-dashboard.service';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { InsuranceDashboardController } from './insurance-dashboard.controller';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
@Module({
    imports: [
        TypeOrmModule.forFeature([
            User,
            InsuranceTicket,
            
        ]),
        forwardRef(() => UserModule),
    ],
    controllers: [InsuranceDashboardController],
    providers: [
        InsuranceDashboardService,
        LoggedInsUserService,
    ],
    exports: [InsuranceDashboardService]
})
export class InsuranceDashboardModule {}
