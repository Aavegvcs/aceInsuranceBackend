import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Log } from './entities/log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Features } from 'src/utils/app.utils';
import { UserService } from '../user/user.service';
import { QueueLog } from './entities/queue-log.entity';

@Injectable()
export class LogService {
    constructor(
        @InjectRepository(Log)
        private logRepository: Repository<Log>,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        @InjectRepository(QueueLog)
        private queueLogRepository: Repository<QueueLog>,
    ) {}

    async saveLogByRef(refDetails, feature: Features, event: string, req: any): Promise<Log> {
        // Create a new log entry with refId and refTypeId populated
        const log = new Log();
        log.refId = refDetails.id; // Set the refId with the newly created user's id

        // Fix error by fetching reference entity instead of hardcoded number

        log.logEvent = `${feature}_${event}`;

        if (req.CLIENT_INFO) log.ipDetails = req.CLIENT_INFO;
        if (req.user) {
            const dbUser = await this.userService.findOneByEmail(req.user.email);
            if (dbUser) log.createdBy = dbUser.id;
        }

        const savedLog = await this.logRepository.save(log);

        // Save the log entry to the database
        return savedLog;
    }

    async saveQueueLog(
        job: { id: string; name: string; queueName: string },
        event: string,
        details?: string,
    ): Promise<QueueLog> {
        const log = new QueueLog();
        log.jobId = job.id;
        log.queueName = job.queueName;
        log.jobName = job.name;
        log.logEvent = `QUEUE_${event}`;
        log.logDetails = details || null;

        return this.queueLogRepository.save(log);
    }
}
