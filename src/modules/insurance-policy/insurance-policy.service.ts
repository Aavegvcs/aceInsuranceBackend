import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Repository } from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsurancePolicyRenewalHistory } from './entities/insurance-policy-renewal-history.entity';
import { Policy_Status, Ticket_Type } from 'src/utils/app.utils';
import { standardResponse } from 'src/utils/helper/response.helper';

@Injectable()
export class InsurancePolicyService {
    constructor(
        @InjectRepository(InsurancePolicy)
        private readonly _policyRepo: Repository<InsurancePolicy>,

        @InjectRepository(InsuranceTicket)
        private readonly _ticketRepo: Repository<InsuranceTicket>,

        @InjectRepository(InsurancePolicyRenewalHistory)
        private readonly _policyHistoryRepo: Repository<InsurancePolicyRenewalHistory>
    ) {}

    async createPolicy(
        ticketId: any,
        policyNumber: any,
        createdBy: any,
        startPolicyDate: any,
        endPolicyDate: any
    ): Promise<any> {
        try {
            // const { ticketId, policyNumber, createdBy } = reqBody;
            // Load ticket along with product and its insuranceCompany
            const ticket = await this._ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['selectedProduct', 'selectedProduct.insuranceCompanyId', 'insuranceUserId'] // nested relation
            });

            if (!ticket) {
                throw new Error(`Ticket with id ${ticketId} not found`);
            }

            const prevPolicy = await this._policyRepo.findOne({
                where: { policyNumber: policyNumber }
            });
            console.log('in create policy -----', prevPolicy, policyNumber, createdBy, startPolicyDate, endPolicyDate);
            console.log('in create policy ticket details---', ticket);

            if (ticket.ticketType === Ticket_Type.NEW) {
                // Prepare policy object
                if (prevPolicy) {
                    return {
                        status: false,
                        message: 'policy already created with number',
                        data: null
                    };
                }
                const policy = this._policyRepo.create({
                    originalTicket: ticket,
                    insuranceUser: ticket.insuranceUserId, // assuming ticket already has insuranceUser relation
                    insuranceCompany: ticket.selectedProduct.insuranceCompanyId, // from product relation
                    insuranceProduct: ticket.selectedProduct, // directly from ticket
                    policyNumber: policyNumber,
                    policyType: ticket.insuranceType,
                    sumAssured: ticket.selectedCoveraged,
                    premiumAmount: ticket.SelectedPremium,
                    isRenewal: false,
                    renewedDate: null,
                    startDate: startPolicyDate,
                    endDate: endPolicyDate,
                    status: Policy_Status.Active,
                    createdBy: createdBy
                });
                // Save to DB
                const result = await this._policyRepo.save(policy);
                console.log('in insurance policy new policy id---', result.id);

                if (result) {
                    const history = this._policyHistoryRepo.create({
                        policy: { id: result.id }, // only reference, no need to fetch full
                        originalTicket: ticket,
                        previousTicket: null,
                        currentTicket: ticket,
                        oldStartDate: null,
                        oldEndDate: null,
                        newStartDate: startPolicyDate,
                        newEndDate: endPolicyDate,
                        previousPremiumAmount: null,
                        currentPremiumAmount: ticket.SelectedPremium,
                        previousCoveragedAmount: null,
                        currentCoveragedAmount: ticket.selectedCoveraged,
                        renewalDate: ticket.policyEndDate,
                        createdBy: createdBy,
                        createdAt: new Date()
                    });

                    const result2 = await this._policyHistoryRepo.save(history);

                    if (result2) {
                        return {
                            status: true,
                            message: 'Policy created successfully & created policy history',
                            data: result
                        };
                    } else {
                        return {
                            status: false,
                            message: 'policy created & failed to created policy history',
                            data: null
                        };
                    }
                } else {
                    return {
                        status: false,
                        message: 'failed! to create policy',
                        data: null
                    };
                }
            }

            if (ticket.ticketType === Ticket_Type.RENEWAL) {
                if (!prevPolicy) {
                    return {
                        status: false,
                        message: 'failed! there are no existing policy',
                        data: null
                    };
                }
                // Capture old values BEFORE overwrite
                const oldStartDate = prevPolicy.startDate;
                const oldEndDate = prevPolicy.endDate;
                const previousPremiumAmount = prevPolicy.premiumAmount;
                const previousCoveragedAmount = prevPolicy.sumAssured;
                const previousTicket = prevPolicy.currentTicket;

                (prevPolicy.sumAssured = ticket.selectedCoveraged),
                    (prevPolicy.premiumAmount = ticket.SelectedPremium),
                    (prevPolicy.currentTicket = ticket),
                    (prevPolicy.updatedAt = new Date()),
                    (prevPolicy.updatedBy = createdBy),
                    (prevPolicy.startDate = startPolicyDate),
                    (prevPolicy.endDate = endPolicyDate),
                    (prevPolicy.isRenewal = true),
                    (prevPolicy.renewedDate = new Date()),
                    (prevPolicy.status = Policy_Status.Active);
                const result = await this._policyRepo.save(prevPolicy);

                if (result) {
                    const history = this._policyHistoryRepo.create({
                        policy: { id: prevPolicy.id }, // only reference, no need to fetch full
                        originalTicket: prevPolicy.originalTicket || null,
                        previousTicket: previousTicket,
                        currentTicket: ticket,
                        oldStartDate: oldStartDate,
                        oldEndDate: oldEndDate,
                        newStartDate: startPolicyDate,
                        newEndDate: endPolicyDate,
                        previousPremiumAmount: previousPremiumAmount,
                        currentPremiumAmount: ticket.SelectedPremium,
                        previousCoveragedAmount: previousCoveragedAmount,
                        currentCoveragedAmount: ticket.selectedCoveraged,
                        renewalDate: ticket.policyEndDate,
                        createdBy: createdBy,
                        createdAt: new Date()
                    });

                    const result2 = await this._policyHistoryRepo.save(history);

                    if (result2) {
                        return {
                            status: true,
                            message: 'policy updated & history created',
                            data: null
                        };
                    } else {
                        return {
                            status: false,
                            message: 'policy updated & failed to created policy history',
                            data: null
                        };
                    }
                } else {
                    return {
                        status: false,
                        message: 'failed! policy not updated',
                        data: null
                    };
                }
            }
            if (ticket.ticketType === Ticket_Type.PORT) {
                // here port type policy logic is write....
            }
        } catch (error) {
            console.log('-api- createPlicy', error.message);
            return {
                status: false,
                message: 'failed to created policy',
                data: null
            };
        }
    }

    // async addPolicyHistory(data: any) {
    //     try {
    //         const history = this._policyHistoryRepo.create({
    //                     policy: { id: prevPolicy.id }, // only reference, no need to fetch full
    //                     originalTicket: prevPolicy.originalTicket,
    //                     previousTicket: previousTicket,
    //                     currentTicket: ticket,
    //                     oldStartDate: oldStartDate,
    //                     oldEndDate: oldEndDate,
    //                     newStartDate: ticket.policyStartDate,
    //                     newEndDate: ticket.policyEndDate,
    //                     previousPremiumAmount: previousPremiumAmount,
    //                     currentPremiumAmount: ticket.SelectedPremium,
    //                     previousCoveragedAmount: previousCoveragedAmount,
    //                     currentCoveragedAmount: ticket.selectedCoveraged,
    //                     renewalDate: ticket.policyEndDate,
    //                     createdBy: createdBy,
    //                     createdAt: new Date()
    //                 });

    //                 const result2 = await this._policyHistoryRepo.save(history);
    //     } catch (error) {
    //         return {
    //             status: false,
    //             message: 'failed to created policy history',
    //             data: null
    //         };
    //     }
    // }

    async getInsurancePolicyCard(reqObj: any): Promise<any> {
        let res = null;
        try {
            const { policyNumber, mobileNumber, userName, startDate, endDate, pageNo, pageSize } = reqObj;

            const query = 'CALL get_insurancePolicyCard(?, ?, ?, ?, ?, ?, ?)';

            const result = await this._policyRepo.query(query, [
                policyNumber,
                mobileNumber,
                userName,
                startDate,
                endDate,
                pageNo,
                pageSize
            ]);
            console.log(result[0]);
            // return result[0];
            res = standardResponse(
                true,
                'data fetch successfully',
                200,
                result[0],
                null,
                'insurance-policy/getInsurancePolicyCard'
            );
        } catch (error) {
             res = standardResponse(
                false,
                'data fetch successfully',
                500,
                null,
                error,
                'insurance-policy/getInsurancePolicyCard'
            );
        }
        console.log("after every things happend😂😂😂😂😂😂");
        
        return res;
    }
}
