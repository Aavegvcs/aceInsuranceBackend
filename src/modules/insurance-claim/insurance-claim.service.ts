import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InsuranceClaim } from './entities/insurance-claim.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { Claim_Status } from 'src/utils/app.utils';
import { InsuranceClaimLogs } from './entities/insurance-claim-logs.entity';

@Injectable()
export class InsuranceClaimService {
    constructor(
        @InjectRepository(InsurancePolicy)
        private readonly _policyRepo: Repository<InsurancePolicy>,

        @InjectRepository(InsuranceClaim)
        private readonly _claimRepo: Repository<InsuranceClaim>,

        @InjectRepository(InsuranceClaimLogs)
        private readonly _claimLogsRepo: Repository<InsuranceClaimLogs>,

        private readonly loggedInsUserService: LoggedInsUserService
    ) {}

    async createClaim(reqBody: any): Promise<any> {
        try {
            const { policyId, incidentDate, incidentPlace, incidentDescription, claimType, claimAmount } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();

            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 404, null, null, 'insurance-claim/createClaim');
            }
            const policy = await this._policyRepo.findOne({
                where: { id: policyId },
                relations: ['insuranceProduct', 'insuranceUser']
            });
            if (!policy) {
                return standardResponse(false, 'Policy not found', 404, null, null, 'insurance-claim/createClaim');
            }
            // existing claim code
            const existingClaim = await this._claimRepo.findOne({
                where: { policy: { id: policy.id } },
                order: { createdAt: 'DESC' }
            });
            if (existingClaim) {
                if (existingClaim.status !== Claim_Status.CLOSED && existingClaim.status !== Claim_Status.REJECTED) {
                    return standardResponse(
                        false,
                        'A claim is already in proccess',
                        409,
                        null,
                        null,
                        'insurance-claim/createClaim'
                    );
                }
            }
            // check waiting period
            const currentDate = new Date();
            const startDate = new Date(policy.startDate);
            const waitingDays = policy.insuranceProduct.waitingPeriods ?? 0;
            const waitingDate = new Date(startDate);
            waitingDate.setDate(waitingDate.getDate() + waitingDays);

            if (waitingDate > currentDate) {
                return standardResponse(
                    false,
                    'Waiting period is not completed',
                    409,
                    null,
                    null,
                    'insurance-claim/createClaim'
                );
            }
            // check if policy is not mutured
            // end of code policy not mutured

            const newClaim = this._claimRepo.create({
                policy: policy,
                policyNumber: policy.policyNumber,
                insuranceUser: policy.insuranceUser,
                incidentDate: incidentDate,
                incidentPlace: incidentPlace,
                incidentDescription: incidentDescription,
                claimType: claimType,
                status: Claim_Status.REGISTERED,
                claimAmount: claimAmount,
                createdBy: userEntity
            });
            // Save to DB
            const result = await this._claimRepo.save(newClaim);

            if (result) {
                // here log history will be created
                const result2 = await this.createClaimLogs(
                    result,
                    policy.policyNumber,
                    Claim_Status.REGISTERED,
                    Claim_Status.REGISTERED,
                    'New claim created',
                    userEntity
                );
                if (result2) {
                    return standardResponse(
                        true,
                        'Claim is created & logs is created',
                        201,
                        null,
                        null,
                        'insurance-claim/createClaim'
                    );
                } else {
                    console.log(
                        'api- insurance-claim/createClaim-,  Claim is created but logs is created. policyId is: ',
                        policy.policyNumber
                    );

                    return standardResponse(
                        false,
                        'Claim is created but logs is created',
                        202,
                        null,
                        null,
                        'insurance-claim/createClaim'
                    );
                }
            } else {
                console.log(
                    'api- insurance-claim/createClaim-,  Failed to created claim. policyId is: ',
                    policy.policyNumber
                );

                return standardResponse(
                    false,
                    'Failed to created claim',
                    500,
                    null,
                    null,
                    'insurance-claim/createClaim'
                );
            }
        } catch (error) {
            console.log('-api- createPlicy', error.message);
            return standardResponse(false, error.message, 501, null, null, 'insurance-claim/createClaim');
        }
    }
    // this is function
    async createClaimLogs(
        claim: any,
        policyNumber: any,
        previousStatus: any,
        newStatus: any,
        remarks: any,
        createdBy: any
    ): Promise<any> {
        const newLogs = {
            claimId: claim.id,
            policyNumber: policyNumber,
            previousStatus: previousStatus,
            newStatus: newStatus,
            remarks: remarks,
            createdBy: createdBy.id,
            createdAt: new Date()
        };
        try {
            const logsParam = this._claimLogsRepo.create({
                claim: claim,
                policyNumber: policyNumber,
                previousStatus: previousStatus,
                newStatus: newStatus,
                logDetails: newLogs,
                createdBy: createdBy,
                createdAt: new Date()
            });

            return await this._claimLogsRepo.save(logsParam);
        } catch (error) {
            console.log('api- insurance-claim/createClaim-,  Failed to created claim. policyId is: ', policyNumber);
            return null;
        }
    }

    async getAllClaims(reqObj: any): Promise<any> {
        let res = null;
        try {
            const { policyNumber, mobileNumber, claimId, startDate, endDate, pageNo, pageSize } = reqObj;   

            const query = 'CALL get_allClaims(?, ?, ?, ?, ?, ?, ?)';

            const result = await this._policyRepo.query(query, [
                claimId,
                policyNumber,
                mobileNumber,
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
                'insurance-claim/getAllClaims'
            );
        } catch (error) {
            console.log('-api: insurance-claim/getAllClaims ', error.message);

            res = standardResponse(
                false,
                'data fetch successfully',
                500,
                null,
                error.message,
                'insurance-claim/getAllClaims'
            );
        }

        return res;
    }
}
