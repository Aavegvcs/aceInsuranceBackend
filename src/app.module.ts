import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { CorsMiddleware } from './middlewares/cors.middleware';
import { ReferenceModule } from './modules/reference/reference.module';
import { ClientDetailsMiddleware } from './middlewares/clientDetails.middleware';
import { DecryptDataMiddleware } from './middlewares/decrypt.middleware';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EncryptionInterceptor } from './interceptors/encrypt.interceptor';
import { GlobalExceptionFilter } from './filters/exception.filter';
import { EmailModule } from './modules/email/email.module';
import { MediaModule } from './modules/media/media.module';
import { AddressModule } from './modules/address/address.module';
import { CompanyModule } from './modules/company/company.module';
import { RoleModule } from './modules/role/role.module';
import { UserRoleModule } from './modules/user-role/user-role.module';
import { typeOrmAsyncConfig } from './config/typeorm.config';
import { CheckDtTableMiddleware } from './middlewares/dtTables.middleware';
import * as bodyParser from 'body-parser';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CountriesModule } from './modules/countries/countries.module';
import { StatesModule } from './modules/states/states.module';
import { CitiesModule } from './modules/cities/cities.module';
import { AwsModule } from './modules/aws/aws.module';
import { DepartmentModule } from '@modules/department/department.module';
import { BranchModule } from '@modules/branch/branch.module';
import { InsuranceProductModule } from '@modules/insurance-product/insurance-product-module';
import { InsuranceTicketModule } from '@modules/insurance-ticket/insurance-ticket.module';
import { EmployeeModule } from '@modules/employee/employee.module';
const cookieParser = require('cookie-parser')();
import { InsuranceQuotationModule } from '@modules/insurance-quotations/insurance-quotation.module';
import { InsuranceRolePermissionModule } from '@modules/insurance-role-permission/insurance-role-permission.module';
import { BullModule } from '@nestjs/bull';
import { InsuranceEscalationModule } from '@modules/insurance-escalation/insurance-escalation.module';
import { InsuranceDashboardModule } from '@modules/insurance-dashboard/insurance-dashboard.module';
import Redis from 'ioredis';
import { RedisModule } from '@modules/redis/redis.module';
import { InsurancePolicyModule } from '@modules/insurance-policy/insurance-policy.module';
@Module({
    imports: [
        AwsModule,
        UserModule,
        ReferenceModule,
        AuthModule,
        ConfigModule.forRoot({
            isGlobal: true
        }),
        TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
        EmailModule,
        DepartmentModule,
        MediaModule,
        BranchModule,
        AddressModule,
        CompanyModule,
        RoleModule,
        UserRoleModule,
        EventEmitterModule.forRoot(),
        CountriesModule,
        StatesModule,
        CitiesModule,
        InsuranceProductModule,
        InsuranceTicketModule,
        EmployeeModule,
        InsuranceQuotationModule,
        InsuranceRolePermissionModule,
        InsurancePolicyModule,

        BullModule.forRoot({
            redis: {
                host: process.env.REDIS_HOST,
                port: 6379
            }
        }),
        InsuranceEscalationModule,
        InsuranceDashboardModule,
        RedisModule
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_INTERCEPTOR,
            useClass: EncryptionInterceptor
        },
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter
        }
    ]
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(CorsMiddleware).forRoutes('*');
        consumer.apply(DecryptDataMiddleware).forRoutes('*');
        consumer.apply(cookieParser).forRoutes('*');
        consumer.apply(bodyParser.json()).forRoutes('*');
        consumer.apply(ClientDetailsMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
        consumer.apply(CheckDtTableMiddleware).forRoutes({ path: '*', method: RequestMethod.POST });
    }
}
