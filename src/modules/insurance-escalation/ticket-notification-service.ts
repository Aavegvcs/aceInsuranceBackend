import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { InsuranceTicketDeviation } from './entities/insurance-notification-deviation.entity';
import { LessThan, Repository } from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { Console } from 'console';
import { InsuranceTicketNotification } from './entities/insurance-ticket-notification.entity';
import { InternalServiceError } from '@aws-sdk/client-secrets-manager';
import { User } from '@modules/user/user.entity';
import { Current_Step, formatToCamelCase } from 'src/utils/app.utils';
import { EmailService } from '@modules/email/email.service';
import { insuranceTicketNotification } from 'src/utils/email-templates/insurance-notification/insurance-ticket-notification';

@Injectable()
export class TicketNotificationService {
    constructor(
        @InjectQueue('ticketNotificationQueue') private readonly queue: Queue,
        @InjectRepository(InsuranceTicketDeviation)
        private readonly _deviationRepo: Repository<InsuranceTicketDeviation>,

        @InjectRepository(InsuranceTicket)
        private readonly ticketRepo: Repository<InsuranceTicket>,

        @InjectRepository(InsuranceTicketNotification)
        private readonly notificationRepo: Repository<InsuranceTicketNotification>,

        private emailService: EmailService,
        @InjectRepository(User) private readonly userRepo: Repository<User>
    ) {}

    async scheduleDeadlineNotification(ticketId: number, stepName, deadline: Date) {
        const actualNow = new Date();

        const delay = deadline.getTime() - actualNow.getTime();
        const stepJobId = `deadline-${stepName}-${ticketId}`;
        const existingJob = await this.queue.getJob(stepJobId);

        if (existingJob) {
            await existingJob.remove(); // reschedule if needed
        }

        if (delay > 0) {
            console.log('before jon');
            const ress = await this.queue.add(
                'sendDeadlineNotification',
                // { ticketId:ticketId },
                { ticketId: ticketId, step: stepName },
                {
                    // jobId: `deadline-${ticketId}`,
                    jobId: stepJobId,
                    delay: delay,
                    removeOnComplete: true,
                    removeOnFail: true
                }
            );
            // console.log('ressssssss->', ress);
        } else {
            await this.queue.add(
                'sendDeadlineNotification',
                { ticketId: ticketId, step: stepName },
                {
                    jobId: stepJobId,
                    removeOnComplete: true,
                    removeOnFail: true
                }
            );
        }
        return { success: true, message: 'Notification scheduled successfully' };
    }

    async scheduleEscalationNotification(ticketId: number, stepName, escalationTime: Date) {
        const delay = escalationTime.getTime() - Date.now();
        const stepJobId = `escalation-${stepName}-${ticketId}`;
        const existingJob = await this.queue.getJob(stepJobId);

        if (existingJob) {
            await existingJob.remove(); // reschedule if needed
        }
        if (delay > 0) {
            await this.queue.add(
                'sendEscalationNotification',
                { ticketId: ticketId, step: stepName },
                {
                    jobId: stepJobId,
                    delay: delay,
                    removeOnComplete: true,
                    removeOnFail: true
                }
            );
        } else {
            await this.queue.add(
                'sendEscalationNotification',
                { ticketId: ticketId, step: stepName },
                {
                    jobId: stepJobId,
                    removeOnComplete: true,
                    removeOnFail: true
                }
            );
        }
    }

    async checkRediss(data: any) {
        const { id } = data;

        const ticket = await this.ticketRepo.findOne({ where: { id: 18 } });
        const deviation = await this._deviationRepo.findOne({
            where: {
                ticket: { id: 18 }
                //    deviationLevel: 'first',
                //    isResolved: false,
                //    deviationDeadline: LessThan(new Date())
            }
        });
        console.log('deviation', deviation);
        console.log(new Date());
    }

    async getNotificationForDashboard(reqBody: any, req: any): Promise<any> {
        const query = 'CALL get_notificationForDashboard(?)';
        const result = await this.notificationRepo.query(query, [reqBody.userId]);
        return result[0];
    }

    async markAllReadNotification(reqBody: any, req: any): Promise<any> {
        try {
            const response = await this.notificationRepo.update(
                { recipient: reqBody.userId, isRead: false },
                { isRead: true }
            );
            console.log('response', response);
            return {
                statusCode: 200,
                message: 'Notification marked as read',
                data: null
            };
        } catch (err) {
            console.log('Error in markAllReadNotification', err.message);
            throw new InternalServerErrorException('Internal server error');
        }
    }

    async scheduleEscalationCase(ticketId: number, stepName, deadline: Date, userEntity) {
        const actualNow = new Date();

        const delay = deadline.getTime() - actualNow.getTime();
        console.log('in schedule escalation cases', delay);
        const stepJobId = `escalationcasedeadline-${stepName}-${ticketId}`;
        const existingJob = await this.queue.getJob(stepJobId);

        if (existingJob) {
            await existingJob.remove(); // reschedule if needed
        }

        if (delay > 0) {
            const ress = await this.queue.add(
                'createEscalationCase',
                // { ticketId:ticketId },
                { ticketId: ticketId, step: stepName, userEntity: userEntity },
                {
                    jobId: stepJobId,
                    delay: delay,
                    removeOnComplete: true,
                    removeOnFail: true
                }
            );
        } else {
            await this.queue.add(
                'createEscalationCase',
                { ticketId: ticketId, step: stepName },
                {
                    jobId: stepJobId,
                    removeOnComplete: true,
                    removeOnFail: true
                }
            );
        }
        return { success: true, message: 'escalation created successfully' };
    }

    async createAndSendEscalationNotification(
        ticket: InsuranceTicket,
        type: string,
        recipient: User,
        message: string,
        currentStepStart: Current_Step,
        nextStepStart: Current_Step,
        loggedInUser: any,
        exceededDeadline?: Date
    ) {
        // console.log('in create and send notification');
        const notification = new InsuranceTicketNotification();
        notification.ticket = ticket;
        notification.type = type;
        notification.recipient = recipient;
        notification.message = message;
        notification.sentAt = new Date();
        notification.currentStep = currentStepStart;
        notification.nextStep = nextStepStart;
        notification.createdBy = loggedInUser;
        if (exceededDeadline) {
            notification.exceededDeadline = exceededDeadline;
        }
        // const systemUser = await this.userRepo.findOne({ where: { email: 'system@example.com' } });
        // notification.createdBy = systemUser;
        await this.notificationRepo.save(notification);
        // Assume email service integration: await this.emailService.sendEmail(recipient.email, message);
        const formateType = formatToCamelCase(type);
        const title = formateType + ' Ticket No- ' + ticket.ticketNumber;
        // console.log('title', title);

        let htmlContent = insuranceTicketNotification(recipient.email, title, message, recipient.firstName);
        const mailedData = await this.emailService.sendEmail(recipient.email, title, htmlContent);
        // console.log('mailedData', mailedData);

        if (!mailedData) {
            throw new InternalServerErrorException('Email not sent');
        }
    }
}
