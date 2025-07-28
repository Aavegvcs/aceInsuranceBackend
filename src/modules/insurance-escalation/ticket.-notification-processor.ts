import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { TicketNotificationService } from './ticket-notification-service';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceTicketNotification } from './entities/insurance-ticket-notification.entity';
import { addDays, addHours, Current_Step, formatToCamelCase, Roles } from 'src/utils/app.utils';
import { InsuranceTicketDeviation } from './entities/insurance-notification-deviation.entity';
import { insuranceTicketNotification } from 'src/utils/email-templates/insurance-notification/insurance-ticket-notification';
import { InternalServerErrorException } from '@nestjs/common';
import { title } from 'process';
import { EmailService } from '@modules/email/email.service';
import { InsuranceEscalationService } from './insurance-escalation.service';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';

@Processor('ticketNotificationQueue')
export class TicketNotificationProcessor {
    constructor(
        @InjectRepository(InsuranceTicket) private readonly ticketRepo: Repository<InsuranceTicket>,
        @InjectRepository(User) private readonly userRepo: Repository<User>,

        @InjectRepository(InsuranceTicketNotification)
        private readonly notificationRepo: Repository<InsuranceTicketNotification>,

        private readonly notificationService: TicketNotificationService,
        // private readonly _ticketService: InsuranceTicketService,
        @InjectRepository(InsuranceTicketDeviation)
        private readonly _deviationRepo: Repository<InsuranceTicketDeviation>,
        private emailService: EmailService,
        private escalationService: InsuranceEscalationService,
        private readonly loggedInsUserService: LoggedInsUserService
    ) {}

    @Process('sendDeadlineNotification')
    async handleSendDeadlineNotification(job: Job) {
        try {
            console.log('in notification processor??????????????????????????');
            const { ticketId } = job.data;
            const now = new Date();
            const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
            if (ticket && ticket.currentStepStart !== Current_Step.CLOSED && ticket.nextStepDeadline <= now) {
                const managers = await this.userRepo.find({
                    where: { userType: Roles.insuranceManager, status: 'active', company: { id: 2 } }
                });
                // console.log('in notification processor', managers);

                const existingDeviation = await this._deviationRepo.findOne({
                    where: { ticket: { id: ticketId } }
                });
                if (existingDeviation) {
                    existingDeviation.deviationLevel = 'first';
                    existingDeviation.deviationDeadline = new Date(now.getTime() + 60000);
                    existingDeviation.step = ticket.currentStepStart;
                    await this._deviationRepo.save(existingDeviation);
                } else {
                    const deviation = new InsuranceTicketDeviation();
                    deviation.ticket = ticket;
                    deviation.deviationLevel = 'first';
                    deviation.deviationDeadline = new Date(now.getTime() + 60000);
                    deviation.step = ticket.currentStepStart;
                    await this._deviationRepo.save(deviation);
                }

                for (const manager of managers) {
                    const message = `Ticket ${ticket.ticketNumber} has exceeded its deadline. Please take action.`;
                    await this.createAndSendNotification(
                        ticket,
                        'deadline_exceeded',
                        manager,
                        message,
                        ticket.currentStepStart,
                        ticket.nextStepStart,
                        ticket.nextStepDeadline
                    );
                }
                // const escalationTime = new Date(now.getTime() + 3600000); // 1 hour later 3600000
                // const escalationTime = new Date(now.getTime() + 120000); // 1 hour later 3600000
                 const escalationTime = addHours(1); // 1 hour later 3600000               
                await this.notificationService.scheduleEscalationNotification(
                    ticketId,
                    ticket.currentStepStart,
                    escalationTime
                );
            }
        } catch (err) {
            console.log('in process err is->', err.message);
        }
    }

    @Process('sendEscalationNotification')
    async handleSendEscalationNotification(job: Job) {
        const { ticketId } = job.data;
        console.log('in escalations system', ticketId);
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        const now = new Date();
        if (ticket && ticket.currentStepStart !== Current_Step.CLOSED) {
            const deviation = await this._deviationRepo.findOne({
                where: {
                    ticket: { id: ticketId },
                    deviationLevel: 'first',
                    isResolved: false,
                    deviationDeadline: LessThan(new Date())
                }
            });
            console.log('in esc deviation->', deviation);
            if (deviation) {
                const productHeads = await this.userRepo.find({
                    where: { userType: Roles.productHead, status: 'active', company: { id: 2 } }
                });
                //   console.log("in sclation service product head", productHeads)
                for (const head of productHeads) {
                    const message = `Ticket ${ticket.ticketNumber} has not been resolved after initial notification. Escalating to product head.`;
                    await this.createAndSendNotification(
                        ticket,
                        'escalation',
                        head,
                        message,
                        ticket.currentStepStart,
                        ticket.nextStepStart,
                        ticket.nextStepDeadline
                    );
                }
                // const updatedDeviation = await this._deviationRepo.update(deviation.id, {
                //     deviationLevel: 'second',
                //     updatedAt: new Date(),
                // });
                await this._deviationRepo.update(deviation.id, {
                    deviationLevel: 'second',
                    updatedAt: new Date()
                });
            }
        }
    }

    async createAndSendNotification(
        ticket: InsuranceTicket,
        type: string,
        recipient: User,
        message: string,
        currentStepStart: Current_Step,
        nextStepStart: Current_Step,
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
        if (exceededDeadline) {
            notification.exceededDeadline = exceededDeadline;
        }
        const systemUser = await this.userRepo.findOne({ where: { email: 'system@example.com' } });
        notification.createdBy = systemUser;
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

    @Process('createEscalationCase')
    async handleScheduleEscalationCase(job: Job) {
        const { ticketId, userEntity } = job.data;
        console.log('in createEscalationCase proposer', ticketId);
          const loggedInUser = this.loggedInsUserService.getCurrentUser();
        // console.log('loggedInUser in proposer', userEntity.id);
          
        const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
        const now = new Date();
        // console.log('in escalations system', ticket.currentStepStart);
        if (ticket && ticket.currentStepStart === Current_Step.CLOSED) {
            // console.log('in escalations system ticket closed', ticket.currentStepStart);
            await this.escalationService.createEscalationCase(ticket,userEntity);
        }
    }

}
