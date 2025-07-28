import { Module, forwardRef } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { AuthModule } from '../auth/auth.module';
import { LogModule } from '../log/log.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { MediaModule } from '../media/media.module';
import { AddressModule } from '../address/address.module';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';

@Module({
    imports: [
        AuthModule,
        AddressModule,
        MediaModule,
        LogModule,
        forwardRef(() => UserModule),
        TypeOrmModule.forFeature([Company, User])
    ],
    controllers: [CompanyController],
    providers: [CompanyService],
    exports: [CompanyService]
})
export class CompanyModule {}
