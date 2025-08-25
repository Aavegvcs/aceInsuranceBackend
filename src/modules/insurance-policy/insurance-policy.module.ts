import { Module } from "@nestjs/common";
import { InsurancePolicyController } from "./insurance-policy.controller";
import { InsurancePolicyService } from "./insurance-policy.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@modules/user/user.entity";
import { InsuranceTicket } from "@modules/insurance-ticket/entities/insurance-ticket.entity";
import { InsurancePolicyRenewalHistory } from "./entities/insurance-policy-renewal-history.entity";
import { InsurancePolicy } from "./entities/insurance-policy.entity";

@Module({
    imports:[
        TypeOrmModule.forFeature([
            InsurancePolicy,
            User, 
            InsuranceTicket, 
            InsurancePolicyRenewalHistory
        ])
    ],
    controllers:[InsurancePolicyController],
    providers:[InsurancePolicyService],
    exports:[InsurancePolicyService]

})

export class InsurancePolicyModule{}