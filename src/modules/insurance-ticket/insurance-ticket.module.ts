import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceTicket } from './entities/insurance-ticket.entity';
import { InsuranceTicketController } from './insurance-ticket.controller';
import { InsuranceTicketService } from './insurance-ticket.service';
import { InsuranceAssignedTo } from './entities/insurance-ticket-assignedTo.entity';
import { InsuranceAgent } from '@modules/insurance-ticket/entities/insurance-agent.entity';
// import { Client } from '@modules/client/entities/client.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import { InsuranceTicketDocuments } from './entities/insurance-ticket-documents.entity';
import { InsuranceTicketLogs } from './entities/insurance-ticket-logs.entity';
import { ProposersMedical } from './entities/proposer-medical-details.entity';
import { InsuranceDependent } from './entities/insurance-dependent.entity';
import { DependentMedical } from './entities/dependent-medical-details.entity';
import { InsuredPerson } from './entities/insured-person.entity';
import { InsuredMedical } from './entities/insured-medical.entity';
import { InsuranceVehicleDetails } from './entities/insurance-vehicle-details.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { InsuranceTicketDeviation } from '@modules/insurance-escalation/entities/insurance-notification-deviation.entity';
import { InsuranceEscalationModule } from '@modules/insurance-escalation/insurance-escalation.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { QuoteEntity } from '@modules/insurance-quotations/entities/quote.entity';
import { RoleService } from '@modules/role/role.service';
import { RoleModule } from '@modules/role/role.module';
import { Role } from '@modules/role/entities/role.entity';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { InsurancePolicyService } from '@modules/insurance-policy/insurance-policy.service';
import { InsurancePolicyRenewalHistory } from '@modules/insurance-policy/entities/insurance-policy-renewal-history.entity';
import { InsuranceNominee } from './entities/insurance-nominee-details.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            InsuranceTicket,
            InsuranceAssignedTo,
            // Client,
            InsuranceAgent,
            Branch,
            User,
            InsuranceUser,
            InsuranceTicketDocuments,
            InsuranceTicketLogs,
            ProposersMedical,
            InsuranceDependent,
            DependentMedical,
            InsuredPerson,
            InsuredMedical,
            InsuranceVehicleDetails,
            InsuranceTicketDeviation,
            QuoteEntity,
            Role,
            InsuranceProduct,
            InsurancePolicy,
            InsurancePolicyRenewalHistory,
            InsuranceNominee
        ]),
        InsuranceEscalationModule,
        ScheduleModule.forRoot(),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule),
        forwardRef(() => RoleModule),
    ],
    controllers: [InsuranceTicketController],
    providers: [InsuranceTicketService, LoggedInsUserService, InsurancePolicyService],
    exports: [InsuranceTicketService]
})
export class InsuranceTicketModule {}
