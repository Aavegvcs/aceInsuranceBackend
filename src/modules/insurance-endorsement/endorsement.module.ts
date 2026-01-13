import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/user/user.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { EndorsementService } from './endorsement.service';
import { EndorsementController } from './endorsement.controller';
import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { InsuranceEndorsementField } from './entities/insurance-endorsement-field.entity';
import { InsuranceEndorsement } from './entities/insurance-endorsement.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, InsuranceTicket,InsurancePolicy, InsuranceTypeMaster, InsuranceEndorsementField, InsuranceEndorsement]),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule)
    ],
    controllers: [EndorsementController],
    providers: [EndorsementService, LoggedInsUserService],
    exports: [EndorsementService]
})
export class EndorsementModule {}