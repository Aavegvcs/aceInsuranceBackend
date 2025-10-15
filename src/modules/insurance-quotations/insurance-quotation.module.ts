import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceQuotationController } from './insurance-quotation.controller';
import { InsuranceQuotationService } from './insurance-quotation.service';
import { forwardRef, Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { InsuranceQuotation } from './entities/insurance-quotation.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceCompanies } from '@modules/insurance-product/entities/insurance-companies.entity';
import { QuoteEntity } from './entities/quote.entity';
import { CommonQuotationService } from './common-quotation.service';
import { InsuranceAssignedTo } from '@modules/insurance-ticket/entities/insurance-ticket-assignedTo.entity';
import { InsuranceEscalationModule } from '@modules/insurance-escalation/insurance-escalation.module';
import { ProductFeatures } from '@modules/insurance-features/entities/product-features.entity';
import { InsuranceFeatures } from '@modules/insurance-features/entities/insurance-features.entity';
import { UserModule } from '@modules/user/user.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { QuoteFeatures } from '@modules/insurance-features/entities/quote-features.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            InsuranceQuotation,
            InsuranceTicket,
            InsuranceCompanies,
            InsuranceProduct,
            QuoteEntity,
            User,
            ProductFeatures,
            InsuranceFeatures,
            QuoteFeatures
        ]),
        EmailModule,
        InsuranceEscalationModule,
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule)
    ],
    controllers: [InsuranceQuotationController],
    providers: [InsuranceQuotationService, CommonQuotationService, LoggedInsUserService],
    exports: [InsuranceQuotationService, CommonQuotationService]
})
export class InsuranceQuotationModule {}
