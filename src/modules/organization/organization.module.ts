import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { AuthModule } from '../auth/auth.module';
import { LogModule } from '../log/log.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { MediaModule } from '../media/media.module';
import { AddressModule } from '../address/address.module';
@Module({
    imports: [AuthModule, MediaModule, AddressModule, LogModule, TypeOrmModule.forFeature([Organization])],
    controllers: [OrganizationController],
    providers: [OrganizationService],
    exports: [OrganizationService]
})
export class OrganizationModule {}
