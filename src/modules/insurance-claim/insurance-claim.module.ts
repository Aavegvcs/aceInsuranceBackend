import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceClaimController } from './insurance-claim.controller';
import { InsuranceClaimService } from './insurance-claim.service';
import { InsuranceClaim } from './entities/insurance-claim.entity';
import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { InsuranceClaimLogs } from './entities/insurance-claim-logs.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import { User } from '@modules/user/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            InsuranceClaim,
            InsurancePolicy,
            InsuranceClaimLogs,
            InsuranceUser,
            User
        ]),
         forwardRef(() => UserModule),
         forwardRef(() => AuthModule)
    ],
    controllers: [InsuranceClaimController],
    providers: [InsuranceClaimService, LoggedInsUserService],
    exports: [InsuranceClaimService]
})
export class InsuranceClaimModule {}
