import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule],
    controllers: [EmailController],
    providers: [EmailService],
    exports: [EmailService]
})
export class EmailModule {}
