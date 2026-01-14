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
        private readonly ticketRepo: Repository<InsuranceTicket>
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


    //    async generateQuotationPDF(ticket: any, quotationId: string): Promise<Buffer> {
    //         return new Promise(async (resolve, reject) => {
    //             try {
    //                 const colors = {
    //                     primary: '#1F2937',
    //                     accent: '#3B82F6',
    //                     lightAccent: '#EFF6FF',
    //                     border: '#E5E7EB',
    //                     text: '#374151',
    //                     lightText: '#6B7280',
    //                     success: '#10B981',
    //                     background: '#FFFFFF',
    //                     error: '#FF2C2C'
    //                 };
    //                 const doc = new PDFDocument({ size: 'A4', margin: 50 });
    //                 // === Include Logo ===
    //                 const logoPath = fs.existsSync(path.resolve(__dirname, 'assets/images/ACUMEN-BLUE-LOGO.PNG'))
    //                     ? path.resolve(__dirname, 'assets/images/ACUMEN-BLUE-LOGO.PNG') // for build / Docker
    //                     : path.resolve(__dirname, '../../assets/images/ACUMEN-BLUE-LOGO.PNG'); // for dev
    
    //                 // console.log('Resolved logo path:', logoPath);
    //                 // console.log('Exists?', fs.existsSync(logoPath));
    //                 // === Watermark logic ===
    //                 const watermarksPath = fs.existsSync(path.resolve(__dirname, 'assets/images/logo-accumen.png'))
    //                     ? path.resolve(__dirname, 'assets/images/logo-accumen.png') // for build / Docker
    //                     : path.resolve(__dirname, '../../assets/images/logo-accumen.png'); // for dev
    
    //                 // console.log('watermarksPath logo path:', watermarksPath);
    //                 // console.log('Exists?', fs.existsSync(watermarksPath));
    
    //                 const locationPath = fs.existsSync(path.resolve(__dirname, 'assets/images/placeholder.png'))
    //                     ? path.resolve(__dirname, 'assets/images/placeholder.png') // for build / Docker
    //                     : path.resolve(__dirname, '../../assets/images/placeholder.png'); // for dev
    //                 // console.log('placeholder logo path:', locationPath);
    //                 // console.log('Exists?', fs.existsSync(locationPath));
    //                 const phonePath = fs.existsSync(path.resolve(__dirname, 'assets/images/phone.png'))
    //                     ? path.resolve(__dirname, 'assets/images/phone.png') // for build / Docker
    //                     : path.resolve(__dirname, '../../assets/images/phone.png'); // for dev
    
    //                 function addWatermark() {
    //                     const pageWidth = doc.page.width;
    //                     const pageHeight = doc.page.height;
    
    //                     // Logo size (adjust as needed)
    //                     const logoWidth = 200;
    //                     const logoHeight = 100;
    
    //                     // Center position
    //                     const x = (pageWidth - logoWidth) / 2;
    //                     const y = (pageHeight - logoHeight) / 2;
    
    //                     doc.opacity(0.1); // very faint watermark
    //                     doc.image(watermarksPath, x, y, { width: logoWidth, height: logoHeight });
    //                     doc.opacity(1); // reset opacity for normal content
    //                 }
    //                 // Add watermark to first page
    //                 addWatermark();
    
    //                 // Automatically add watermark on every new page
    //                 doc.on('pageAdded', () => {
    //                     addWatermark();
    //                 });
    
    //                 const fontPath = path.join(__dirname, '../../assets/fonts/DejaVuSans.ttf');
    //                 const boldFontPath = path.join(__dirname, '../../assets/fonts/DejaVuSans-Bold.ttf');
    //                 const NotoSans = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
    //                 doc.registerFont('DejaVuSans', fontPath);
    //                 doc.registerFont('DejaVuSans-Bold', boldFontPath);
    //                 doc.registerFont('NotoSans-Regular', NotoSans);
    //                 doc.font('DejaVuSans');
    
    //                 const buffers: Buffer[] = [];
    
    //                 doc.on('data', buffers.push.bind(buffers));
    //                 doc.on('end', () => resolve(Buffer.concat(buffers)));
    //                 doc.on('error', reject);
    
    //                 const quotation = await this.quotationRepository
    //                     .createQueryBuilder('quotation')
    //                     .leftJoinAndSelect('quotation.quotes', 'quote')
    //                     .leftJoinAndSelect('quote.company', 'company')
    //                     .leftJoinAndSelect('quote.product', 'product')
    //                     .leftJoinAndSelect('product.productFeatures', 'productFeature', 'productFeature.isActive = true')
    //                     .leftJoinAndSelect('productFeature.insuranceFeatures', 'productInsuranceFeature')
    //                     .leftJoinAndSelect('quote.quoteFeatures', 'quoteFeature', 'quoteFeature.isActive = true')
    //                     .leftJoinAndSelect('quoteFeature.insuranceFeatures', 'insuranceFeature')
    //                     .where('quotation.id = :quotationId', { quotationId: parseInt(quotationId) })
    //                     .andWhere('quotation.ticketId = :ticketId', { ticketId: parseInt(ticket.id) })
    //                     .getOne();
    
    //                 // console.log('line no 172 quotation details, ', quotation);
    
    //                 const ticketDetails = await this.quotationService.getTicketDetails(ticket);
    //                 // console.log('ticket details line no 190', ticketDetails);
    
    //                 const data = {
    //                     customerName: ticketDetails.data.insuranceUser.name,
    //                     insuranceType: ticketDetails.data.insuranceType,
    //                     insuranceSubTypeCode: ticketDetails.data.insuranceSubTypeCode,
    //                     insuranceSubTypeName: ticketDetails.data.insuranceSubTypeName,
    //                     ticketNumber: ticketDetails.data.ticketNumber,
    //                     proposer: {
    //                         name: ticketDetails.data?.insuranceUser.name,
    //                         dob: ticketDetails.data.insuranceUser.dateOfBirth?.toString().split('T')[0] || 'N/A',
    //                         gender: formatToCamelCase(ticketDetails.data?.insuranceUser?.gender) || 'N/A',
    //                         height: ticketDetails.data?.medicalDetails
    //                             ? ticketDetails.data.medicalDetails?.height || 0
    //                             : null,
    //                         weight: ticketDetails.data.medicalDetails
    //                             ? ticketDetails.data?.medicalDetails?.weight || 0
    //                             : null
    //                     },
    
    //                     vehicleDetails: ticketDetails?.data?.vehicleDetails
    //                         ? {
    //                               vehicleNumber: ticketDetails.data.vehicleDetails?.vehicleNumber || 'N/A',
    //                               rcOwnerName: ticketDetails.data.vehicleDetails?.rcOwnerName || 'N/A',
    //                               engineNumber: ticketDetails.data.vehicleDetails?.engineNumber || 'N/A',
    //                               chassisNumber: ticketDetails.data.vehicleDetails?.chassisNumber || 'N/A',
    //                               dateOfReg: ticketDetails.data.vehicleDetails?.dateOfReg || 'N/A',
    //                               modelNumber: ticketDetails.data.vehicleDetails?.modelNumber || 'N/A',
    //                               makingYear: ticketDetails.data.vehicleDetails?.makingYear || 'N/A',
    //                               madeBy: ticketDetails.data.vehicleDetails?.madeBy || 'N/A',
    //                               vehicleCategory: ticketDetails.data.vehicleDetails?.vehicleCategory || 'N/A'
    //                           }
    //                         : null,
    //                     dependentDetails: ticketDetails.data.dependents
    //                         ? ticketDetails.data.dependents?.map((dependent) => ({
    //                               name: dependent?.name,
    //                               dob: dependent?.dateOfBirth?.toString().split('T')[0] || 'N/A',
    //                               gender: formatToCamelCase(dependent?.gender) || 'N/A',
    //                               height: dependent?.medicalDetails?.height || 0,
    //                               weight: dependent?.medicalDetails?.weight || 0
    //                           }))
    //                         : null,
    //                     insuredPersons: ticketDetails.data.insuredPersons
    //                         ? {
    //                               name: ticketDetails.data.insuredPersons?.name || '-',
    //                               dob: ticketDetails.data.insuredPersons?.dateOfBirth?.toString().split('T')[0] || 'N/A',
    //                               gender: formatToCamelCase(ticketDetails?.data?.insuredPersons?.gender ?? '') || 'N/A',
    //                               height: ticketDetails?.data?.insuredPersons?.height || 0,
    //                               weight: ticketDetails.data.insuredPersons?.weight || 0
    //                           }
    //                         : null,
    //                     pinCode: ticketDetails.data?.insuranceUser?.permanentPinCode || 'N/A',
    //                     mobileNo: ticketDetails.data?.insuranceUser?.primaryContactNumber || 'N/A',
    //                     emailId: ticketDetails.data?.insuranceUser?.emailId || 'N/A',
    //                     pedDeclared: ticketDetails.data?.medicalDetails
    //                         ? ticketDetails.data?.medicalDetails?.preExistDiseases || 'N/A'
    //                         : null,
    //                     quotes: quotation.quotes.map((quote) => ({
    //                         companyLogo: quote.company.companyLogo,
    //                         companyName: quote.company.companyName,
    //                         productName: quote.product.name,
    //                         coverage: quote.coveragedRequired || 0,
    //                         premium: quote.Premium || 0,
    //                         features: quote.features || 'N/A',
    //                         benefits: quote.benefits || 'N/A',
    //                         advantages: quote.advantages || 'N/A',
    //                         remarks: quote.additionalRemarks || 'N/A',
    //                         idv: quote.idv || 'N/A',
    //                         coverType: formatToCamelCase(quote.coverageType) || 'N/A',
    //                         coverageIncluded: quote.coverageIncluded || 'N/A',
    //                         ncb: quote.ncb || 'N/A'
    //                     })),
    
    //                     validityDate: quotation.validityDate.toISOString().split('T')[0],
    //                     branch: {
    //                         name: ticketDetails.data?.branch?.ContactPerson,
    //                         contact: ticketDetails.data?.branch?.phone,
    //                         address: ticketDetails.data?.branch?.address
    //                     }
    //                 };
    //                 //  console.log('line no 250 data is here', data);
    
    //                 // Step 1: Collect all features across products
    //                 // console.log('testing line no 268', ticket.insuranceSubType?.insuranceTypes?.code);
    
    //                 // const insuranceFeatures = await this.insurncetFeaturesRepo.find({
    //                 //     where: { isActive: true, insuranceTypes: ticket.insuranceSubType?.insuranceTypes?.code },
    //                 //     relations: ['insuranceTypes']
    //                 // });
    
    //                 // commented old code 23-12-2025
    //                 // const insuranceFeatures = await this.insurncetFeaturesRepo.find({
    //                 //     where: {
    //                 //         isActive: true,
    //                 //         insuranceTypes: {
    //                 //             code: ticket.insuranceSubType?.insuranceTypes?.code
    //                 //         }
    //                 //     },
    //                 //     relations: ['insuranceTypes']
    //                 // });
    
    //                 // console.log('line no 272 insurance features', insuranceFeatures);
    
    //                 // const basicFeatures: InsuranceFeatures[] = [];
    //                 // const addOnFeatures: InsuranceFeatures[] = [];
    
    //                 // Separate based on isStandard
    //                 // insuranceFeatures.forEach((feature) => {
    //                 //     if (feature.isStandard) {
    //                 //         basicFeatures.push(feature);
    //                 //     } else {
    //                 //         addOnFeatures.push(feature);
    //                 //     }
    //                 // });
    
    //                 // Split into basic and add-on based on name containing 'Cover' (assumption for categorization)
    //                 // Prepare final comparison data for basic
    //                 // const finalBasicData: { feature: string; quoteValues: string[] }[] = basicFeatures.map((feature) => {
    //                 //     return {
    //                 //         feature: feature.featuresName,
    //                 //         quoteValues: quotation.quotes.map((quote) => {
    //                 //             const includedFeatures = quote.quoteFeatures.map((qf) => qf.insuranceFeatures.id);
    //                 //             return includedFeatures.includes(feature.id) ? '✓' : '×';
    //                 //         })
    //                 //     };
    //                 // });
    
    //                 // Prepare final comparison data for add-on
    //                 // const finalAddOnData: { feature: string; quoteValues: string[] }[] = addOnFeatures.map((feature) => {
    //                 //     return {
    //                 //         feature: feature.featuresName,
    //                 //         quoteValues: quotation.quotes.map((quote) => {
    //                 //             const includedFeatures = quote.quoteFeatures.map((qf) => qf.insuranceFeatures.id);
    //                 //             return includedFeatures.includes(feature.id) ? '✓' : '×';
    //                 //         })
    //                 //     };
    //                 // });
    
    //                 // --- new logic for product features
    //                 const productFeatureMap = new Map<number, InsuranceFeatures>();
    
    //                 quotation.quotes.forEach((quote) => {
    //                     quote.product?.productFeatures?.forEach((pf) => {
    //                         const feature = pf.insuranceFeatures;
    //                         if (feature && feature.isActive) {
    //                             productFeatureMap.set(feature.id, feature);
    //                         }
    //                     });
    //                 });
    
    //                 const allProductFeatures = Array.from(productFeatureMap.values());
    //                 const basicFeatures = allProductFeatures.filter((feature) => feature.isStandard === true);
    
    //                 const addOnFeatures = allProductFeatures.filter((feature) => feature.isStandard === false);
    //                 const finalBasicData = basicFeatures.map((feature) => ({
    //                     feature: feature.featuresName,
    //                     quoteValues: quotation.quotes.map((quote) => {
    //                         const selectedFeatureIds = quote.quoteFeatures.map((qf) => qf.insuranceFeatures.id);
    //                         return selectedFeatureIds.includes(feature.id) ? '✓' : '×';
    //                     })
    //                 }));
    //                 const finalAddOnData = addOnFeatures.map((feature) => ({
    //                     feature: feature.featuresName,
    //                     quoteValues: quotation.quotes.map((quote) => {
    //                         const selectedFeatureIds = quote.quoteFeatures.map((qf) => qf.insuranceFeatures.id);
    //                         return selectedFeatureIds.includes(feature.id) ? '✓' : '×';
    //                     })
    //                 }));
    
    //                 //--- end new logic for product features
    
    //                 function ensureSpace(doc: any, neededHeight: number, startY: number) {
    //                     const bottomMargin = 50;
    //                     const topMargin = 50;
    //                     if (startY + neededHeight > doc.page.height - bottomMargin) {
    //                         doc.addPage();
    //                         return topMargin;
    //                     }
    //                     return startY;
    //                 }
    
    //                 function drawComparisonTable(
    //                     doc: any,
    //                     data: { feature: string; quoteValues: string[] }[],
    //                     startX: number,
    //                     startY: number,
    //                     skipHeader: boolean = false
    //                 ) {
    //                     const labelWidth = 130;
    //                     const quoteWidth = 120;
    //                     let y = startY;
    
    //                     if (!skipHeader) {
    //                         // Header row
    //                         doc.font('DejaVuSans').fontSize(9); // Changed from 7 to 10
    //                         y = ensureSpace(doc, 20, y);
    //                         doc.rect(startX, y, labelWidth, 20).fillAndStroke('#CCCCCC', '#0055A5');
    //                         doc.fillColor('black').text('Feature Details', startX + 5, y + 5);
    
    //                         quotation.quotes.forEach((quote, i) => {
    //                             const x = startX + labelWidth + i * quoteWidth;
    //                             doc.rect(x, y, quoteWidth, 20).fillAndStroke('#0055A5', '#0055A5');
    //                             doc.fillColor('black').text(quote.company.companyName, x + 5, y + 5, {
    //                                 width: quoteWidth - 10
    //                             });
    //                         });
    //                         y += 20;
    //                     }
    
    //                     // Rows with dynamic height
    //                     doc.font('DejaVuSans').fontSize(9); // Changed from 6 to 10
    //                     data.forEach((row) => {
    //                         // Calculate dynamic height for feature column
    //                         const featureHeight = doc.heightOfString(row.feature, { width: labelWidth - 10 });
    //                         const lineCountFeature = Math.ceil(featureHeight / doc.currentLineHeight());
    //                         const rowHeightFeature = Math.max(lineCountFeature * 15, 30);
    
    //                         // Calculate dynamic height for quote values
    //                         const quoteHeights = row.quoteValues.map((val) => {
    //                             const height = doc.heightOfString(val, { width: quoteWidth - 10 });
    //                             const lineCount = Math.ceil(height / doc.currentLineHeight());
    //                             return Math.max(lineCount * 10, 10);
    //                         });
    //                         const rowHeight = Math.max(rowHeightFeature, ...quoteHeights);
    
    //                         y = ensureSpace(doc, rowHeight, y);
    
    //                         // Feature column
    //                         doc.rect(startX, y, labelWidth, rowHeight).fillAndStroke('#FFFFFF', '#0055A5');
    //                         doc.fillColor('black').text(row.feature, startX + 5, y + 5, {
    //                             width: labelWidth - 10,
    //                             align: 'center'
    //                         });
    
    //                         // Quote columns
    //                         doc.font('DejaVuSans').fontSize(10).fillColor(colors.success);
    //                         row.quoteValues.forEach((val, i) => {
    //                             const x = startX + labelWidth + i * quoteWidth;
    //                             doc.rect(x, y, quoteWidth, rowHeight).fillAndStroke('#FFFFFF', '#0055A5');
    //                             doc.fillColor(val === '✓' ? colors.success : colors.error);
    //                             doc.fontSize(11).text(val, x + 5, y + 5, { width: quoteWidth - 10, align: 'center' });
    //                         });
    
    //                         y += rowHeight;
    //                     });
    
    //                     return y;
    //                 }
    
    //                 doc.image(logoPath, 50, 25, { width: 140, height: 22 });
    
    //                 // Header info on the right
    //                 doc.fontSize(8).fillColor(colors.lightText).font('DejaVuSans');
    //                 doc.text(`Generated: ${new Date().toLocaleDateString()}`, 350, 35, { align: 'right' });
    //                 doc.text(`Validity: ${data.validityDate}`, 350, 48, { align: 'right' });
    
    //                 doc.moveDown(1);
    
    //                 doc.fillColor('#0055A5')
    //                     .fontSize(18)
    //                     .font('DejaVuSans-Bold')
    //                     .text('INSURANCE QUOTATION', 50, 70, { align: 'left' });
    //                 doc.moveTo(50, 100).lineTo(560, 100).lineWidth(2).strokeColor(colors.accent).stroke();
    
    //                 doc.moveDown(0.5);
    
    //                 // Customer Greeting
    //                 doc.fillColor('#242424')
    //                     .fontSize(11) // Reduced from 10
    //                     .font('DejaVuSans-Bold')
    //                     .text(`Dear ${data.customerName},`, 50, doc.y + 5);
    //                 doc.moveDown(0.3);
    //                 doc.fillColor('#3B3B3B').fontSize(9.5).font('DejaVuSans');
    //                 if (data.insuranceType === Insurance_Type.Health) {
    //                     doc.text(
    //                         `Warm greetings from Acumen! We Truly appriciate the trust you've placed in us to safeguard your faimily's health and wellbeing.`,
    //                         50,
    //                         doc.y
    //                     );
    //                 } else if (data.insuranceType === Insurance_Type.Life) {
    //                     doc.text(
    //                         `Warm greetings from Acumen! We truly appreciate the trust you’ve placed in us to safeguard your family’s future and financial wellbeing.`,
    //                         50,
    //                         doc.y
    //                     );
    //                 } else if (data.insuranceType === Insurance_Type.Motor) {
    //                     doc.text(
    //                         `Warm greetings from Acumen! We truly appreciate the trust you’ve placed in us to protect your vehicle and ensure your peace of mind on the road.`,
    //                         50,
    //                         doc.y
    //                     );
    //                 } else {
    //                     doc.text(
    //                         `Warm greetings from Acumen! We Truly appriciate the trust you've placed in us.`,
    //                         50,
    //                         doc.y
    //                     );
    //                 }
    
    //                 doc.moveDown(1);
    //                 // draw table is for dependent details, insured details, vehicle details
    //                 const drawTable = (
    //                     title: string,
    //                     headers: string[],
    //                     rows: string[][],
    //                     startX: number,
    //                     startY: number,
    //                     colWidths: number[]
    //                 ) => {
    //                     const columnX: number[] = [startX];
    
    //                     for (let i = 0; i < colWidths.length - 1; i++) {
    //                         columnX.push(columnX[i] + colWidths[i]);
    //                     }
    
    //                     doc.font('DejaVuSans-Bold').fontSize(10).fillColor('#003087').text(title, startX, startY);
    
    //                     let y = startY + 20;
    
    //                     // --- Draw Header ---
    //                     doc.font('DejaVuSans-Bold').fontSize(9).fillColor('#242424');
    
    //                     // First, calculate max header height
    //                     const headerHeights = headers.map((header, i) => {
    //                         return doc.heightOfString(header, { width: colWidths[i] - 10, align: 'center' });
    //                     });
    //                     const headerHeight = Math.max(...headerHeights) + 10; // Add some padding
    
    //                     headers.forEach((header, i) => {
    //                         const x = columnX[i];
    //                         // doc.strokeColor('#0055A5').lineWidth(1);
    //                         doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                         doc.fillColor('#0055A5');
    //                         doc.rect(x, y, colWidths[i], headerHeight).stroke().fill();
    //                         doc.fillColor('#242424');
    //                         doc.text(header, x + 5, y + 5, {
    //                             width: colWidths[i] - 10,
    //                             align: 'center'
    //                         });
    //                     });
    //                     y += headerHeight;
    
    //                     // --- Draw Rows ---
    //                     doc.font('DejaVuSans').fontSize(9).fillColor('black');
    
    //                     rows.forEach((row, rowIndex) => {
    //                         if (!Array.isArray(row)) {
    //                             console.error(`Invalid row at index ${rowIndex}:`, row);
    //                             throw new Error(`Invalid row data for table: ${title}`);
    //                         }
    
    //                         // Calculate dynamic row height based on cell content
    //                         const rowHeights = row.map((cell, i) => {
    //                             return doc.heightOfString(cell, { width: colWidths[i] - 10, align: 'center' });
    //                         });
    //                         const rowHeight = Math.max(...rowHeights) + 10; // Add padding
    
    //                         row.forEach((cell, i) => {
    //                             const x = columnX[i];
    //                             doc.lineWidth(0.5);
    //                             doc.fillColor('#0055A5');
    //                             doc.rect(x, y, colWidths[i], rowHeight).stroke().fill();
    //                             doc.fillColor('black');
    //                             doc.text(cell, x + 5, y + 5, {
    //                                 width: colWidths[i] - 10,
    //                                 align: 'center'
    //                             });
    //                         });
    
    //                         y += rowHeight;
    //                     });
    
    //                     return y;
    //                 };
    
    //                 doc.fontSize(11)
    //                     .font('DejaVuSans-Bold')
    //                     .fillColor('black')
    //                     .text('Proposer Information', 50, doc.y + 15);
    //                 doc.moveDown(0.1);
    //                 const proposerStartY = doc.y + 10; // Add a bit of padding
    
    //                 // LEFT SIDE DETAILS
    //                 let currentY = proposerStartY;
    
    //                 // Helper function to draw label and value
    //                 function addDetail(label, value) {
    //                     const startX = 50;
    //                     const labelWidth = 60; // adjust for alignment
    
    //                     // Label in bold
    //                     doc.font('DejaVuSans-Bold').fontSize(8).fillColor('#525252').text(label, startX, currentY);
    
    //                     // Value in normal
    //                     doc.font('DejaVuSans')
    //                         .fontSize(9)
    //                         .fillColor('black')
    //                         .text(value, startX + 75, currentY);
    //                     currentY += 12;
    //                 }
    //                 // Add details
    //                 addDetail('Name:', data.proposer.name);
    //                 doc.moveDown(0.2);
    //                 addDetail('Mobile No:', data.mobileNo);
    //                 doc.moveDown(0.2);
    //                 addDetail('Email ID:', data.emailId);
    //                 doc.moveDown(0.2);
    //                 addDetail('PIN Code:', data.pinCode);
    //                 doc.moveDown(0.4);
    
    //                 if (data.insuranceType === Insurance_Type.Health || data.insuranceType === Insurance_Type.Life) {
    //                     addDetail('DOB:', data.proposer.dob);
    //                     doc.moveDown(0.2);
    //                     addDetail('Gender:', data.proposer.gender);
    //                     doc.moveDown(0.2);
    //                     addDetail('Height:', `${data.proposer.height} cm`);
    //                     doc.moveDown(0.2);
    //                     addDetail('Weight:', `${data.proposer.weight} kg`);
    //                     doc.moveDown(0.2);
    //                     addDetail('PED Declared:', data.pedDeclared);
    //                 }
    
    //                 // RIGHT SIDE DETAILS
    //                 const rightX = 370; // adjust as needed for alignment
    //                 let rightY = proposerStartY;
    
    //                 doc.fontSize(9).font('DejaVuSans-Bold').fillColor('#0055A5').text(`Ticket No:`, rightX, rightY);
    
    //                 doc.font('DejaVuSans')
    //                     .fillColor('black')
    //                     .text(`${data.ticketNumber}`, rightX + 60, rightY);
    
    //                 rightY += 2;
    
    //                 doc.font('DejaVuSans-Bold')
    //                     .fillColor('#0055A5')
    //                     .text(`Quotation No.:`, rightX, rightY + 15);
    
    //                 doc.font('DejaVuSans')
    //                     .fillColor('black')
    //                     .text(`${quotation.quotationNo || '-'}`, rightX + 90, rightY + 15);
    
    //                 rightY += 2;
    
    //                 doc.font('DejaVuSans-Bold')
    //                     .fillColor('#0055A5')
    //                     .text(`Insurance Type:`, rightX, rightY + 30);
    
    //                 doc.font('DejaVuSans')
    //                     .fillColor('black')
    //                     .text(`${formatToCamelCase(data.insuranceSubTypeName)}`, rightX + 90, rightY + 30);
    
    //                 rightY += 2;
    
    //                 doc.font('DejaVuSans-Bold')
    //                     .fillColor('#0055A5')
    //                     .text(`Date:`, rightX, rightY + 45);
    
    //                 doc.font('DejaVuSans')
    //                     .fillColor('black')
    //                     .text(formattedDate, rightX + 50, rightY + 45);
    
    //                 doc.moveDown(1);
    //                 // === After drawing left and right details ===
    //                 const leftHeight = currentY - proposerStartY; // left column height
    //                 const rightHeight = rightY + 12 - proposerStartY; // right column height, + line spacing
    //                 const maxHeight = Math.max(leftHeight, rightHeight);
    
    //                 // Move doc.y below the taller column
    //                 doc.y = proposerStartY + maxHeight + 10; // 10 = padding before next section
    
    //                 let yPosition = doc.y;
    
    //                 // === Conditional Tables Based on Insurance Type ===
    //                 if (data.insuranceType === Insurance_Type.Motor) {
    //                     const vehicleHeaders = [
    //                         'RC Owner',
    //                         'Engine No.',
    //                         'Chassis No.',
    //                         'Date of Reg.',
    //                         'Vehicle No.',
    //                         'Vehicle Model-Make'
    //                     ];
    
    //                     const vehicleRows = [
    //                         [
    //                             data.vehicleDetails.rcOwnerName || 'N/A',
    //                             data.vehicleDetails.engineNumber || 'N/A',
    //                             data.vehicleDetails.chassisNumber || 'N/A',
    //                             data.vehicleDetails.dateOfReg || 'N/A',
    //                             data.vehicleDetails.vehicleNumber || 'N/A',
    //                             `${data.vehicleDetails.modelNumber || 'N/A'} - ${data.vehicleDetails.makingYear || 'N/A'}`
    //                         ]
    //                     ];
    //                     yPosition = drawTable(
    //                         'Vehicle Details',
    //                         vehicleHeaders,
    //                         vehicleRows,
    //                         50,
    //                         yPosition,
    //                         [100, 80, 80, 80, 80, 110]
    //                     );
    //                     doc.moveDown(1);
    //                 }
    
    //                 if (data.insuranceType === Insurance_Type.Health) {
    //                     if (data.dependentDetails && data.dependentDetails.length > 0) {
    //                         const dependentHeaders = ['Name', 'DOB', 'Gender', 'Height', 'Weight'];
    //                         const dependentRows = data.dependentDetails.map((person) => [
    //                             person.name || 'N/A',
    //                             person.dob,
    //                             person.gender,
    //                             `${person.height} cm`,
    //                             `${person.weight} kg`
    //                         ]);
    //                         yPosition = drawTable(
    //                             'Dependent Details',
    //                             dependentHeaders,
    //                             dependentRows,
    //                             50,
    //                             yPosition,
    //                             [100, 90, 80, 80, 80]
    //                         );
    //                         doc.moveDown(1);
    //                     }
    //                 }
    
    //                 if (data.insuranceType === Insurance_Type.Life) {
    //                     const insuredHeaders = ['Name', 'DOB', 'Gender', 'Height', 'Weight'];
    //                     const insuredRows = [
    //                         [
    //                             data?.insuredPersons?.name,
    //                             data?.insuredPersons?.dob,
    //                             data?.insuredPersons?.gender,
    //                             `${data.insuredPersons.height} cm`,
    //                             `${data.insuredPersons.weight} kg`
    //                         ]
    //                     ];
    //                     yPosition = drawTable(
    //                         'Insured Person Details',
    //                         insuredHeaders,
    //                         insuredRows,
    //                         50,
    //                         yPosition,
    //                         [130, 90, 80, 80, 80]
    //                     );
    //                     doc.moveDown(1);
    //                 }
    //                 // this is for message 1
    //                 const tableBottomY = yPosition;
    //                 const padding = 15;
    //                 if (data.insuranceType === Insurance_Type.Health) {
    //                     doc.fillColor('#242424').fontSize(10).font('DejaVuSans');
    //                     doc.text(
    //                         `Your family’s health and peace of mind are our top priority. We’ve carefully designed this insurance quotation keeping in mind both your present needs and your loved ones’ future security.`,
    //                         50,
    //                         tableBottomY + padding,
    //                         { width: 500 }
    //                     );
    //                 } else if (data.insuranceType === Insurance_Type.Life) {
    //                     doc.text(
    //                         `Your family’s financial security and peace of mind are our top priority. We’ve carefully designed this insurance quotation keeping in mind both your present needs and your loved ones’ future wellbeing.`,
    //                         50,
    //                         tableBottomY + padding,
    //                         { width: 500 }
    //                     );
    //                 } else if (data.insuranceType === Insurance_Type.Motor) {
    //                     doc.text(
    //                         `Your vehicle’s protection and your peace of mind are our top priority. We’ve carefully designed this insurance quotation keeping in mind both your present requirements and your future security on the road.`,
    //                         50,
    //                         tableBottomY + padding,
    //                         { width: 500 }
    //                     );
    //                 } else {
    //                     doc.text(
    //                         `We have customized product list suiting your requirements. Still if you feel the need for clarity, please contact to branch manager`,
    //                         50,
    //                         tableBottomY + padding,
    //                         { width: 500 }
    //                     );
    //                 }
    
    //                 doc.moveDown(1);
    
    //                 // === Quotes Table code start from here ===
    //                 const tableTop = doc.y + 10;
    //                 const labelWidth = 130; // Increased from 100 → wider "Details" column
    //                 const quoteWidth = 120; // Slightly reduced to balance table width if needed
    
    //                 let fields = [];
    //                 if (data.insuranceType === Insurance_Type.Health || data.insuranceType === Insurance_Type.Life) {
    //                     fields = ['Company', 'Product', 'Coverage', 'Premium', 'Remarks'];
    //                     // fields = ['Company', 'Product', 'Coverage', 'Benefits', 'Advantages', 'Remarks', 'Premium'];
    //                 }
    //                 if (data.insuranceType === Insurance_Type.Motor) {
    //                     fields = ['Company', 'IDV', 'Cover Type', 'NCB(%)', 'Premium', 'Coverage Included', 'Remarks'];
    //                 }
    
    //                 let fieldsBeforePremium = fields;
    //                 let fieldsAfterPremium = [];
    //                 if (data.insuranceType === Insurance_Type.Health || data.insuranceType === Insurance_Type.Life) {
    //                     const premiumIndex = fields.indexOf('Premium'); // is premium ke jagah coverage rakhna hai.
    //                     fieldsBeforePremium = fields.slice(0, premiumIndex + 1);
    //                     fieldsAfterPremium = fields.slice(premiumIndex + 1);
    //                 }
    
    //                 const fieldKeyMap = {
    //                     Company: 'companyName',
    //                     Product: 'productName',
    //                     Coverage: 'coverage',
    //                     Premium: 'premium',
    //                     // Benefits: 'benefits',
    //                     // Advantages: 'advantages',
    //                     Remarks: 'remarks',
    //                     IDV: 'idv',
    //                     'Cover Type': 'coverType',
    //                     'NCB(%)': 'ncb',
    //                     'Coverage Included': 'coverageIncluded'
    //                 };
    
    //                 let y = tableTop;
    //                 // --- Draw Header Row ("Details" and Company Logos) ---
    //                 doc.font('DejaVuSans-Bold')
    //                     .fontSize(9) // Reduced from 10
    //                     .fillColor('black');
    //                 doc.rect(50, y, labelWidth, 20).lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                 doc.fillColor('black');
    //                 doc.text('Details', 50 + 2, y + 5, { width: labelWidth - 4, align: 'center' });
    
    //                 // Fetch company logos for the header
    //                 const imageBuffers = await Promise.all(
    //                     data.quotes.map(async (quote) => {
    //                         try {
    //                             const response = await axios.get(quote.companyLogo, { responseType: 'arraybuffer' });
    //                             return Buffer.from(response.data, 'binary');
    //                         } catch (err) {
    //                             console.error(`Error fetching logo for ${quote.companyName}: ${err.message}`);
    //                             return null;
    //                         }
    //                     })
    //                 );
    
    //                 // Draw each company logo (or fallback text) in the header
    //                 data.quotes.forEach((quote, i) => {
    //                     const x = 50 + labelWidth + i * quoteWidth;
    //                     doc.rect(x, y, quoteWidth, 20).lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    
    //                     const imageBuffer = imageBuffers[i];
    //                     if (imageBuffer) {
    //                         doc.image(imageBuffer, x + 5, y + 2, {
    //                             fit: [quoteWidth - 10, 16],
    //                             align: 'center',
    //                             valign: 'center'
    //                         });
    //                     } else {
    //                         doc.fillColor('black').text(`Quote ${i + 1}`, x + 5, y + 5, {
    //                             width: quoteWidth - 10,
    //                             align: 'center'
    //                         });
    //                     }
    //                 });
    //                 y += 20;
    
    //                 // Quote Details with Adjusted Dynamic Heights
    //                 doc.font('DejaVuSans')
    //                     .fontSize(9) // Reduced from 9
    //                     .fillColor('black');
    
    //                 fieldsBeforePremium.forEach((field, fieldIndex) => {
    //                     // Step 1: Calculate the height needed for the field name (e.g., "Features")
    //                     doc.font('DejaVuSans'); // Set font for the label
    //                     const labelHeight = doc.heightOfString(field, {
    //                         width: labelWidth - 10,
    //                         align: 'center'
    //                     });
    
    //                     // Step 2: Calculate the height needed for each quote value in this row
    //                     const quoteHeights = data.quotes.map((quote) => {
    //                         const key = fieldKeyMap[field];
    //                         const value = quote[key] || 'N/A';
    //                         doc.font('DejaVuSans'); // Set font for the value
    //                         const baseHeight = doc.heightOfString(value.toString(), {
    //                             width: quoteWidth - 10,
    //                             align: 'center'
    //                         });
    //                         const lineCount = Math.ceil(baseHeight / (doc.currentLineHeight() || 9));
    //                         const adjustedHeight = baseHeight + (lineCount - 1) * 2;
    //                         return adjustedHeight;
    //                     });
    
    //                     // Step 3: Determine the row height as the tallest cell in this row, with padding
    //                     const baseRowHeight = Math.max(labelHeight, ...quoteHeights, 15);
    //                     const rowHeight = baseRowHeight + 10;
    
    //                     y = ensureSpace(doc, rowHeight, y);
    
    //                     // Step 4: Draw the field name cell (e.g., "Features") with dynamic height
    //                     doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                     doc.fillColor('#0055A5');
    //                     doc.rect(50, y, labelWidth, rowHeight).stroke().fill();
    //                     doc.fillColor('black')
    //                         .font('DejaVuSans-Bold')
    //                         .text(field, 50 + 5, y + 5, {
    //                             width: labelWidth - 10,
    //                             align: 'center'
    //                         });
    
    //                     // Step 5: Draw each quote value cell in this row with dynamic height
    //                     data.quotes.forEach((quote, quoteIndex) => {
    //                         const x = 50 + labelWidth + quoteIndex * quoteWidth;
    //                         const key = fieldKeyMap[field];
    //                         const value = quote[key] || 'N/A';
    
    //                         doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                         doc.fillColor('#0055A5');
    //                         doc.rect(x, y, quoteWidth, rowHeight).stroke().fill();
    //                         doc.fillColor('black')
    //                             .font('DejaVuSans')
    //                             .text(value.toString(), x + 5, y + 5, {
    //                                 width: quoteWidth - 10,
    //                                 align: 'center'
    //                             });
    //                     });
    
    //                     // Step 6: Move down by the dynamic row height
    //                     y += rowHeight;
    //                 });
    
    //                 const numQuotes = data.quotes.length;
    //                 const totalWidth = labelWidth + numQuotes * quoteWidth;
    
    //                 // Merged row for Basic Features
    //                 y = ensureSpace(doc, 20, y);
    //                 doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                 doc.fillColor('#0055A5');
    //                 doc.rect(50, y, totalWidth, 20).stroke().fill();
    //                 doc.fillColor('black');
    //                 doc.font('DejaVuSans-Bold')
    //                     .fontSize(9) // Reduced from 10
    //                     .text('Basic Features', 50 + 5, y + 5, { width: totalWidth - 10 });
    //                 y += 20;
    //                 // here is code for basic features details
    //                 y = drawComparisonTable(doc, finalBasicData, 50, y, true);
    
    //                 // Merged row for Add-on Features
    //                 y = ensureSpace(doc, 20, y);
    //                 y = ensureSpace(doc, 20, y);
    //                 doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                 doc.fillColor('#0055A5');
    //                 doc.rect(50, y, totalWidth, 20).stroke().fill();
    //                 doc.fillColor('black');
    //                 doc.font('DejaVuSans-Bold')
    //                     .fontSize(9) // Reduced from 10
    //                     .text('Add-on Features', 50 + 5, y + 5, { width: totalWidth - 10 });
    //                 y += 20;
    
    //                 y = drawComparisonTable(doc, finalAddOnData, 50, y, true);
    
    //                 fieldsAfterPremium.forEach((field, fieldIndex) => {
    //                     // Step 1: Calculate the height needed for the field name (e.g., "Features")
    //                     doc.font('DejaVuSans-Bold'); // Set font for the label
    //                     const labelHeight = doc.heightOfString(field, {
    //                         width: labelWidth - 10,
    //                         align: 'center'
    //                     });
    
    //                     // Step 2: Calculate the height needed for each quote value in this row
    //                     const quoteHeights = data.quotes.map((quote) => {
    //                         const key = fieldKeyMap[field];
    //                         const value = quote[key] || 'N/A';
    //                         doc.font('DejaVuSans'); // Set font for the value
    //                         const baseHeight = doc.heightOfString(value.toString(), {
    //                             width: quoteWidth - 10,
    //                             align: 'center'
    //                         });
    //                         const lineCount = Math.ceil(baseHeight / (doc.currentLineHeight() || 9));
    //                         const adjustedHeight = baseHeight + (lineCount - 1) * 2;
    //                         return adjustedHeight;
    //                     });
    
    //                     // Step 3: Determine the row height as the tallest cell in this row, with padding
    //                     const baseRowHeight = Math.max(labelHeight, ...quoteHeights, 15);
    //                     const rowHeight = baseRowHeight + 5;
    
    //                     y = ensureSpace(doc, rowHeight, y);
    
    //                     // Step 4: Draw the field name cell (e.g., "Features") with dynamic height
    //                     doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                     doc.fillColor('#0055A5');
    //                     doc.rect(50, y, labelWidth, rowHeight).stroke().fill();
    //                     doc.fillColor('black')
    //                         .font('DejaVuSans-Bold')
    //                         .text(field, 50 + 5, y + 5, {
    //                             width: labelWidth - 10,
    //                             align: 'center'
    //                         });
    
    //                     // Step 5: Draw each quote value cell in this row with dynamic height
    //                     data.quotes.forEach((quote, quoteIndex) => {
    //                         const x = 50 + labelWidth + quoteIndex * quoteWidth;
    //                         const key = fieldKeyMap[field];
    //                         const value = quote[key] || 'N/A';
    
    //                         doc.lineWidth(0.5).fillAndStroke('#FFFFFF', '#0055A5');
    //                         doc.fillColor('#0055A5');
    //                         doc.rect(x, y, quoteWidth, rowHeight).stroke().fill();
    //                         doc.fillColor('black')
    //                             .font('DejaVuSans')
    //                             .text(value.toString(), x + 5, y + 5, {
    //                                 width: quoteWidth - 10,
    //                                 align: 'center'
    //                             });
    //                     });
    
    //                     // Step 6: Move down by the dynamic row height
    //                     y += rowHeight;
    //                 });
    
    //                 // === NEW QUOTES COMPARISON TABLE ===
    //                 doc.moveTo(50, y + 10)
    //                     .lineTo(530, y + 10)
    //                     .lineWidth(0.5)
    //                     .strokeColor('#cccccc')
    //                     .stroke();
    //                 doc.moveDown(3);
    
    //                 doc.fillColor('#242424').fontSize(10).font('DejaVuSans');
    //                 doc.text(
    //                     `We hope this quotation brings clarity and confidence in making the right choice. Our team is always here to walk you through every detail. Please don’t hesitate to reach out if you’d like a personal consultation.`,
    //                     50,
    //                     doc.y
    //                 );
    //                 // -------------------------------
    //                 const footerX = 50;
    //                 const pageWidth = doc.page.width;
    //                 const bottomMargin = 50;
    
    //                 // Footer elements' heights
    //                 const phoneHeight = 12;
    //                 const addressHeight = 12;
    //                 const copyrightHeight = 10;
    //                 const lineHeight = 2;
    //                 const spacing = 5;
    
    //                 const footerTotalHeight =
    //                     phoneHeight + spacing + addressHeight + spacing + copyrightHeight + spacing + lineHeight;
    
    //                 // Calculate Y to position footer at the bottom
    //                 let footerY = doc.page.height - bottomMargin - footerTotalHeight;
    
    //                 // --- Phone Number ---
    //                 doc.image(phonePath, footerX, footerY, { width: 10, height: 10 });
    //                 doc.fontSize(9).fillColor(colors.text).font('DejaVuSans');
    //                 doc.text(`${data.branch.contact}`, footerX + 12, footerY);
    
    //                 footerY += phoneHeight + spacing;
    //                 doc.image(locationPath, footerX, footerY, { width: 10, height: 10 }); // adjust y offset if needed
    //                 doc.fontSize(8.5).fillColor(colors.text).font('DejaVuSans');
    //                 doc.text(data.branch.address, footerX + 12, footerY); // text starts a bit right of icon
    
    //                 footerY += addressHeight + spacing;
    
    //                 // --- Copyright (centered) ---
    //                 doc.fontSize(7.5).fillColor(colors.lightText).font('DejaVuSans');
    //                 doc.text('© 2025 Acumen Insurance. All rights reserved.', 0, footerY, {
    //                     align: 'center',
    //                     width: pageWidth
    //                 });
    
    //                 footerY += copyrightHeight + spacing;
    
    //                 // --- Decorative Line ---
    //                 doc.moveTo(50, footerY)
    //                     .lineTo(pageWidth - 50, footerY)
    //                     .lineWidth(0.5)
    //                     .strokeColor('#668cff')
    //                     .stroke();
    
    //                 doc.end();
    //             } catch (err) {
    //                 reject(err);
    //             }
    //         });
    //     }
    
}
