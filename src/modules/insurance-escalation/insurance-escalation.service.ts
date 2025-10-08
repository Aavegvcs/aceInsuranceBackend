import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EscalationDetails } from './entities/escalation-details.entity';
import { Repository } from 'typeorm';
import { EscalationCase } from './entities/escalation-case.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import {  RoleId } from 'src/utils/app.utils';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { TicketNotificationService } from './ticket-notification-service';

@Injectable()
export class InsuranceEscalationService {
    constructor(
        @InjectRepository(EscalationDetails)
        private readonly escalationRepo: Repository<EscalationDetails>,

        @InjectRepository(EscalationCase)
        private readonly caseRepo: Repository<EscalationCase>,

        private readonly loggedInsUserService: LoggedInsUserService,

        @InjectRepository(User) private readonly userRepo: Repository<User>,

        @InjectRepository(InsuranceTicket)
        private readonly ticketRepo: Repository<InsuranceTicket>,

        private readonly notificationService: TicketNotificationService
    ) {}

    async createEscalationCase(ticket: InsuranceTicket, userEntity: User) {
        try {
            const escalationCases = new EscalationCase();
            escalationCases.caseStatus = 'pending';
            escalationCases.ticket = ticket;
            escalationCases.ticketNumber = ticket.ticketNumber;
            escalationCases.createdBy = userEntity;
            escalationCases.createdAt = new Date();
            const result = await this.caseRepo.save(escalationCases);
            return {
                status: 'success',
                message: 'Escalation case created successfully',
                data: null
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async createEscalationDetails(body: any, req: any): Promise<any> {
        try {
            const {
                caseId,
                isProductSuggested,
                suggestedProduct,
                whyNotSuggestedReason,
                gotResponseFromCustomer,
                responseFromCustomer,
                responseReceivedOn
            } = body;

            const loggedInUser = await this.loggedInsUserService.getCurrentUser();

            const caseEntity = await this.caseRepo.findOne({
                where: { id: caseId },
                relations: ['ticket']
            });

            if (!caseEntity) {
                throw new Error('Case not found');
            }

            const { ticket } = caseEntity;
            if (!ticket) {
                throw new Error('Ticket not found');
            }

            const escalation = this.escalationRepo.create({
                case: caseEntity,
                isProductSuggested,
                suggestedProduct,
                whyNotSuggestedReason,
                gotResponseFromCustomer,
                responseReceivedOn,
                responseFromCustomer,
                createdBy: loggedInUser,
                createdAt: new Date()
            });

            // Update case status to in-progress by default
            caseEntity.caseStatus = 'inprogress';

            // Escalation conditions
            if (!isProductSuggested) {
                escalation.notifiedToHigherStaff = true;
                escalation.reasonNotified = 'Agent failed to suggest product or inform client';
                escalation.escalatedOn = new Date();
                caseEntity.caseStatus = 'closed';
            }

            if (isProductSuggested && gotResponseFromCustomer === false) {
                escalation.needTeleCall = true;
            }

            const result = await this.escalationRepo.save(escalation);
            if (result) {
                await this.caseRepo.save(caseEntity);
            }

            // Notify Product Heads if needed
            if (!isProductSuggested) {
                const productHeads = await this.userRepo.find({
                    where: {
                        isActive: true,
                        userType: {
                            id: RoleId.productHead
                        },
                        branch: {
                            id: ticket.branch.id
                        }
                    },
                    relations: ['userType', 'branch']
                });

                const message = `Ticket ${ticket.ticketNumber} Agent failed to suggest product or inform customer.`;

                await Promise.all(
                    productHeads.map((head) =>
                        this.notificationService.createAndSendEscalationNotification(
                            ticket,
                            'escalation',
                            head,
                            message,
                            ticket.currentStepStart,
                            ticket.nextStepStart,
                            loggedInUser,
                            ticket.nextStepDeadline
                        )
                    )
                );
            }

            return {
                status: 'success',
                message: 'Escalation details created successfully',
                data: null
            };
        } catch (error) {
            throw new Error(error.message || 'An error occurred while creating escalation details');
        }
    }

    async getEscalationCase(body: any, req): Promise<any> {
        try {
            const { caseStatus, fromDate, toDate, currentPage, pageSize } = body;

            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser-------------------', loggedInUser);
            if (!loggedInUser) {
                throw new UnauthorizedException('User not logged in');
            }

            const query = 'call get_escalationCase(?, ?, ?, ?, ?, ?, ?)';
            const result = await this.caseRepo.query(query, [
                loggedInUser.userType.roleName,
                loggedInUser.id,
                caseStatus,
                fromDate,
                toDate,
                currentPage,
                pageSize
            ]);
            // console.log('get_escalationCase  in result-------------------', result[0]);

            return {
                status: 'success',
                message: 'Escalation case fetched successfully',
                data: result[0]
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    // this api get all cases for tellcaller to communicate customer
    async checkneedTeleCall(body: any, req): Promise<any> {
        try {
            const { caseId } = body;

            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser-------------------', loggedInUser);
            if (!loggedInUser) {
                throw new UnauthorizedException('User not logged in');
            }
            const escalationCase = await this.caseRepo.findOne({ where: { id: caseId } });
            console.log('escalationCase-------------------', escalationCase);
            if (!escalationCase) {
                throw new Error('Escalation Case not found');
            }
            const result = await this.escalationRepo
                .createQueryBuilder('escalation')
                .select('escalation.needTeleCall')
                .where('escalation.case = :caseId', { caseId })
                .getOne();
            console.log('result of tellicaller ', result);
            return {
                status: 'success',
                message: 'Escalation case fetched successfully',
                data: result
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async updateTelliCommEscalationDetails(body: any, req: any): Promise<any> {
        try {
            const { caseId, toldOtherProducts, reasonNotified } = body;

            const caseEntity = await this.caseRepo.findOne({
                where: { id: caseId },
                relations: ['ticket']
            });
            // console.log('case id is ---------------', caseEntity);
            if (!caseEntity) {
                throw new Error('Case not found');
            }
            if (caseEntity.caseStatus === 'closed') {
                return {
                    status: 'error',
                    message: 'Can not update. Escalation already closed',
                    data: null
                };
            }

            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser in proposer', loggedInUser.id);
            // console.log('ticket id in update telli', caseEntity.ticket);

            const ticket = await this.ticketRepo.findOne({ where: { id: caseEntity.ticket.id }, relations: ['branch'] });

            if (!ticket) {
                throw new Error('Ticket not found');
            }
            const query = 'call update_telliCommEscalation(?, ?, ?)';

            const result = await this.caseRepo.query(query, [caseId, toldOtherProducts, reasonNotified]);
            if (result[0][0].status === 1) {
                if (!toldOtherProducts) {
                    // sendNotificationToManager(caseEntity); // optional external logic

                    const productHeads = await this.userRepo.find({
                        where: {
                            isActive: true,
                            userType: {
                                id: RoleId.productHead
                            },
                            branch: {
                                id: ticket.branch.id
                            }
                        },
                        relations: ['userType', 'branch']
                    });
                    //   console.log("in sclation service product head", productHeads)
                    for (const head of productHeads) {
                        const message = `Ticket ${ticket.ticketNumber} Agent is not suggest any product to customer.`;
                        await this.notificationService.createAndSendEscalationNotification(
                            ticket,
                            'Telecommunication',
                            head,
                            message,
                            ticket.currentStepStart,
                            ticket.nextStepStart,
                            loggedInUser,
                            ticket.nextStepDeadline
                        );
                    }
                }
                return {
                    status: 'success',
                    message: 'Escalation details updated successfully',
                    data: null
                };
            } else {
                return {
                    status: 'error',
                    message: 'Escalation details not updated',
                    data: null
                };
            }
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getEscalationDetails(body: any, req): Promise<any> {
        try {
            const { caseStatus, fromDate, toDate, currentPage, pageSize } = body;

            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser-------------------', loggedInUser);
            // console.log('other details-------------------', caseStatus, currentPage, pageSize);
            if (!loggedInUser) {
                throw new UnauthorizedException('User not logged in');
            }

            const query = 'call get_escalationDetails(?, ?, ?, ?)';
            const result = await this.caseRepo.query(query, [
                loggedInUser.id,
                caseStatus,
                // fromDate,
                // toDate,
                currentPage,
                pageSize
            ]);
            //  console.log('result-------------------', result[0]);

            return {
                status: 'success',
                message: 'Escalation case fetched successfully',
                data: result[0]
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getEscalationDetailsByCaseId(caseId: any, reqBody: any): Promise<any> {
        try {
            // const { caseId } = body;

            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser-------------------', loggedInUser);
            // console.log('other details-------------------', caseStatus, currentPage, pageSize);
            if (!loggedInUser) {
                throw new UnauthorizedException('User not logged in');
            }

            const query = 'call get_escalationDetailsByCaseId(?)';
            const result = await this.caseRepo.query(query, [caseId]);
            //  console.log('result-------------------', result[0]);

            return {
                status: 'success',
                message: 'Escalation case fetched successfully',
                data: {
                    caseId: result[0][0].caseId,
                    caseStatus: result[0][0].caseStatus,
                    ticketNumber: result[0][0].ticketNumber,
                    createdAt: result[0][0].createdAt,
                    ticketId: result[0][0].ticketId,
                    escalationDetailsId: result[0][0].escalationDetailsId,
                    isProductSuggested: result[0][0].isProductSuggested,
                    suggestedProduct: result[0][0].suggestedProduct,
                    whyNotSuggestedReason: result[0][0].whyNotSuggestedReason,
                    gotResponseFromCustomer: result[0][0].gotResponseFromCustomer,
                    responseFromCustomer: result[0][0].responseFromCustomer,
                    responseReceivedOn: result[0][0].responseReceivedOn,
                    notifiedToHigherStaff: result[0][0].notifiedToHigherStaff,
                    reasonNotified: result[0][0].reasonNotified,
                    needTeleCall: result[0][0].needTeleCall,
                    escalatedOn: result[0][0].escalatedOn
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async updateEscalation(body: any, req: any): Promise<any> {
        try {
            const { caseId, isProductSuggested, gotResponseFromCustomer, responseFromCustomer, responseReceivedOn } =
                body;

            const loggedInUser = await this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser in proposer', loggedInUser.id);

            const caseEntity = await this.caseRepo.findOne({
                where: { id: caseId },
                relations: ['ticket']
            });
            if (!caseEntity) {
                throw new Error('Case not found');
            }

            const existingEscalation = await this.escalationRepo.findOne({
                where: { case: { id: caseId } }
            });

            if (!existingEscalation) {
                throw new Error('Escalation details not found for this case');
            }

            existingEscalation.gotResponseFromCustomer = gotResponseFromCustomer;
            existingEscalation.responseFromCustomer = responseFromCustomer;
            existingEscalation.responseReceivedOn = responseReceivedOn;
            if (existingEscalation.isProductSuggested && gotResponseFromCustomer === false) {
                existingEscalation.needTeleCall = true;
            }

            const result = await this.escalationRepo.save(existingEscalation);

            return {
                status: 'success',
                message: 'Escalation updated successfully',
                data: result
            };
        } catch (error) {
            throw new Error(error.message || 'Something went wrong');
        }
    }
    
}
