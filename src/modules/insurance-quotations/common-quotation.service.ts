import {
    BadRequestException,
    ConflictException,
    Injectable,
    InternalServerErrorException,
    NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insurance_Type, MedicalDetails, Pre_Existing_Diseases } from 'src/utils/app.utils';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
@Injectable()
export class CommonQuotationService {
    constructor(
        @InjectRepository(InsuranceTicket)
        private readonly ticketRepo: Repository<InsuranceTicket>,
    ) {}

    // async getTicketDetails(ticket: any): Promise<any> {
    //     try {
    //         // Optimized query with specific relations
    //         const ticket = await this.ticketRepo
    //             .createQueryBuilder('ticket')
    //             .leftJoinAndSelect('ticket.insuranceUserId', 'insuranceUserId')
    //             .leftJoinAndSelect('ticket.proposerMedical', 'proposerMedical')
    //             .leftJoinAndSelect('ticket.insuranceDependent', 'insuranceDependent')
    //             .leftJoinAndSelect('ticket.dependentMedical', 'dependentMedical')
    //             .leftJoinAndSelect('dependentMedical.dependentId', 'dependentId') // Load dependentId relation
    //             .leftJoinAndSelect('ticket.vehicleDetails', 'vehicleDetails')
    //             .leftJoinAndSelect('ticket.insuredPersons', 'insuredPersons')
    //             .leftJoinAndSelect('ticket.insuredMedical', 'insuredMedical')
    //             .leftJoinAndSelect('ticket.branch', 'branch')
    //             .where('ticket.id = :ticketId', { ticket.id })
    //             .getOne();

    //         if (!ticket) {
    //             return {
    //                 status: 'error',
    //                 message: 'Ticket not found',
    //                 data: null
    //             };
    //         }

    //         if (!ticket.insuranceUserId) {
    //             return {
    //                 status: 'error',
    //                 message: 'Insurance user not found for this ticket',
    //                 data: null
    //             };
    //         }

    //         // Utility function to get latest medical record (for proposer and insured)
    //         const getLatestMedical = (records: any[]): any | null => {
    //             if (!records?.length) return null;
    //             return records.reduce((latest, current) =>
    //                 new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
    //             );
    //         };

    //         // Utility function to format medical details
    //         const formatMedicalDetails = (details: any): MedicalDetails => ({
    //             height: details?.height ?? null,
    //             weight: details?.weight ?? null,
    //             preExistDiseases: details?.preExistDiseases ?? Pre_Existing_Diseases.NONE,
    //             othersDiseases: details?.othersDiseases ?? null,
    //             medication: details?.medication ?? null,
    //             bloodGroup: details?.bloodGroup ?? null,
    //             isPastSurgery: details?.isPastSurgery ?? false,
    //             isChronicCondition: details?.isChronicCondition ?? false,
    //             dischargeSummary: details?.dischargeSummary || null,
    //             diagnosticReport: details?.diagnosticReport || null,
    //             isSmoker: details?.isSmoker ?? false,
    //             isDrinker: details?.isDrinker ?? false,
    //             documents: details?.documents ?? null,
    //             updatedBy: details?.updatedBy?.id ?? null,
    //             updatedAt: details?.updatedAt ?? null
    //         });

    //         // Get latest medical details for proposer and insured
    //         const medicalDetails = getLatestMedical(ticket.proposerMedical);
    //         const insuredMedicalDetails = getLatestMedical(ticket.insuredMedical);
    //         const res = {
    //             status: 'success',
    //             message: 'Ticket details fetched successfully',
    //             data: {
    //                 ticketId: ticket.id,
    //                 ticketNumber: ticket.ticketNumber,
    //                 insuranceType: ticket.insuranceType,
    //                 ticketStatus: ticket.ticketStatus,
    //                 includeSelfAsDependent: ticket.includeSelfAsDependent ?? false,
    //                 preferredCompany: ticket.preferredCompany ?? null,
    //                 preferredProduct: ticket.preferredProduct ?? null,
    //                 policyHolderType: ticket.policyHolderType ?? null,
    //                 coveragedRequired: ticket.coveragedRequired ?? null,
    //                 userPreferredAmount: ticket.userPreferredAmount ?? null,
    //                 insurancePurpose: ticket.insurancePurpose ?? null,
    //                 PrimiumPaymentTerm: ticket.PrimiumPaymentTerm ?? null,
    //                 policyTerm: ticket.policyTerm ?? null,
    //                 prePolicyNumber: ticket.prePolicyNumber ?? null,
    //                 preInsuranceComapny: ticket.preInsuranceComapny ?? null,
    //                 preIdf: ticket.preIdf ?? null,
    //                 endorsmentToNoted: ticket.endorsmentToNoted ?? null,
    //                 coverageType: ticket.coverageType ?? null,
    //                 isPreYearClaim: ticket.isPreYearClaim ?? false,
    //                 assignTo: ticket.assignTo?.id ?? null,
    //                 currentStep: ticket.currentStepStart ?? null,
    //                 nextStepDeadline: ticket.nextStepDeadline ?? null,
    //                 agentRemarks: ticket.agentRemarks ?? null,
    //                 othersRemarks: ticket.othersRemarks ?? null,
    //                 updatedBy: ticket.updatedBy?.id ?? null,
    //                 updatedAt: ticket.updatedAt ?? null,
    //                 branchContactPerson: ticket.branch.contactPerson ?? null,
    //                 branchPhone: ticket.branch.phone ?? null,
    //                 insuranceUser: {
    //                     name: ticket.insuranceUserId.name,
    //                     gender: ticket.insuranceUserId.gender,
    //                     primaryContactNumber: ticket.insuranceUserId.primaryContactNumber,
    //                     secondaryContactNumber: ticket.insuranceUserId.secondaryContactNumber ?? null,
    //                     emailId: ticket.insuranceUserId.emailId,
    //                     employmentType: ticket.insuranceUserId.employmentType,
    //                     dateOfBirth: ticket.insuranceUserId.dateOfBirth ?? null,
    //                     // nomineeName: ticket.nomineeName ?? null,
    //                     // nomineeRelation: ticket.nomineeRelation ?? null,
    //                     // nomineeMobileNumber: ticket.nomineeMobileNumber ?? null,
    //                     // nomineeEmailId: ticket.nomineeEmailId ?? null,
    //                     pinCode: ticket.insuranceUserId.permanentPinCode ?? null,
    //                 },
    //                 medicalDetails: formatMedicalDetails(medicalDetails),

    //                 dependents:
    //                     ticket.insuranceDependent?.map((dep) => {
    //                         const depMedical = ticket.dependentMedical?.find((dm) => dm.dependentId?.id === dep.id);
    //                         return {
    //                             id: dep.id,
    //                             name: dep.name,
    //                             dateOfBirth: dep.dateOfBirth || null,
    //                             gender: dep.gender || null,
    //                             primaryContactNumber: dep.primaryContactNumber || null,
    //                             relation: dep.relation || null,
    //                             medicalDetails: formatMedicalDetails(depMedical)
    //                         };
    //                     }) || [],
    //                 vehicleDetails: ticket.vehicleDetails?.[0]
    //                     ? {
    //                           id: ticket.vehicleDetails[0].id,
    //                           vehicleCategory:ticket.vehicleDetails[0].vehicleCategory,
    //                           vehicleType: ticket.vehicleDetails[0].vehicleType,
    //                           vehicleNumber: ticket.vehicleDetails[0].vehicleNumber,
    //                           makingYear: ticket.vehicleDetails[0].makingYear ?? null,
    //                           vehicleName: ticket.vehicleDetails[0].vehicleName ?? null,
    //                           modelNumber: ticket.vehicleDetails[0].modelNumber ?? null,
    //                           rcOwnerName: ticket.vehicleDetails[0].rcOwnerName ?? null,
    //                           engineNumber: ticket.vehicleDetails[0].engineNumber ?? null,
    //                           chassisNumber: ticket.vehicleDetails[0].chassisNumber ?? null,
    //                           dateOfReg: ticket.vehicleDetails[0].dateOfReg ?? null,
    //                           madeBy: ticket.vehicleDetails[0].madeBy ?? null,

    //                       }
    //                     : null,
    //                 insuredPersons: ticket.insuredPersons
    //                     ? {
    //                           id: ticket.insuredPersons.id,
    //                           name: ticket.insuredPersons.name,
    //                           dateOfBirth: ticket.insuredPersons.dateOfBirth ?? null,
    //                           gender: ticket.insuredPersons.gender ?? null,
    //                           primaryContactNumber: ticket.insuredPersons.primaryContactNumber ?? null,
    //                           secondaryContactNumber: ticket.insuredPersons.secondaryContactNumber ?? null,
    //                           emailId: ticket.insuredPersons.emailId ?? null,
    //                           relation: ticket.insuredPersons.relation ?? null,
    //                           permanentAddress: ticket.insuredPersons.permanentAddress ?? null,
    //                           permanentCity: ticket.insuredPersons.permanentCity ?? null,
    //                           permanentState: ticket.insuredPersons.permanentState ?? null,
    //                           permanentPinCode: ticket.insuredPersons.permanentPinCode ?? null,

    //                       }
    //                     : null,
    //                 insuredMedicalDetails: formatMedicalDetails(insuredMedicalDetails)
    //             }
    //         };
    //         // console.log('here in common service res : ', res);

    //         return res;
    //     } catch (error) {
    //         return {
    //             status: 'error',
    //             message: `Internal server error: ${error.message}`,
    //             data: null
    //         };
    //     }
    // }

    async getTicketDetails(reqTicket: any): Promise<any> {
        try {
            //  console.log('in get ticket details ', reqTicket);

            // Base query (common joins)
            let query = this.ticketRepo
                .createQueryBuilder('ticket')
                .leftJoinAndSelect('ticket.insuranceUserId', 'insuranceUserId')
                .leftJoinAndSelect('ticket.branch', 'branch')
                .leftJoinAndSelect('ticket.nominee', 'nominee')
                // .leftJoinAndSelect('ticketTypes', 'ticketTypes')
                .leftJoinAndSelect('ticket.insuranceSubType', 'insuranceSubType')
                .leftJoinAndSelect('insuranceSubType.insuranceTypes', 'insuranceTypes')
                .where('ticket.id = :ticketId', { ticketId: reqTicket.id });

            // Conditional joins based on insuranceType
            switch (reqTicket.insuranceType) {
                case String(Insurance_Type.Health):
                    query = query
                        .leftJoinAndSelect('ticket.proposerMedical', 'proposerMedical')
                        .leftJoinAndSelect('ticket.insuranceDependent', 'insuranceDependent')
                        .leftJoinAndSelect('ticket.dependentMedical', 'dependentMedical')
                        .leftJoinAndSelect('dependentMedical.dependentId', 'dependentId');
                    break;

                case String(Insurance_Type.Motor):
                    query = query.leftJoinAndSelect('ticket.vehicleDetails', 'vehicleDetails');
                    break;

                case String(Insurance_Type.Life):
                    query = query
                        .leftJoinAndSelect('ticket.insuredPersons', 'insuredPersons')
                        .leftJoinAndSelect('ticket.insuredMedical', 'insuredMedical');
                    break;

                default:
                    throw new Error(`Unknown insurance type: ${reqTicket.insuranceType}`);
            }

            // Execute query
            const ticket = await query.getOne();
// console.log("in common quotation ticket is", ticket);

            if (!ticket) {
                return {
                    status: 'error',
                    message: 'Ticket not found',
                    data: null
                };
            }

            // Helper to get latest medical record
            const getLatestMedical = (records: any[]): any | null => {
                if (!records?.length) return null;
                return records.reduce((latest, current) =>
                    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                );
            };

            const formatMedicalDetails = (details: any) => ({
                height: details?.height ?? null,
                weight: details?.weight ?? null,
                preExistDiseases: details?.preExistDiseases ?? null,
                othersDiseases: details?.othersDiseases ?? null,
                medication: details?.medication ?? null,
                bloodGroup: details?.bloodGroup ?? null,
                isPastSurgery: details?.isPastSurgery ?? false,
                isChronicCondition: details?.isChronicCondition ?? false,
                dischargeSummary: details?.dischargeSummary ?? null,
                diagnosticReport: details?.diagnosticReport ?? null,
                isSmoker: details?.isSmoker ?? false,
                isDrinker: details?.isDrinker ?? false,
                documents: details?.documents ?? null,
                updatedAt: details?.updatedAt ?? null
            });

            // Prepare response
            const data: any = {
                ticketId: ticket.id,
                ticketNumber: ticket.ticketNumber,
                // insuranceType: ticket.insuranceType,
                insuranceType: ticket.insuranceSubType?.insuranceTypes?.code,
                insuranceSubTypeCode: ticket.insuranceSubType?.code,
                insuranceSubTypeName: ticket.insuranceSubType?.name,
                ticketStatus: ticket.ticketStatus,
                insuranceUser: ticket?.insuranceUserId,
                branch: {
                    contactPerson: ticket.branch?.contactPerson || 'N/A',
                    phone: ticket.branch?.phone || 'N/A',
                    address: ticket.branch?.address || 'N/A'
                }
            };

            // Add type-specific data
            switch (reqTicket.insuranceType) {
                case String(Insurance_Type.Health): {
                    const proposerMedical = getLatestMedical(ticket.proposerMedical);
                    data.medicalDetails = formatMedicalDetails(proposerMedical);
                    data.dependents =
                        ticket.insuranceDependent?.map((dep) => {
                            const depMedical = ticket.dependentMedical?.find((dm) => dm.dependentId?.id === dep.id);
                            return {
                                ...dep,
                                medicalDetails: formatMedicalDetails(depMedical)
                            };
                        }) ?? [];
                    break;
                }

                case String(Insurance_Type.Motor):
                    data.vehicleDetails = ticket.vehicleDetails?.[0] ?? null;
                    break;

                case String(Insurance_Type.Life): {
                    const insuredMedical = getLatestMedical(ticket.insuredMedical);
                    data.insuredPersons = ticket.insuredPersons ?? null;
                    data.insuredMedicalDetails = formatMedicalDetails(insuredMedical);
                    break;
                }
            }
            //  console.log('in get ticket details res is ->>>>', data);

            return {
                status: 'success',
                message: 'Ticket details fetched successfully',
                data
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Internal server error: ${error.message}`,
                data: null
            };
        }
    }
}
