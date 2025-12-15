import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceProduct } from './entities/insurance-product.entity';
import { InsuranceProductService } from './insurance-product.service';
import { forwardRef, Module } from '@nestjs/common';
import { Branch } from '@modules/branch/entities/branch.entity';
import { InsuranceSubType } from '../insurance-ticket/entities/insurance-subtype.entity';
import { InsuranceProductController } from './insurance-product-controller';
import { InsuranceCompanies } from '@modules/insurance-product/entities/insurance-companies.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import { InsuranceAgent } from '@modules/insurance-ticket/entities/insurance-agent.entity';
import { InsurancePurchasedProduct } from './entities/insurance-puchased-product.entity';
import { User } from '@modules/user/user.entity';
import { UserService } from '@modules/user/user.service';
import { UserModule } from '@modules/user/user.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { AuthModule } from '@modules/auth/auth.module';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsuranceTicketService } from '@modules/insurance-ticket/insurance-ticket.service';
import { InsuranceQuotationService } from '@modules/insurance-quotations/insurance-quotation.service';
import { CommonQuotationService } from '@modules/insurance-quotations/common-quotation.service';
import { InsuranceFeatures } from '@modules/insurance-features/entities/insurance-features.entity';
import { ProductFeatures } from '@modules/insurance-features/entities/product-features.entity';
import { ProductWaitingPeriod } from '@modules/insurance-features/entities/product-waiting-period.entity';
import { InsuranceWaitingPeriod } from '@modules/insurance-features/entities/insurance-waiting-period.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            InsuranceProduct,
            Branch,
            InsuranceCompanies,
            InsuranceSubType,
            InsuranceCompanies,
            InsuranceUser,
            InsuranceAgent,
            InsurancePurchasedProduct,
            User,
            InsuranceTypeMaster,
            InsuranceFeatures,
            InsuranceWaitingPeriod,
            ProductFeatures,
            ProductWaitingPeriod
        ]),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule)
    ],
    controllers: [InsuranceProductController],
    providers: [InsuranceProductService, LoggedInsUserService],
    exports: [InsuranceProductService]
})
export class InsuranceProductModule {}
