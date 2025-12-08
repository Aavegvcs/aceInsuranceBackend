import { AuthModule } from '@modules/auth/auth.module';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { UserModule } from '@modules/user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceFeaturesService } from './insurance-features.service';
import { InsuranceFeaturesController } from './insurance-features.controller';
import { InsuranceFeatures } from './entities/insurance-features.entity';
import { ProductFeatures } from './entities/product-features.entity';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { User } from '@modules/user/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([InsuranceFeatures, ProductFeatures, InsuranceTypeMaster, User]),
        forwardRef(() => UserModule),
        forwardRef(() => AuthModule)
    ],
    controllers: [InsuranceFeaturesController],
    providers: [InsuranceFeaturesService, LoggedInsUserService],
    exports: [InsuranceFeaturesService]
})
export class InsuranceFeaturesModule {}
