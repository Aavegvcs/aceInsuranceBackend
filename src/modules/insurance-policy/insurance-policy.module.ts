import { forwardRef, Module } from '@nestjs/common';
import { InsurancePolicyController } from './insurance-policy.controller';
import { InsurancePolicyService } from './insurance-policy.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/user/user.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsurancePolicyRenewalHistory } from './entities/insurance-policy-renewal-history.entity';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([InsurancePolicy, User, InsuranceTicket, InsurancePolicyRenewalHistory, InsuranceTypeMaster]),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule)
    ],
    controllers: [InsurancePolicyController],
    providers: [InsurancePolicyService, LoggedInsUserService],
    exports: [InsurancePolicyService]
})
export class InsurancePolicyModule {}
