import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '@modules/user/user.entity';
import { UserModule } from '@modules/user/user.module';
import { Branch } from '@modules/branch/entities/branch.entity';
import { forwardRef, Module } from '@nestjs/common';
import { InsuranceEscalationService } from './insurance-escalation.service';
import { InsuranceEscalationController } from './insurance-escalation.controller';
import { TicketNotificationService } from './ticket-notification-service';
import { BullModule } from '@nestjs/bull';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsuranceTicketNotification } from './entities/insurance-ticket-notification.entity';
import { InsuranceTicketDeviation } from './entities/insurance-notification-deviation.entity';
import { TicketNotificationProcessor } from './ticket.-notification-processor';
import { InsuranceTicketService } from '@modules/insurance-ticket/insurance-ticket.service';
import { InsuranceAssignedTo } from '@modules/insurance-ticket/entities/insurance-ticket-assignedTo.entity';
import { EmailService } from '@modules/email/email.service';
import { EscalationCase } from './entities/escalation-case.entity';
import { EscalationDetails } from './entities/escalation-details.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { EmailModule } from '@modules/email/email.module';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Branch,
            User,
            InsuranceTicket,
            InsuranceTicketNotification,
            InsuranceTicketDeviation,
            InsuranceAssignedTo,
            EscalationDetails,
            EscalationCase,
            
        ]),
        forwardRef(() => EmailModule),
        forwardRef(() => UserModule),
        HttpModule,
        BullModule.registerQueue({ name: 'ticketNotificationQueue' })
    ],
    controllers: [InsuranceEscalationController],
    providers: [
        InsuranceEscalationService,
        TicketNotificationService,
        TicketNotificationProcessor,
        EmailService,
        LoggedInsUserService
        
    ],
    exports: [InsuranceEscalationService, TicketNotificationService]
})
export class InsuranceEscalationModule {}
