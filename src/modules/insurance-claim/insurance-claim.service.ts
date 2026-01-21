import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InsuranceClaim } from './entities/insurance-claim.entity';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { standardResponse } from 'src/utils/helper/response.helper';
import { Claim_Final_Status, Claim_Status } from 'src/utils/app.utils';
import { InsuranceClaimLogs } from './entities/insurance-claim-logs.entity';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { InsuranceSubType } from '@modules/insurance-ticket/entities/insurance-subtype.entity';
import { ClaimDocuments } from './entities/claim-documents.entity';

@Injectable()
export class InsuranceClaimService {
    constructor(
        @InjectRepository(InsurancePolicy)
        private readonly _policyRepo: Repository<InsurancePolicy>,

        @InjectRepository(InsuranceClaim)
        private readonly _claimRepo: Repository<InsuranceClaim>,

        @InjectRepository(InsuranceClaimLogs)
        private readonly _claimLogsRepo: Repository<InsuranceClaimLogs>,

        @InjectRepository(ClaimDocuments)
        private readonly _claimDocumentsRepo: Repository<ClaimDocuments>,
        @InjectRepository(InsuranceTypeMaster)
        private readonly _insuranceTypeMasterRepo: Repository<InsuranceTypeMaster>,

        @InjectRepository(InsuranceSubType)
        private readonly _insuranceSubTypeRepo: Repository<InsuranceSubType>,

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
                claimAmountRequested: claimAmount,
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
                        'api- insurance-claim/createClaim-,  Claim is created but logs is not created. policyId is: ',
                        policy.policyNumber
                    );

                    return standardResponse(
                        false,
                        'Claim is created but logs is not created',
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
            let existingLog = await this._claimLogsRepo.findOne({
                where: { claim: { id: claim.id } }
            });

            if (existingLog) {
                let logsArray = Array.isArray(existingLog.logDetails) ? existingLog.logDetails : [];
                logsArray.push(newLogs);

                existingLog.logDetails = logsArray;
                existingLog.previousStatus = previousStatus;
                existingLog.newStatus = newStatus;
                existingLog.updatedAt = new Date();
                existingLog.updatedBy = createdBy;
                return await this._claimLogsRepo.save(existingLog);
            } else {
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
            }
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

    async updateClaim(reqBody: any): Promise<any> {
        try {
            const { claimId, updatedRemarks, documents, isDocumentCollected } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();

            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 404);
            }

            const claim = await this._claimRepo.findOne({ where: { id: claimId } });
            if (!claim) {
                return standardResponse(false, 'Claim not found', 404);
            }

            // -------- Update claim data -------
            claim.documents = documents || claim.documents;
            claim.isDocumentCollected = isDocumentCollected;
            claim.updatedRemarks = updatedRemarks || claim.updatedRemarks;
            claim.updatedBy = userEntity;
            claim.updatedAt = new Date();

            // ----------------------------
            // Status change Logic
            // ----------------------------
            let oldStatus = claim.status;
            let newStatus = claim.status; // default → no change

            if (claim.status === Claim_Status.REGISTERED) {
                // ----- If docs uploaded but not marked as collected → PENDING ----------
                // console.log("console log 2--------: ", claim.status);
                if (documents?.length && !isDocumentCollected) {
                    // console.log("console log 3--------: ", claim.status);
                    newStatus = Claim_Status.PENDING;
                }
                // ----- If docs uploaded & collected → PROCESSED ----------
                if (isDocumentCollected) {
                    // console.log("console log 4--------: ", claim.status);
                    newStatus = Claim_Status.PROCESSED;
                }
            } else if (claim.status === Claim_Status.PENDING && isDocumentCollected) {
                // console.log("console log 5--------: ", claim.status);
                newStatus = Claim_Status.PROCESSED;
            }

            // ----- Update status if changed ---------
            if (newStatus !== oldStatus) {
                // console.log("console log 6--------: ", claim.status);
                claim.status = newStatus;
            }

            const result = await this._claimRepo.save(claim);

            // ---------- here is old logs start -------------
            if (result) {
                // here log history will be created
                // console.log("console log 7--------: ", claim.status);
                const result2 = await this.createClaimLogs(
                    result,
                    claim.policyNumber,
                    oldStatus,
                    newStatus,
                    'Claim Updated',
                    userEntity
                );
                if (result2) {
                    // console.log("console log 8--------: ", claim.status);
                    return standardResponse(
                        true,
                        'Claim is Updated & logs is created',
                        201,
                        null,
                        null,
                        'insurance-claim/updatedClaim'
                    );
                } else {
                    console.log(
                        'api- insurance-claim/updatedClaim-,  Claim is updated but logs is not created. claimId is: ',
                        claimId
                    );

                    return standardResponse(
                        false,
                        'Claim is updated but logs is not created',
                        202,
                        null,
                        null,
                        'insurance-claim/updatedClaim'
                    );
                }
            } else {
                console.log('api- insurance-claim/updatedClaim-,  Failed to updated claim. claimId is: ', claimId);

                return standardResponse(
                    false,
                    'Failed to updated claim',
                    500,
                    null,
                    null,
                    'insurance-claim/updatedClaim'
                );
            }

            // ---- here is old logs is end ---------------
        } catch (error) {
            console.error('Error in updateClaim:', error);
            return standardResponse(false, error.message, 500, null);
        }
    }

    async changeClaimStatus(reqBody: any): Promise<any> {
        try {
            const { claimId, status, remarks } = reqBody;
            console.log('in this change claim status service', reqBody);
            const userEntity = await this.loggedInsUserService.getCurrentUser();

            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 404);
            }

            const claim = await this._claimRepo.findOne({ where: { id: claimId } });
            if (!claim) {
                return standardResponse(false, 'Claim not found', 404);
            }

            const allowedStatuses = [
                // Claim_Status.APPROVED,
                Claim_Status.REJECTED,
                Claim_Status.ESCALATED,
                Claim_Status.CLOSED
            ];
            console.log('allowedStatuses', allowedStatuses, status, allowedStatuses.includes(status));
            if (!allowedStatuses.includes(status)) {
                return standardResponse(false, 'Invalid status transition', 400);
            }

            const oldStatus = claim.status;

            claim.status = status;
            claim.updatedRemarks = remarks || claim.updatedRemarks;
            claim.updatedBy = userEntity;
            claim.updatedAt = new Date();
            if (status === Claim_Status.REJECTED) {
                claim.finalStatus = Claim_Final_Status.REJECTED;
            }

            await this._claimRepo.save(claim);

            await this.createClaimLogs(claim, claim.policyNumber, oldStatus, status, remarks || '', userEntity);

            return standardResponse(true, `Claim status changed to ${status}`, 200);
        } catch (error) {
            console.error('Error in changeClaimStatus:', error);
            return standardResponse(false, error.message, 500);
        }
    }

    async getClaimsStatusForChange(reqObj: any): Promise<any> {
        const { claimId, claimType, currentStatus } = reqObj;
        console.log('in this claim get status', reqObj);

        let res = null;
        try {
            let allowedStatuses: Claim_Status[] = [];

            switch (currentStatus) {
                case Claim_Status.PROCESSED:
                    allowedStatuses = [
                        // Claim_Status.APPROVED,
                        Claim_Status.REJECTED,
                        Claim_Status.ESCALATED,
                        Claim_Status.CLOSED
                    ];
                    break;
                case Claim_Status.APPROVED:
                    allowedStatuses = [Claim_Status.ESCALATED, Claim_Status.CLOSED];
                    break;
                case Claim_Status.REJECTED:
                    allowedStatuses = [Claim_Status.ESCALATED, Claim_Status.CLOSED];
                    break;
                default:
                    allowedStatuses = [];
            }

            res = standardResponse(
                true,
                'Data fetched successfully',
                200,
                allowedStatuses,
                null,
                'insurance-claim/getClaimsStatusForChange'
            );
        } catch (error) {
            console.log('-api: insurance-claim/getClaimsStatusForChange ', error.message);

            res = standardResponse(
                false,
                'Error fetching data',
                500,
                null,
                error.message,
                'insurance-claim/getClaimsStatusForChange'
            );
        }

        return res;
    }

    async approveClaim(reqBody: any): Promise<any> {
        try {
            const { claimId, approvedAmount, remarks } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();

            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 404);
            }

            const claim = await this._claimRepo.findOne({
                where: { id: claimId }
            });

            if (!claim) {
                return standardResponse(false, 'Claim not found', 404);
            }

            // ---- STATUS VALIDATION ----
            if (claim.status !== Claim_Status.PROCESSED) {
                return standardResponse(false, 'Claim must be PROCESSED before approval', 400);
            }

            // ---- AMOUNT VALIDATIONS ----
            if (approvedAmount == null || approvedAmount <= 0) {
                return standardResponse(false, 'Approved amount must be greater than 0', 400);
            }

            if (approvedAmount > claim.claimAmountRequested) {
                return standardResponse(false, 'Approved amount cannot exceed claimed amount', 400);
            }

            // ---- UPDATE CLAIM ----
            const oldStatus = claim.status;

            claim.claimAmountApproved = approvedAmount;
            claim.deductionAmount = claim.claimAmountRequested - approvedAmount;
            claim.approvalRemarks = remarks || null;
            claim.approvedBy = userEntity;
            claim.approvedAt = new Date();
            claim.status = Claim_Status.APPROVED;
            claim.updatedBy = userEntity;
            claim.updatedAt = new Date();

            await this._claimRepo.save(claim);

            // ---- CREATE LOG ----
            await this.createClaimLogs(
                claim,
                claim.policyNumber,
                oldStatus,
                Claim_Status.APPROVED,
                remarks || 'Claim approved',
                userEntity
            );

            return standardResponse(
                true,
                'Claim approved successfully',
                200,
                {
                    claimId: claim.id,
                    claimedAmount: claim.claimAmountRequested,
                    approvedAmount: claim.claimAmountApproved,
                    deductionAmount: claim.deductionAmount
                },
                null,
                'insurance-claim/approveClaim'
            );
        } catch (error) {
            console.error('Error in approveClaim:', error);
            return standardResponse(false, error.message, 500);
        }
    }

    async settleClaim(reqBody: any): Promise<any> {
        const { claimId, settlementAmount, remarks } = reqBody;
        const user = await this.loggedInsUserService.getCurrentUser();

        const claim = await this._claimRepo.findOne({ where: { id: claimId } });
        if (!claim) return standardResponse(false, 'Claim not found', 404);

        if (claim.status !== Claim_Status.APPROVED) {
            return standardResponse(false, 'Claim must be APPROVED before settlement', 400);
        }

        if (settlementAmount > claim.claimAmountApproved) {
            return standardResponse(false, 'Settlement amount cannot exceed approved amount', 400);
        }

        const oldStatus = claim.status;

        claim.settlementAmount = settlementAmount;
        claim.status = Claim_Status.CLOSED;
        claim.finalStatus = Claim_Final_Status.APPROVED;
        claim.updatedBy = user;
        claim.updatedAt = new Date();

        await this._claimRepo.save(claim);

        await this.createClaimLogs(
            claim,
            claim.policyNumber,
            oldStatus,
            Claim_Status.CLOSED,
            remarks || 'Claim settled',
            user
        );

        return standardResponse(true, 'Claim settled successfully', 200);
    }

    async createClaimDocument(reqBody: any): Promise<any> {
        try {
            const {
                documentCode,
                documentName,
                insuranceTypeId,
                insuranceSubTypeId,
                allowedFormats,
                maxSizeMb,
                isActive
            } = reqBody;

            const userEntity = await this.loggedInsUserService.getCurrentUser();

            if (!userEntity) {
                return standardResponse(false, 'Logged user not found', 404, null, null, 'insurance-claim/create');
            }

            // ---------- Validate Insurance Type ----------
            const insuranceType = await this._insuranceTypeMasterRepo.findOne({
                where: { id: insuranceTypeId }
            });

            if (!insuranceType) {
                return standardResponse(false, 'Insurance type not found', 404, null, null, 'insurance-claim/create');
            }

            // ---------- Validate Insurance Sub Type (Optional) ----------
            let insuranceSubType = null;
            if (insuranceSubTypeId) {
                insuranceSubType = await this._insuranceSubTypeRepo.findOne({
                    where: { id: insuranceSubTypeId }
                });

                if (!insuranceSubType) {
                    return standardResponse(
                        false,
                        'Insurance sub type not found',
                        404,
                        null,
                        null,
                        'insurance-claim/create'
                    );
                }
            }

            // ---------- Check Duplicate Document Code ----------
            const existingDoc = await this._claimDocumentsRepo.findOne({
                where: { documentName }
            });

            if (existingDoc) {
                return standardResponse(
                    false,
                    'Document code already exists',
                    409,
                    null,
                    null,
                    'insurance-claim/create'
                );
            }

            // ---------- Create Entity ----------
            const newDocument = this._claimDocumentsRepo.create({
                documentName: documentName,
                insuranceTypes: insuranceType,
                insuranceSubType: insuranceSubType,
                allowedFormats: allowedFormats,
                maxSizeMb: maxSizeMb,
                isActive: isActive ?? true,
                createdBy: userEntity
            });

            // ---------- Save ----------
            const result = await this._claimDocumentsRepo.save(newDocument);

            if (result) {
                return standardResponse(
                    true,
                    'Claim document created successfully',
                    201,
                    result,
                    null,
                    'insurance-claim/create'
                );
            } else {
                return standardResponse(
                    false,
                    'Failed to create claim document',
                    500,
                    null,
                    null,
                    'insurance-claim/create'
                );
            }
        } catch (error) {
            console.log('-api- insurance-claim/create', error.message);

            return standardResponse(false, error.message, 500, null, null, 'insurance-claim/create');
        }
    }

    async getClaimDocuments(reqObj: any): Promise<any> {
        const { insuranceSubType } = reqObj;
        console.log('in this claim get status', reqObj);
        const subType = await this._insuranceSubTypeRepo.findOne({ where: { code: insuranceSubType } });
        if (!subType) {
            return standardResponse(
                false,
                'Insurance sub type not found',
                404,
                null,
                null,
                'insurance-claim/getClaimDocuments'
            );
        }

        let res = null;
        try {
            const documents = await this._claimDocumentsRepo
                .createQueryBuilder('cd')
                .where('cd.insuranceSubType = :id', { id: subType.id })
                .getMany();

            console.log('existing doucments = ', documents);

            res = standardResponse(
                true,
                'Data fetched successfully',
                200,
                documents,
                null,
                'insurance-claim/getClaimDocuments'
            );
        } catch (error) {
            console.log('-api: insurance-claim/getClaimDocuments ', error.message);

            res = standardResponse(
                false,
                'Error fetching data',
                500,
                null,
                error.message,
                'insurance-claim/getClaimDocuments'
            );
        }

        return res;
    }
}
