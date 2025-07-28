import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from './entities/client.entity';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { UserModule } from '@modules/user/user.module';
import { BranchModule } from '@modules/branch/branch.module';
import { User } from '@modules/user/user.entity';
import { TechexcelModule } from '@modules/techexcel/techexcel.module';
import { ClientProfitLossEquity } from './entities/client-pl-equity.entity';
import { ClientProfitLossCommodity } from './entities/client-pl-commodity.entity';
import { ClientSummary } from './entities/client-summary.entity';
import { ReportModule } from '@modules/report/report.module';
import { UserRole } from '@modules/user-role/entities/user-role.entity';
import { ClientPdfService } from './client-pdf.service';
import { HttpModule } from '@nestjs/axios';
import { Dealer } from '@modules/employee/entities/dealer.entity';
import { Employee } from '@modules/employee/entities/employee.entity';
import { Branch } from '@modules/branch/entities/branch.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Client,
            User,
            ClientProfitLossEquity,
            ClientProfitLossCommodity,
            ClientSummary,
            UserRole,
            Dealer,
            Employee,
            Branch
        ]),
        HttpModule,
        forwardRef(() => UserModule),
        forwardRef(() => BranchModule),
        forwardRef(() => TechexcelModule),
        forwardRef(() => ReportModule)
    ],
    controllers: [ClientController],
    providers: [ClientService, ClientPdfService],
    exports: [ClientService]
})
export class ClientModule { }
