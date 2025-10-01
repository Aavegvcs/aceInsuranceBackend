import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Repository } from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsurancePolicyRenewalHistory } from './entities/insurance-policy-renewal-history.entity';
import { Insurance_Type, Policy_Status, Ticket_Type } from 'src/utils/app.utils';
import { standardResponse } from 'src/utils/helper/response.helper';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';

@Injectable()
export class InsurancePolicyService {
    constructor(
        @InjectRepository(InsurancePolicy)
        private readonly _policyRepo: Repository<InsurancePolicy>,

        @InjectRepository(InsuranceTicket)
        private readonly _ticketRepo: Repository<InsuranceTicket>,

        @InjectRepository(InsurancePolicyRenewalHistory)
        private readonly _policyHistoryRepo: Repository<InsurancePolicyRenewalHistory>,

        private readonly loggedInsUserService: LoggedInsUserService
    ) {}

    // async createPolicy(
    //     ticketId: any,
    //     policyNumber: any,
    //     createdBy: any,
    //     startPolicyDate: any,
    //     endPolicyDate: any
    // ): Promise<any> {
    //     try {
    //         // const { ticketId, policyNumber, createdBy } = reqBody;
    //         // Load ticket along with product and its insuranceCompany
    //         const ticket = await this._ticketRepo.findOne({
    //             where: { id: ticketId },
    //             relations: ['selectedProduct', 'selectedProduct.insuranceCompanyId', 'insuranceUserId'] // nested relation
    //         });

    //         if (!ticket) {
    //             throw new Error(`Ticket with id ${ticketId} not found`);
    //         }

    //         const prevPolicy = await this._policyRepo.findOne({
    //             where: { policyNumber: policyNumber }
    //         });

    //         if (ticket.ticketType === Ticket_Type.FRESH) {
    //             // Prepare policy object
    //             if (prevPolicy) {
    //                 return {
    //                     status: false,
    //                     message: 'policy already created with number',
    //                     data: null
    //                 };
    //             }
    //             const policy = this._policyRepo.create({
    //                 originalTicket: ticket,
    //                 currentTicket: ticket,
    //                 insuranceUser: ticket.insuranceUserId, // assuming ticket already has insuranceUser relation
    //                 insuranceCompany: ticket.selectedProduct.insuranceCompanyId, // from product relation
    //                 insuranceProduct: ticket.selectedProduct, // directly from ticket
    //                 policyNumber: policyNumber,
    //                 policyType: ticket.insuranceType,
    //                 sumAssured: ticket.selectedCoveraged,
    //                 premiumAmount: ticket.SelectedPremium,
    //                 isRenewal: false,
    //                 renewedDate: null,
    //                 startDate: startPolicyDate,
    //                 endDate: endPolicyDate,
    //                 status: Policy_Status.Active,
    //                 createdBy: createdBy
    //             });
    //             // Save to DB
    //             const result = await this._policyRepo.save(policy);
    //             console.log('in insurance policy new policy id---', result.id);

    //             if (result) {
    //                 const history = this._policyHistoryRepo.create({
    //                     policy: { id: result.id }, // only reference, no need to fetch full
    //                     originalTicket: ticket,
    //                     previousTicket: null,
    //                     currentTicket: ticket,
    //                     oldStartDate: null,
    //                     oldEndDate: null,
    //                     newStartDate: startPolicyDate,
    //                     newEndDate: endPolicyDate,
    //                     previousPremiumAmount: null,
    //                     currentPremiumAmount: ticket.SelectedPremium,
    //                     previousCoveragedAmount: null,
    //                     currentCoveragedAmount: ticket.selectedCoveraged,
    //                     renewalDate: ticket.policyEndDate,
    //                     createdBy: createdBy,
    //                     createdAt: new Date()
    //                 });

    //                 const result2 = await this._policyHistoryRepo.save(history);

    //                 if (result2) {
    //                     return {
    //                         status: true,
    //                         message: 'Policy created successfully & created policy history',
    //                         data: result
    //                     };
    //                 } else {
    //                     return {
    //                         status: false,
    //                         message: 'policy created & failed to created policy history',
    //                         data: null
    //                     };
    //                 }
    //             } else {
    //                 return {
    //                     status: false,
    //                     message: 'failed! to create policy',
    //                     data: null
    //                 };
    //             }
    //         }

    //         if (ticket.ticketType === Ticket_Type.RENEWAL) {
    //             if (!prevPolicy) {
    //                 return {
    //                     status: false,
    //                     message: 'failed! there are no existing policy',
    //                     data: null
    //                 };
    //             }
    //             // Capture old values BEFORE overwrite
    //             const oldStartDate = prevPolicy.startDate;
    //             const oldEndDate = prevPolicy.endDate;
    //             const previousPremiumAmount = prevPolicy.premiumAmount;
    //             const previousCoveragedAmount = prevPolicy.sumAssured;
    //             const previousTicket = prevPolicy.currentTicket;
    //             // in this logic is need to be change - 09-09-2025:
    //             //1. if health then create new policy
    //             //2. if moter then also create new policy
    //             //3. if life then update policy
    //             (prevPolicy.sumAssured = ticket.selectedCoveraged),
    //                 (prevPolicy.premiumAmount = ticket.SelectedPremium),
    //                 (prevPolicy.currentTicket = ticket),
    //                 (prevPolicy.updatedAt = new Date()),
    //                 (prevPolicy.updatedBy = createdBy),
    //                 (prevPolicy.startDate = startPolicyDate),
    //                 (prevPolicy.endDate = endPolicyDate),
    //                 (prevPolicy.isRenewal = true),
    //                 (prevPolicy.renewedDate = new Date()),
    //                 (prevPolicy.status = Policy_Status.Active);
    //             const result = await this._policyRepo.save(prevPolicy);

    //             if (result) {
    //                 const history = this._policyHistoryRepo.create({
    //                     policy: { id: prevPolicy.id }, // only reference, no need to fetch full
    //                     originalTicket: prevPolicy.originalTicket || null,
    //                     previousTicket: previousTicket,
    //                     currentTicket: ticket,
    //                     oldStartDate: oldStartDate,
    //                     oldEndDate: oldEndDate,
    //                     newStartDate: startPolicyDate,
    //                     newEndDate: endPolicyDate,
    //                     previousPremiumAmount: previousPremiumAmount,
    //                     currentPremiumAmount: ticket.SelectedPremium,
    //                     previousCoveragedAmount: previousCoveragedAmount,
    //                     currentCoveragedAmount: ticket.selectedCoveraged,
    //                     renewalDate: ticket.policyEndDate,
    //                     createdBy: createdBy,
    //                     createdAt: new Date()
    //                 });

    //                 const result2 = await this._policyHistoryRepo.save(history);

    //                 if (result2) {
    //                     return {
    //                         status: true,
    //                         message: 'policy updated & history created',
    //                         data: null
    //                     };
    //                 } else {
    //                     return {
    //                         status: false,
    //                         message: 'policy updated & failed to created policy history',
    //                         data: null
    //                     };
    //                 }
    //             } else {
    //                 return {
    //                     status: false,
    //                     message: 'failed! policy not updated',
    //                     data: null
    //                 };
    //             }
    //         }
    //         if (ticket.ticketType === Ticket_Type.PORT) {
    //             // here port type policy logic is write....
    //         }
    //     } catch (error) {
    //         console.log('-api- createPlicy', error.message);
    //         return {
    //             status: false,
    //             message: 'failed to created policy',
    //             data: null
    //         };
    //     }
    // }

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

        return res;
    }

    async getInsurancePolicyDetails(policyId: any): Promise<any> {
        let res = null;

        try {
            const userEntity = await this.loggedInsUserService.getCurrentUser();

            if (!userEntity) {
                return standardResponse(
                    false,
                    'Logged user not found',
                    404,
                    null,
                    null,
                    'insurance-policy/getInsurancePolicyDetails'
                );
            }
            // console.log('in backend policy id ', policyId);

            const policy = await this._policyRepo.findOne({ where: { id: policyId } });
            if (!policy) {
                return standardResponse(
                    false,
                    'failed! policy not exists',
                    404,
                    null,
                    null,
                    'insurance-policy/getInsurancePolicyDetails'
                );
            }
            // console.log("here is backe3n ", policyId, policy.policyType);

            const query = 'CALL get_insurancePolicyDetails(?, ?)';

            const result = await this._policyRepo.query(query, [policyId, policy.policyType]);
            const policyDetails = result[0][0];
            // console.log('policy details 1', policyDetails);

            if (policyDetails.claimProcess) {
                try {
                    policyDetails.claimProcess = JSON.parse(policyDetails.claimProcess);
                } catch (e) {
                    policyDetails.claimProcess = {}; // fallback if invalid JSON
                }
            }

            // console.log("policy details 2", policyDetails);

            // return result[0];
            res = standardResponse(
                true,
                'data fetch successfully',
                200,
                policyDetails,
                null,
                'insurance-policy/getInsurancePolicyDetails'
            );
        } catch (error) {
            res = standardResponse(
                false,
                'data fetch successfully',
                500,
                null,
                error,
                'insurance-policy/getInsurancePolicyDetails'
            );
        }

        return res;
    }

    async createPolicy(
        ticketId: any,
        policyNumber: any,
        createdBy: any,
        startPolicyDate: any,
        endPolicyDate: any
    ): Promise<any> {
        try {
            // Load ticket with relations
            const ticket = await this._ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['selectedProduct', 'selectedProduct.insuranceCompanyId', 'insuranceUserId']
            });

            if (!ticket) {
                throw new Error(`Ticket with id ${ticketId} not found`);
            }

            const prevPolicy = await this._policyRepo.findOne({
                where: { policyNumber: policyNumber },
                relations: ['currentTicket', 'originalTicket']
            });

            // ------------------- NEW POLICY CREATION ------------------- //
            if (ticket.ticketType === Ticket_Type.FRESH) {
                if (prevPolicy) {
                    return { status: false, message: 'Policy already created with this number', data: null };
                }

                const newPolicy = this._policyRepo.create({
                    originalTicket: ticket,
                    currentTicket: ticket,
                    insuranceUser: ticket.insuranceUserId,
                    insuranceCompany: ticket.selectedProduct.insuranceCompanyId,
                    insuranceProduct: ticket.selectedProduct,
                    policyNumber: policyNumber,
                    policyType: ticket.insuranceType,
                    sumAssured: ticket.selectedCoveraged,
                    premiumAmount: ticket.SelectedPremium,
                    isRenewal: false,
                    startDate: startPolicyDate,
                    endDate: endPolicyDate,
                    status: Policy_Status.Active,
                    createdBy: createdBy
                });

                const result = await this._policyRepo.save(newPolicy);

                if (result) {
                    await this.createPolicyHistory(
                        result.id,
                        policyNumber,
                        null,
                        ticket,
                        null,
                        ticket,
                        null,
                        null,
                        null,
                        startPolicyDate,
                        endPolicyDate,
                        null,
                        ticket.SelectedPremium,
                        null,
                        ticket.selectedCoveraged,
                        ticket.policyEndDate,
                        createdBy
                    );
                    return { status: true, message: 'Policy created successfully', data: result };
                }
                return { status: false, message: 'Failed to create policy', data: null };
            }

            // ------------------- RENEWAL LOGIC ------------------- //
            if (ticket.ticketType === Ticket_Type.RENEWAL) {
                if (!prevPolicy) {
                    return { status: false, message: 'No existing policy found for renewal', data: null };
                }

                const insuranceType = ticket.insuranceType; // e.g. HEALTH, MOTOR, LIFE

                // For Health & Motor -> Create new policy
                if (insuranceType === Insurance_Type.Health || insuranceType === Insurance_Type.Motor) {
                    const newPolicy = this._policyRepo.create({
                        originalTicket: prevPolicy.originalTicket || prevPolicy.currentTicket,
                        currentTicket: ticket,
                        insuranceUser: ticket.insuranceUserId,
                        insuranceCompany: ticket.selectedProduct.insuranceCompanyId,
                        insuranceProduct: ticket.selectedProduct,
                        policyNumber: policyNumber,
                        previousPolicyNumber: prevPolicy.policyNumber,
                        policyType: insuranceType,
                        sumAssured: ticket.selectedCoveraged,
                        premiumAmount: ticket.SelectedPremium,
                        isRenewal: true,
                        renewedDate: new Date(),
                        startDate: startPolicyDate,
                        endDate: endPolicyDate,
                        status: Policy_Status.Active,
                        createdBy: createdBy
                    });

                    const result = await this._policyRepo.save(newPolicy);

                    if (result) {
                        await this.createPolicyHistory(
                            result.id,
                            policyNumber,
                            prevPolicy.policyNumber,
                            ticket,
                            prevPolicy.currentTicket,
                            ticket,
                            prevPolicy.startDate,
                            prevPolicy.endDate,
                            prevPolicy.premiumAmount,
                            startPolicyDate,
                            endPolicyDate,
                            prevPolicy.sumAssured,
                            ticket.SelectedPremium,
                            prevPolicy.sumAssured,
                            ticket.selectedCoveraged,
                            ticket.policyEndDate,
                            createdBy
                        );
                        return { status: true, message: 'New policy created for renewal', data: result };
                    }
                    return { status: false, message: 'Failed to create new policy on renewal', data: null };
                }

                // For Life -> Update existing policy
                if (insuranceType === Insurance_Type.Life) {
                    const oldStartDate = prevPolicy.startDate;
                    const oldEndDate = prevPolicy.endDate;
                    const previousPremiumAmount = prevPolicy.premiumAmount;
                    const previousCoveragedAmount = prevPolicy.sumAssured;
                    const previousTicket = prevPolicy.currentTicket;

                    prevPolicy.sumAssured = ticket.selectedCoveraged;
                    prevPolicy.premiumAmount = ticket.SelectedPremium;
                    prevPolicy.currentTicket = ticket;
                    prevPolicy.updatedAt = new Date();
                    prevPolicy.updatedBy = createdBy;
                    prevPolicy.startDate = startPolicyDate;
                    prevPolicy.endDate = endPolicyDate;
                    prevPolicy.isRenewal = true;
                    prevPolicy.renewedDate = new Date();
                    prevPolicy.status = Policy_Status.Active;

                    const result = await this._policyRepo.save(prevPolicy);

                    if (result) {
                        await this.createPolicyHistory(
                            prevPolicy.id,
                            policyNumber,
                            prevPolicy.previousPolicyNumber,
                            ticket,
                            previousTicket,
                            ticket,
                            oldStartDate,
                            oldEndDate,
                            previousPremiumAmount,
                            startPolicyDate,
                            endPolicyDate,
                            previousCoveragedAmount,
                            ticket.SelectedPremium,
                            previousCoveragedAmount,
                            ticket.selectedCoveraged,
                            ticket.policyEndDate,
                            createdBy
                        );
                        return { status: true, message: 'Life policy updated successfully', data: result };
                    }
                    return { status: false, message: 'Failed to update life policy', data: null };
                }
            }

            // ------------------- PORT LOGIC ------------------- //
            if (ticket.ticketType === Ticket_Type.PORT) {
                // TODO: Port logic implementation if required
            }

            return { status: false, message: 'Invalid ticket type', data: null };
        } catch (error) {
            console.error('Error in createPolicy:', error.message);
            return { status: false, message: 'Failed to create policy', data: null };
        }
    }

    // ------------------- POLICY HISTORY CREATION ------------------- //
    private async createPolicyHistory(
        policyId: number,
        policyNumber:any,
        prevPolicyNumber:any,
        ticket: any,
        previousTicket: any,
        currentTicket: any,
        oldStartDate: any,
        oldEndDate: any,
        previousPremiumAmount: any,
        newStartDate: any,
        newEndDate: any,
        previousCoveragedAmount: any,
        currentPremiumAmount: any,
        prevCoverage: any,
        currCoverage: any,
        renewalDate: any,
        createdBy: any
    ) {
        const history = this._policyHistoryRepo.create({
            policy: { id: policyId },
            originalTicket: ticket,
            policyNumber:policyNumber,
            previousPolicyNumber: prevPolicyNumber,
            previousTicket: previousTicket,
            currentTicket: currentTicket,
            oldStartDate: oldStartDate,
            oldEndDate: oldEndDate,
            newStartDate: newStartDate,
            newEndDate: newEndDate,
            previousPremiumAmount: previousPremiumAmount,
            currentPremiumAmount: currentPremiumAmount,
            previousCoveragedAmount: previousCoveragedAmount,
            currentCoveragedAmount: currCoverage,
            renewalDate: renewalDate,
            createdBy: createdBy,
            createdAt: new Date()
        });

        return await this._policyHistoryRepo.save(history);
    }
}
