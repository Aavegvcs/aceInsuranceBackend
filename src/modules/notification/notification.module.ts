import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { EmailModule } from '../email/email.module';
import { BullModule } from '@nestjs/bull';
@Module({
    imports: [EmailModule,
    BullModule.registerQueue({
      name: 'emailQueue',
    }),
    ],
    controllers: [],
    providers: [NotificationService],
    exports: [NotificationService]
})
export class NotificationModule {}
