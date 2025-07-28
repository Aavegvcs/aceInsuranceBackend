import { Module, forwardRef } from '@nestjs/common';
import { LogService } from './log.service';
import { LogController } from './log.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from './entities/log.entity';
import { UserModule } from '../user/user.module';
import { QueueLog } from './entities/queue-log.entity';

@Module({
    imports: [forwardRef(() => UserModule), TypeOrmModule.forFeature([Log,QueueLog])],
    controllers: [LogController],
    providers: [LogService],
    exports: [LogService]
})
export class LogModule {}
