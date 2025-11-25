import {
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InsuranceTicket } from './entities/insurance-ticket.entity';
import { Repository } from 'typeorm';
import { CreateInsuranceTicketDto, UpdateInsuranceTicketDto } from './dto/insurance-ticket.dto';
import { InsuranceAssignedTo } from './entities/insurance-ticket-assignedTo.entity';
import { InsuranceAgent } from '@modules/insurance-ticket/entities/insurance-agent.entity';
import { User } from '@modules/user/user.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import {
    addDays,
    addHours,
    Client_Type,
    Current_Step,
    Insurance_Type,
    isUserAuthorizedToAccessTicket,
    MedicalDetails,
    Pre_Existing_Diseases,
    RoleId,
    Roles,
    TICKET_LOG_EVENTS,
    Ticket_Status,
    Ticket_Type,
    TicketResponse
} from 'src/utils/app.utils';
import { ProposersMedical } from './entities/proposer-medical-details.entity';
import { DependentMedical } from './entities/dependent-medical-details.entity';
import { InsuranceDependent } from './entities/insurance-dependent.entity';
import { InsuredPerson } from './entities/insured-person.entity';
import { InsuredMedical } from './entities/insured-medical.entity';
import { InsuranceVehicleDetails } from './entities/insurance-vehicle-details.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { TicketNotificationService } from '@modules/insurance-escalation/ticket-notification-service';
import { add } from 'lodash';
import { Cron } from '@nestjs/schedule';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { Role } from '@modules/role/entities/role.entity';
import Redis from 'ioredis';
import { QuoteEntity } from '@modules/insurance-quotations/entities/quote.entity';
import { RoleService } from '@modules/role/role.service';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';
import { InsurancePolicyService } from '@modules/insurance-policy/insurance-policy.service';
import { InsuranceNominee } from './entities/insurance-nominee-details.entity';
@Injectable()
export class InsuranceTicketService {
    constructor(
        @InjectRepository(InsuranceAssignedTo)
        private readonly assignedTo: Repository<InsuranceAssignedTo>,

        @InjectRepository(InsuranceTicket)
        private readonly ticketRepo: Repository<InsuranceTicket>,

        @InjectRepository(InsuranceAgent)
        private readonly agent: Repository<InsuranceAgent>,

        @InjectRepository(InsuranceUser)
        private readonly insUserRepo: Repository<InsuranceUser>,

        @InjectRepository(InsuranceAgent)
        private readonly agentRepo: Repository<InsuranceAgent>,

        @InjectRepository(Branch)
        private readonly branchRepo: Repository<Branch>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(ProposersMedical)
        private readonly proposerMedicalRepo: Repository<ProposersMedical>,

        @InjectRepository(InsuranceDependent)
        private readonly dependentRepo: Repository<InsuranceDependent>,

        @InjectRepository(DependentMedical)
        private readonly dependentMediRepo: Repository<DependentMedical>,

        @InjectRepository(InsuredPerson)
        private readonly insuredPersonRepo: Repository<InsuredPerson>,

        @InjectRepository(InsuredMedical)
        private readonly insuredMediRepo: Repository<InsuredMedical>,

        @InjectRepository(InsuranceVehicleDetails)
        private readonly vehicleDetailsRepo: Repository<InsuranceVehicleDetails>,

        @InjectRepository(QuoteEntity)
        private readonly quoteRepo: Repository<QuoteEntity>,

        @InjectRepository(InsuranceProduct)
        private readonly productRepo: Repository<InsuranceProduct>,
        private readonly ticketNotiService: TicketNotificationService,
        private readonly loggedInsUserService: LoggedInsUserService,
        private readonly policyService: InsurancePolicyService,

        @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
        private readonly roleService: RoleService
    ) {}

    async createTicket(requestParam: CreateInsuranceTicketDto, req: any): Promise<InsuranceTicket> {
        let createdBy = null;
        let agentId = null;
        let entityNotFound = false;
        if (req.user) {
            const dbUser = await this.userRepo.findOne(req.user.email);
            if (dbUser) {
                createdBy = dbUser.id;
            }
        }
        const client = await this.insUserRepo.findOne({
            where: { id: requestParam.clientId }
        });
        if (!client) {
            entityNotFound = true;
            console.log('log 1');
        }
        if (requestParam.assignTo || requestParam.assignTo != null) {
            const agent = await this.agentRepo.findOne({
                where: { id: requestParam.assignTo }
            });
            if (!agent) {
                entityNotFound = true;
                console.log('log 2');
            }
            agentId = agent.id;
            console.log('log 3');
        }
        if (entityNotFound) {
            console.log('log 4');
            throw new NotFoundException('Invalid client or agent.');
        }

        const ticketQuery = 'CALL ins_insuranceTicket(?, ?, ?, ?, ?, ?)';
        const result = await this.ticketRepo.query(ticketQuery, [
            requestParam.clientId,
            requestParam.insuranceType,
            agentId,
            requestParam.agentRemarks,
            requestParam.othersRemarks,
            createdBy
        ]);
        if (result[0][0].RESCODE != 1) {
            console.log('api-/insurance-ticket/create-', result[0][0].RESMSZ);
            throw new InternalServerErrorException('Error in creating insurance purchased product.');
        }

        return result[0][0];
    }
    //------ reassigned agent ------
    async reAssignedTicket(reqBody: any): Promise<any> {
        try {
            const { ticketId, assignedTo } = reqBody;
            //  .log('reqBody is---->', ticketId, assignedTo );
            const userEntity = this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                throw new UnauthorizedException('User not found');
            }
            const ticketQuery = 'CALL update_ticketAssignedTo(?, ?, ?)';
            const agent = await this.userRepo.findOne({ where: { id: assignedTo } });
            if (!agent) {
                throw new Error(`Assigned Person with ID ${agent.id} not found`);
            }
            const result = await this.assignedTo.query(ticketQuery, [ticketId, assignedTo, userEntity.id]);

            if (result[0][0].RESCODE != 1) {
                console.log('api-/insurance-ticket/reAssignedTicket-', result[0][0].RESMSZ);
                throw new InternalServerErrorException('Error in creating insurance ticket');
            }
            return result[0][0];
        } catch (error) {
            console.log('error is---->', error.message);
            throw new Error('Error in reassigning ticket');
        }
    }

    //------  update insurance ticket ------
    async updateTicket(requestParam: UpdateInsuranceTicketDto, req: any): Promise<InsuranceTicket> {
        let createdBy = null;
        const ticket = await this.ticketRepo.findOne({
            where: { id: requestParam.ticketId },
            relations: ['clientId', 'assignTo']
        });
        if (!ticket) {
            throw new Error(`Ticket with ID ${requestParam.ticketId} not found`);
        }
        if (req.user) {
            const dbUser = await this.userRepo.findOne(req.user.email);
            if (dbUser) {
                createdBy = dbUser.id;
            }
        }

        const query = 'CALL update_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        const result = await this.ticketRepo.query(query, [
            requestParam.ticketId,
            requestParam.ticketStatus,
            requestParam.agentRemarks,
            requestParam.othersRemarks,
            createdBy,
            requestParam.isActive,
            ticket.ticketNumber,
            ticket.insuranceUserId,
            ticket.assignTo.id,
            ticket.insuranceType
        ]);
        if (result[0][0].RESCODE != 1) {
            console.log('api-/insurance-ticket/update-', result[0][0].RESMSZ);
            throw new InternalServerErrorException('Error in update insurance ticket');
        }
        return result[0][0];
    }

    async getAllTickets(): Promise<InsuranceTicket[]> {
        const query = 'CALL get_AllInsuranceTicket()';
        const result = await this.ticketRepo.query(query);
        return result[0];
    }

    async getTicketById(reqObj: any): Promise<InsuranceTicket | null> {
        const query = 'CALL get_InsuranceTicketById(?, ?)';
        const result = await this.ticketRepo.query(query, [reqObj.id, reqObj.ticketNumber]);
        return result[0];
    }

    //this api is for getting all ticket card on dashboard
    async getTicket(reqObj: any): Promise<InsuranceTicket[]> {
        const loggedInUser = this.loggedInsUserService.getCurrentUser();
        if (!loggedInUser) {
            throw new UnauthorizedException('User not logged in');
        }

        let agentId = null;
        if (loggedInUser.userType.id == RoleId.staff) {
            agentId = loggedInUser.id;
        } else {
            agentId = reqObj.agentId;
        }
        // console.log("this is main ticket card.....");

        // else if (loggedInUser.userType.id == RoleId.superadmin || loggedInUser.userType.id == RoleId.admin) {
        //     agentId = null;
        // const cacheKey = `getInsuranceTicket:${reqObj.userId}:${agentId}:${reqObj.fromDate}:${reqObj.toDate}`;

        // Try fetching from Redis
        // const cached = await this.redisClient.get(cacheKey);
        //  console.log('in get ticket reqobje is: ++++++++++++++++++++++++++++', cached);
        // if (cached) {
        //     return JSON.parse(cached);
        // }
        const query = 'CALL get_InsuranceTicket(?, ?, ?, ?, ?, ?)';
        // console.log('getTicket reqBody', reqObj.userId, agentId, reqObj.fromDate, reqObj.toDate, reqObj.ticketStatus);
        const result = await this.ticketRepo.query(query, [
            reqObj.userId,
            agentId,
            reqObj.fromDate,
            reqObj.toDate,
            loggedInUser.userType.id,
            reqObj.ticketStatus
        ]);
        const tickets = result[0];
        // await this.redisClient.set(cacheKey, JSON.stringify(tickets), 'EX', 300);

        return tickets;
    }

    async getAllTicketsByTicketNumber(ticketNumber: number): Promise<InsuranceTicket[]> {
        return await this.ticketRepo
            .createQueryBuilder('ticket')
            .where('ticket.ticketNumber = :ticketNumber', { ticketNumber })
            .getMany();
    }

    // ============================ api for create ticket ============================

    async createInsuranceTicket(reqBody: any, req: any): Promise<any> {
        // let userEntity = req.user ? await this.userRepo.findOne({ where: { email: req.user.email } }) : null;
        let userEntity = await this.loggedInsUserService.getCurrentUser();

        if (!userEntity) {
            return {
                status: 'error',
                message: 'Logged user not found',
                data: null
            };
        }

        let { userDetails, ticketDetails } = reqBody;
         // Check if required sections exist
        if (!userDetails || !ticketDetails) {
            return {
                status: 'error',
                message: 'Missing userDetails or ticketDetails',
                data: null
            };
        }
        // console.log("before branch details",ticketDetails.assignedTo,  userEntity, ticketDetails.branchId);
         
        let assignPerson = await this.userRepo.findOne({ where: { id: ticketDetails.assignedTo }, relations:['branch'] });
    //    console.log("here is assign person details", assignPerson);
       
        let tempBranchId = null;
        if(ticketDetails.branchId){
                tempBranchId = ticketDetails.branchId;
                // console.log("console 1", tempBranchId);
                
        }else if(userEntity?.branch?.id){
            tempBranchId = userEntity?.branch?.id;
            //  console.log("console 2", tempBranchId);
        }else{
            tempBranchId = assignPerson?.branch?.id;
            //  console.log("console 3", tempBranchId);
        }
        // console.log("here is temp branch id", tempBranchId);
        
           const branch = await this.branchRepo.findOne({ where: { id: tempBranchId } });
            if (!branch) {
                return {
                    status: 'error',
                    message: 'Invalid branch ID provided',
                    data: {
                        insuranceUserId: null,
                        ticketId: null
                    }
                };
            }
            // console.log("here is branch data ", branch);

        // console.log("in ticket createion assigen person is-",ticketDetails.assigned, assignPerson)
        // Initial response object
        const response = {
            status: 'success',
            message: 'Insurance ticket created successfully',
            data: {
                insuranceUserId: null,
                ticketId: null
            }
        };

        const {
            name,
            gender,
            dateOfBirth,
            primaryContactNumber,
            secondaryContactNumber,
            emailId,
            employmentType,
            annualIncome,
            currentAddress,
            currentCity,
            currentState,
            currentPinCode,
            permanentAddress,
            permanentCity,
            permanentState,
            permanentPinCode,
            documents
        } = userDetails;

        if (!name || !gender || !primaryContactNumber || !emailId) {
            return {
                status: 'error',
                message: 'Missing required fields in userDetails (name, gender, primaryContactNumber, emailId)',
                data: null
            };
        }

        let userDocuments = documents && Object.keys(documents).length > 0 ? JSON.stringify(documents) : null;
        let userId: number;
        let savedInsuranceUser: any;
        let ticketId = null;

        try {
            const existingUser = await this.insUserRepo.findOne({ where: { primaryContactNumber } });

            // Step 1: Handle User Details(check if user is new. in this if new client selected then check either user is exist or not. and if other selected then check again it should exists. then it update)
            if (ticketDetails.clientType === Client_Type.NEW_CLIENT) {
                if (existingUser) {
                    return {
                        status: 'error',
                        message: `User already exists with mobile no: ${primaryContactNumber}`,
                        data: {
                            insuranceUserId: existingUser.id,
                            ticketId: null
                        }
                    };
                }

                savedInsuranceUser = await this.insUserRepo.save({
                    name,
                    gender,
                    dateOfBirth,
                    primaryContactNumber,
                    secondaryContactNumber,
                    emailId,
                    employmentType,
                    annualIncome,
                    currentAddress,
                    currentCity,
                    currentState,
                    currentPinCode,
                    permanentAddress,
                    permanentCity,
                    permanentState,
                    permanentPinCode,
                    branch: branch,
                    documents: userDocuments,
                    createdBy: userEntity
                });
                userId = savedInsuranceUser.id;
            } else {
                if (!existingUser) {
                    return {
                        status: 'error',
                        message: `User with mobile no: ${primaryContactNumber} not found`,
                        data: null
                    };
                }

                await this.insUserRepo.update(existingUser.id, {
                    name,
                    gender,
                    dateOfBirth,
                    primaryContactNumber,
                    secondaryContactNumber,
                    emailId,
                    employmentType,
                    annualIncome,
                    currentAddress,
                    currentCity,
                    currentState,
                    currentPinCode,
                    permanentAddress,
                    permanentCity,
                    permanentState,
                    permanentPinCode,
                    // documents: userDocuments,
                    createdBy: userEntity
                });
                savedInsuranceUser = await this.insUserRepo.findOne({ where: { id: existingUser.id } });
                userId = savedInsuranceUser.id;
            }

            // Step 2: Create Ticket

            let currentStepTimeline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
            console.log("ticket details ticket type", ticketDetails.insuranceType)
            const ticketNumberResult = await this.ticketRepo.query('CALL get_ticketNumber(?)',[ticketDetails.insuranceType]  );
             const newTicketNumber = ticketNumberResult[0][0].ticketNumber;
            console.log('newTicketNumber', newTicketNumber);
            let ticketDocuments = [];
            if (ticketDetails.ticketType === Ticket_Type.PORT) {
                ticketDocuments = [{ name: 'portDocument', url: ticketDetails.portDocument }];
            }
            const ticket = await this.ticketRepo.save({
                insuranceUserId: savedInsuranceUser,
                ticketNumber: newTicketNumber,
                ticketType: ticketDetails.ticketType,
                insuranceType: ticketDetails.insuranceType,
                policyHolderType: ticketDetails.policyHolderType,
                familyMemberType: ticketDetails.familyMemberType,
                agentRemarks: ticketDetails.agentRemarks,
                othersRemarks: ticketDetails.othersRemarks,
                ticketStatus: Ticket_Status.OPEN,
                clientType: ticketDetails.clientType,
                coveragedRequired: ticketDetails.coveragedRequired,
                preferredCompany: ticketDetails.preferredCompany,
                preferredProduct: ticketDetails.preferredProduct,
                prePolicyNumber: ticketDetails.prePolicyNumber || null,
                preInsuranceComapny: ticketDetails.preInsuranceComapny || null,
                isPreYearClaim: ticketDetails.isPreYearClaim || false,
                nomineeName: ticketDetails.nomineeName || null,
                nomineeRelation: ticketDetails.nomineeRelation || null,
                nomineeMobileNumber: ticketDetails.nomineeMobileNumber || null,
                nomineeEmailId: ticketDetails.nomineeEmailId || null,
                assignTo: assignPerson, // hardcoded as per original
                branch: branch,
                documents: ticketDocuments || null,
                currentStepStart: Current_Step.INITIAL_REVIEW,
                currentStepStartAt: new Date(),
                nextStepStart: Current_Step.DOCUMENT_COLLECTED,
                nextStepDeadline: addDays(3),
                userPreferredAmount: ticketDetails.userPreferredAmount || null,
                PrimiumPaymentTerm: ticketDetails.PrimiumPaymentTerm || null,
                policyTerm: ticketDetails.policyTerm || null,
                coverageType: ticketDetails.coverageType || null,
                preIdf: ticketDetails.preIdf || null,
                endorsmentToNoted: ticketDetails.endorsmentToNoted || null,
                insurancePurpose: ticketDetails.insurancePurpose || null,
                isActive: true,
                createdBy: userEntity
            });

            ticketId = ticket.id;
            // console.log('checking id here', ticketId, userId, ticketDetails.assignedTo, userEntity.id);
            if (ticketId > 0) {
                const query = 'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
                await this.ticketRepo.query(query, [
                    ticketId,
                    newTicketNumber,
                    userId,
                    ticketDetails.assignedTo || null,
                    Ticket_Status.OPEN,
                    TICKET_LOG_EVENTS.TICKET_CREATED_AND_ASSIGNED,
                    Current_Step.INITIAL_REVIEW,
                    new Date(),
                    Current_Step.DOCUMENT_COLLECTED,
                    addDays(3),
                    ticketDetails.insuranceType,
                    ticketDetails.agentRemarks,
                    ticketDetails.othersRemarks,
                    userEntity.id
                ]);
            }
            await this.ticketNotiService.scheduleDeadlineNotification(
                ticketId,
                Current_Step.INITIAL_REVIEW,
                addDays(3)
            );
            // Update response with successful creation data
            response.data.insuranceUserId = userId;
            response.data.ticketId = ticketId;
        } catch (error) {
            // console.log('-api/insurance-ticket/createInsuranceTicket', error.message);
            return {
                status: 'error',
                message: 'Internal server error: ' + error.message,
                data: {
                    insuranceUserId: userId || null,
                    ticketId: ticketId || null
                }
            };
        }

        return response;
    }

    async getAllAgent(): Promise<any> {
        const query = 'CALL get_allAgent()';

        const result = await this.agentRepo.query(query);
        // console.log(result[0]);
        return result[0];
    }


        async getEmployee(): Promise<any> {
        const query = 'CALL get_acumenEmployee()';

        const result = await this.userRepo.query(query);
        // console.log(result[0]);
        return result[0];
    }
    // ============================ api for get ticket details ============================

    async getTicketDetails(ticketId: number): Promise<TicketResponse> {
        try {
            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            if (!loggedInUser) {
                throw new UnauthorizedException('User not logged in');
            }
            const userRole = loggedInUser.userType.roleName;
            // Optimized query with specific relations
            const ticket = await this.ticketRepo
                .createQueryBuilder('ticket')
                .leftJoinAndSelect('ticket.insuranceUserId', 'insuranceUserId')
                .leftJoinAndSelect('ticket.proposerMedical', 'proposerMedical')
                .leftJoinAndSelect('ticket.insuranceDependent', 'insuranceDependent')
                .leftJoinAndSelect('ticket.dependentMedical', 'dependentMedical')
                .leftJoinAndSelect('dependentMedical.dependentId', 'dependentId') // Load dependentId relation
                .leftJoinAndSelect('ticket.vehicleDetails', 'vehicleDetails')
                .leftJoinAndSelect('ticket.insuredPersons', 'insuredPersons')
                .leftJoinAndSelect('ticket.insuredMedical', 'insuredMedical')
                .leftJoinAndSelect('ticket.assignTo', 'assignTo') // ← add this line
                .leftJoinAndSelect('ticket.createdBy', 'createdBy')
                .leftJoinAndSelect('createdBy.branch', 'branch')
                .leftJoinAndSelect('ticket.nominee', 'nominee')
                .where('ticket.id = :ticketId', { ticketId })
                .getOne();
            //  console.log("toicket detailslskjdkfjdk", ticket);

            if (!ticket) {
                return {
                    status: 'error',
                    message: 'Ticket not found',
                    data: null
                };
            }

            if (!ticket.insuranceUserId) {
                return {
                    status: 'error',
                    message: 'Insurance user not found for this ticket',
                    data: null
                };
            }

            if (!isUserAuthorizedToAccessTicket(loggedInUser, ticket)) {
                return {
                    status: 'error',
                    message: 'You are not authorized to view this ticket',
                    data: null
                };
            }

            // Utility function to get latest medical record (for proposer and insured)
            const getLatestMedical = (records: any[]): any | null => {
                if (!records?.length) return null;
                return records.reduce((latest, current) =>
                    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                );
            };

            // Utility function to format medical details
            const formatMedicalDetails = (details: any): MedicalDetails => ({
                height: details?.height ?? null,
                weight: details?.weight ?? null,
                preExistDiseases: details?.preExistDiseases ?? Pre_Existing_Diseases.NONE,
                othersDiseases: details?.othersDiseases ?? null,
                medication: details?.medication ?? null,
                bloodGroup: details?.bloodGroup ?? null,
                isPastSurgery: details?.isPastSurgery ?? false,
                isChronicCondition: details?.isChronicCondition || null,
                dischargeSummary: details?.dischargeSummary || null,
                diagnosticReport: details?.diagnosticReport || null,
                isSmoker: details?.isSmoker ?? false,
                isDrinker: details?.isDrinker ?? false,
                documents: details?.documents ?? null,
                updatedBy: details?.updatedBy?.id ?? null,
                updatedAt: details?.updatedAt ?? null
            });

            // Get latest medical details for proposer and insured
            const medicalDetails = getLatestMedical(ticket.proposerMedical);
            const insuredMedicalDetails = getLatestMedical(ticket.insuredMedical);

            // console.log('medical details of insuredMedicalDetails', insuredMedicalDetails);
            return {
                status: 'success',
                message: 'Ticket details fetched successfully',
                data: {
                    ticketId: ticket.id,
                    ticketNumber: ticket.ticketNumber,
                    insuranceType: ticket.insuranceType,
                    ticketStatus: ticket.ticketStatus,
                    includeSelfAsDependent: ticket.includeSelfAsDependent ?? false,
                    preferredCompany: ticket.preferredCompany ?? null,
                    preferredProduct: ticket.preferredProduct ?? null,
                    policyHolderType: ticket.policyHolderType ?? null,
                    coveragedRequired: ticket.coveragedRequired ?? null,
                    userPreferredAmount: ticket.userPreferredAmount ?? null,
                    insurancePurpose: ticket.insurancePurpose ?? null,
                    PrimiumPaymentTerm: ticket.PrimiumPaymentTerm ?? null,
                    policyTerm: ticket.policyTerm ?? null,
                    prePolicyNumber: ticket.prePolicyNumber ?? null,
                    preInsuranceComapny: ticket.preInsuranceComapny ?? null,
                    preIdf: ticket.preIdf ?? null,
                    endorsmentToNoted: ticket.endorsmentToNoted ?? null,
                    coverageType: ticket.coverageType ?? null,
                    isPreYearClaim: ticket.isPreYearClaim ?? false,
                    assignedTo: ticket.assignTo?.id ?? null,
                    assignedName: ticket.assignTo
                        ? `${ticket.assignTo.firstName || ''} ${ticket.assignTo.middleName ? ticket.assignTo.middleName + ' ' : ''}${ticket.assignTo.lastName || ''}`.trim()
                        : null,
                    currentStep: ticket.currentStepStart ?? null,
                    isDocumentCollected: ticket.isDocumentCollected ?? false,
                    documents: ticket.documents ?? null,
                    nextStepDeadline: ticket.nextStepDeadline ?? null,
                    agentRemarks: ticket.agentRemarks ?? null,
                    othersRemarks: ticket.othersRemarks ?? null,
                    updatedBy: ticket.updatedBy?.id ?? null,
                    updatedAt: ticket.updatedAt ?? null,
                    insuranceUser: {
                        name: ticket.insuranceUserId.name,
                        gender: ticket.insuranceUserId.gender,
                        primaryContactNumber: ticket.insuranceUserId.primaryContactNumber,
                        secondaryContactNumber: ticket.insuranceUserId.secondaryContactNumber ?? null,
                        emailId: ticket.insuranceUserId.emailId,
                        employmentType: ticket.insuranceUserId.employmentType,
                        dateOfBirth: ticket.insuranceUserId.dateOfBirth ?? null,
                        address: ticket.insuranceUserId.permanentAddress ?? null,
                        pinCode: ticket.insuranceUserId.permanentPinCode ?? null,
                        adharNumber: ticket.insuranceUserId.adharNumber ?? null,
                        panNumber: ticket.insuranceUserId.panNumber ?? null,
                        // nomineeName: ticket.nomineeName ?? null,
                        // nomineeRelation: ticket.nomineeRelation ?? null,
                        // nomineeMobileNumber: ticket.nomineeMobileNumber ?? null,
                        // nomineeEmailId: ticket.nomineeEmailId ?? null,
                        updatedBy: ticket.insuranceUserId.updatedBy?.id ?? null,
                        updatedAt: ticket.insuranceUserId.updatedAt ?? null,
                        documents: ticket.insuranceUserId.documents ?? null
                    },
                    nomineeDetails: {
                        id:ticket?.nominee?.id ?? null,
                        name: ticket?.nominee?.name ?? null,
                        gender: ticket?.nominee?.gender ?? null,
                        relation: ticket?.nominee?.relation ?? null,
                        contactNumber: ticket?.nominee?.primaryContactNumber ?? null,
                        dateOfBirth: ticket?.nominee?.dateOfBirth ?? null,
                    },
                    medicalDetails: formatMedicalDetails(medicalDetails),
                    // ticket.insuranceDependent?.map((dep) => {
                    //                             const depMedical =
                    //                                 ticket.dependentMedical?.find((dm) => dm.dependentId?.id === dep.id) || null;
                    dependents:
                        ticket.insuranceDependent?.map((dep) => {
                            const depMedical = ticket.dependentMedical?.find((dm) => dm.dependentId?.id === dep.id);
                            // console.log('console 1  ))))))))))))) ', ticket.insuranceDependent);
                            // console.log('console 2  ))))))))))))) ', ticket.dependentMedical);
                            // console.log('console 3  ))))))))))))) ', depMedical);

                            return {
                                id: dep.id,
                                name: dep.name,
                                dateOfBirth: dep.dateOfBirth || null,
                                gender: dep.gender || null,
                                primaryContactNumber: dep.primaryContactNumber || null,
                                relation: dep.relation || null,
                                medicalDetails: formatMedicalDetails(depMedical)
                            };
                        }) || [],
                    vehicleDetails: ticket.vehicleDetails?.[0]
                        ? {
                              id: ticket.vehicleDetails[0].id,
                              vehicleType: ticket.vehicleDetails[0].vehicleType,
                              vehicleNumber: ticket.vehicleDetails[0].vehicleNumber,
                              makingYear: ticket.vehicleDetails[0].makingYear ?? null,
                              vehicleName: ticket.vehicleDetails[0].vehicleName ?? null,
                              modelNumber: ticket.vehicleDetails[0].modelNumber ?? null,
                              rcOwnerName: ticket.vehicleDetails[0].rcOwnerName ?? null,
                              engineNumber: ticket.vehicleDetails[0].engineNumber ?? null,
                              chassisNumber: ticket.vehicleDetails[0].chassisNumber ?? null,
                              dateOfReg: ticket.vehicleDetails[0].dateOfReg ?? null,
                              madeBy: ticket.vehicleDetails[0].madeBy ?? null,
                              vehicleCategory: ticket.vehicleDetails[0].vehicleCategory ?? null,
                              othersVehicleCategory: ticket.vehicleDetails[0].othersVehicleCategory ?? null,
                              seatingCapacity: ticket.vehicleDetails[0].seatingCapacity ?? null,
                              grossVehicleWeight: ticket.vehicleDetails[0].grossVehicleWeight ?? null,
                              overTurning: ticket.vehicleDetails[0].overTurning ?? false,
                              noClaimBonus: ticket.vehicleDetails[0].noClaimBonus ?? false,
                              noClaimBonusOnPrePolicy: ticket.vehicleDetails[0].noClaimBonusOnPrePolicy ?? null,
                              createdBy: ticket.vehicleDetails[0].createdBy?.id ?? null,
                              updatedBy: ticket.vehicleDetails[0].updatedBy?.id ?? null,
                              createdAt: ticket.vehicleDetails[0].createdAt ?? null,
                              updatedAt: ticket.vehicleDetails[0].updatedAt ?? null,
                              isActive: ticket.vehicleDetails[0].isActive
                          }
                        : null,
                    insuredPersons: ticket.insuredPersons
                        ? {
                              id: ticket.insuredPersons.id,
                              name: ticket.insuredPersons.name,
                              dateOfBirth: ticket.insuredPersons.dateOfBirth ?? null,
                              gender: ticket.insuredPersons.gender ?? null,
                              primaryContactNumber: ticket.insuredPersons.primaryContactNumber ?? null,
                              secondaryContactNumber: ticket.insuredPersons.secondaryContactNumber ?? null,
                              emailId: ticket.insuredPersons.emailId ?? null,
                              relation: ticket.insuredPersons.relation ?? null,
                              permanentAddress: ticket.insuredPersons.permanentAddress ?? null,
                              permanentCity: ticket.insuredPersons.permanentCity ?? null,
                              permanentState: ticket.insuredPersons.permanentState ?? null,
                              permanentPinCode: ticket.insuredPersons.permanentPinCode ?? null,
                              createdBy: ticket.insuredPersons.createdBy?.id ?? null,
                              updatedBy: ticket.insuredPersons.updatedBy?.id ?? null,
                              createdAt: ticket.insuredPersons.createdAt ?? null,
                              updatedAt: ticket.insuredPersons.updatedAt ?? null,
                              isActive: ticket.insuredPersons.isActive
                          }
                        : null,
                    insuredMedicalDetails: formatMedicalDetails(insuredMedicalDetails)
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: `Internal server error: ${error.message}`,
                data: null
            };
        }
    }

    async updateTicketDetails(ticketId: number, reqBody: any): Promise<any> {
        const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
        if (!userEntity) {
            return {
                status: 'error',
                message: 'Logged user not found',
                data: null
            };
        }
        const {
            insuranceUser,
            medicalDetails,
            dependents,
            includeSelfAsDependent,
            vehicleDetails,
            insuredPersons,
            insuredMedicalDetails,
            nomineeDetails
        } = reqBody;
        console.log("insuranceUser details is here", insuranceUser);

        const response = {
            status: 'success',
            message: 'Ticket details updated successfully',
            data: { ticketId }
        };
        // console.log('is insuredMedicalDetails', insuredMedicalDetails);
        let ticket = null;
        try {
            ticket = await this.ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['insuranceUserId']
            });

            if (!ticket) {
                return {
                    status: 'error',
                    message: 'Ticket not found',
                    data: null
                };
            }

            if (ticket.ticketStatus === Ticket_Status.CLOSED) {
                return {
                    status: 'error',
                    message: 'Ticket already closed',
                    data: null
                };
            }
            // Update InsuranceUser (Proposer) Details
            await this.ticketRepo.manager.transaction(async (manager) => {
                await manager.update(InsuranceUser, ticket.insuranceUserId.id, {
                    dateOfBirth: insuranceUser.dateOfBirth,
                    secondaryContactNumber: insuranceUser.secondaryContactNumber,
                    employmentType: insuranceUser.employmentType,
                    gender: insuranceUser.gender,
                    emailId: insuranceUser.emailId,
                    permanentAddress: insuranceUser.address,
                    permanentPinCode: insuranceUser.pinCode,
                    adharNumber: insuranceUser.adharNumber,
                    panNumber: insuranceUser.panNumber,
                    documents: insuranceUser.documents,
                    updatedBy: userEntity,
                    updatedAt: new Date()
                });

                const updatePayload: any = {
                    // nomineeName: insuranceUser.nomineeName || null,
                    // nomineeRelation: insuranceUser.nomineeRelation || null,
                    // nomineeMobileNumber: insuranceUser.nomineeMobileNumber || null,
                    // nomineeEmailId: insuranceUser.nomineeEmailId || null,
                    includeSelfAsDependent: includeSelfAsDependent || false,
                    ticketStatus: Ticket_Status.IN_PROGRESS,
                    preferredCompany: reqBody.preferredCompany || null,
                    preferredProduct: reqBody.preferredProduct || null,
                    policyHolderType: reqBody.policyHolderType || null,
                    coveragedRequired: reqBody.coveragedRequired || null,
                    userPreferredAmount: reqBody.userPreferredAmount || null,
                    insurancePurpose: reqBody.insurancePurpose || null,
                    PrimiumPaymentTerm: reqBody.PrimiumPaymentTerm || null,
                    policyTerm: reqBody.policyTerm || null,
                    prePolicyNumber: reqBody.prePolicyNumber || null,
                    preInsuranceComapny: reqBody.preInsuranceComapny || null,
                    preIdf: reqBody.preIdf || null,
                    endorsmentToNoted: reqBody.endorsmentToNoted || null,
                    coverageType: reqBody.coverageType || null,
                    isPreYearClaim: reqBody.isPreYearClaim || false,
                    agentRemarks: reqBody.agentRemarks || null,
                    othersRemarks: reqBody.othersRemarks || null,
                    updatedBy: userEntity,
                    updatedAt: new Date()
                };

                // Here if isDocumentCollected is true, then step will be changed to DOCUMENT_COLLECTED
                if (reqBody.markDocumentCollected && !ticket.isDocumentCollected) {
                    // const  currenttime = new Date(Date.now() + 1 * 60 * 1000); // 1 minutes

                    updatePayload.currentStepStart = Current_Step.DOCUMENT_COLLECTED;
                    updatePayload.currentStepStartAt = new Date();
                    updatePayload.nextStepStart = Current_Step.QUOTATION_GENERATED;
                    updatePayload.nextStepDeadline = addHours(1);
                    // updatePayload.nextStepDeadline = currenttime;
                    updatePayload.isDocumentCollected = true;
                    await this.ticketNotiService.scheduleDeadlineNotification(
                        ticketId,
                        Current_Step.DOCUMENT_COLLECTED,
                        addHours(1)
                        //  currenttime
                    );

                    await manager.query('CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                        ticketId,
                        ticket.ticketNumber,
                        ticket.insuranceUserId.id,
                        ticket.assignTo || null,
                        Ticket_Status.IN_PROGRESS,
                        TICKET_LOG_EVENTS.TICKET_STATUS_CHANGED,
                        Current_Step.DOCUMENT_COLLECTED,
                        new Date(),
                        Current_Step.QUOTATION_GENERATED,
                        addHours(1),
                        ticket.insuranceType,
                        reqBody.agentRemarks,
                        reqBody.othersRemarks,
                        userEntity.id
                    ]);
                }

                await manager.update(InsuranceTicket, ticketId, updatePayload);
                // --- END OF CHANGES ---
                // -----------upate nominee details-----------
                // console.log('exiting nominee details=================11111111');
                const existingNominee = await manager.findOne(InsuranceNominee, {
                    where: { ticketId: { id: ticketId } }
                });
                // console.log('exiting nominee details=================', existingNominee);
                if (existingNominee) {
                    await manager.update(InsuranceNominee, existingNominee.id, {
                        name: nomineeDetails.name || null,
                        gender: nomineeDetails.gender || null,
                        dateOfBirth: nomineeDetails.dateOfBirth || null,
                        primaryContactNumber: nomineeDetails.contactNumber || null,
                        relation: nomineeDetails.relation || null,
                        updatedBy: userEntity,
                        updatedAt: new Date()
                    });
                } else {
                    await manager.save(InsuranceNominee, {
                        name: nomineeDetails.name  || null,
                        gender: nomineeDetails.gender || null,
                        dateOfBirth: nomineeDetails.dateOfBirth || null,
                        primaryContactNumber: nomineeDetails.contactNumber || null,
                        relation: nomineeDetails.relation || null,
                        ticketId: ticket,
                        createdBy: userEntity,
                        createdAt: new Date()
                    });
                }

                //------ end code of update nominee details ----

                // Update Medical Details (HEALTH or LIFE)
                if (
                    (ticket.insuranceType === Insurance_Type.Health || ticket.insuranceType === Insurance_Type.Life) &&
                    medicalDetails
                ) {
                    const existingMedical = await manager.findOne(ProposersMedical, {
                        where: { ticketId: { id: ticketId } }
                    });

                    if (existingMedical) {
                        await manager.update(ProposersMedical, existingMedical.id, {
                            height: medicalDetails.height || null,
                            weight: medicalDetails.weight || null,
                            preExistDiseases: medicalDetails.preExistDiseases || null,
                            medication: medicalDetails.medication || null,
                            bloodGroup: medicalDetails.bloodGroup || null,
                            isPastSurgery: medicalDetails.isPastSurgery || false,
                            isChronicCondition: medicalDetails.isChronicCondition || false,
                            isSmoker: medicalDetails.isSmoker || false,
                            isDrinker: medicalDetails.isDrinker || false,
                            dischargeSummary: medicalDetails.dischargeSummary || null,
                            diagnosticReport: medicalDetails.diagnosticReport || null,
                            //  documents: JSON.stringify(documents), // Store as JSON string
                            updatedBy: userEntity,
                            updatedAt: new Date()
                        });
                    } else {
                        await manager.save(ProposersMedical, {
                            insuranceUserId: ticket.insuranceUserId,
                            ticketId: ticket,
                            height: medicalDetails.height || null,
                            weight: medicalDetails.weight || null,
                            preExistDiseases: medicalDetails.preExistDiseases || null,
                            medication: medicalDetails.medication || null,
                            bloodGroup: medicalDetails.bloodGroup || null,
                            isPastSurgery: medicalDetails.isPastSurgery || false,
                            isChronicCondition: medicalDetails.isChronicCondition || false,
                            dischargeSummary: medicalDetails.dischargeSummary || null,
                            diagnosticReport: medicalDetails.diagnosticReport || null,
                            isSmoker: medicalDetails.isSmoker || false,
                            isDrinker: medicalDetails.isDrinker || false,
                            //  documents: JSON.stringify(documents), // Store as JSON string
                            createdBy: userEntity
                        });
                    }
                }
                // Update Dependents (HEALTH or LIFE)
                if (
                    (ticket.insuranceType === Insurance_Type.Health || ticket.insuranceType === Insurance_Type.Life) &&
                    dependents &&
                    !includeSelfAsDependent
                ) {
                    const existingDependents = await manager.find(InsuranceDependent, {
                        where: { ticketId: { id: ticketId } },
                        relations: ['medicalDetails']
                    });

                    for (const dep of dependents) {
                        const existingDep = dep.id ? existingDependents.find((d) => d.id === dep.id) : null;

                        if (existingDep) {
                            await manager.update(InsuranceDependent, existingDep.id, {
                                name: dep.name,
                                dateOfBirth: dep.dateOfBirth || null,
                                gender: dep.gender || null,
                                primaryContactNumber: dep.primaryContactNumber || null,
                                relation: dep.relation || null,
                                updatedBy: userEntity,
                                updatedAt: new Date()
                            });

                            if (dep.medicalDetails) {
                                const existingMed = existingDep.medicalDetails?.length
                                    ? existingDep.medicalDetails[0]
                                    : null;

                                if (existingMed) {
                                    await manager.update(DependentMedical, existingMed.id, {
                                        height: dep.medicalDetails.height || null,
                                        weight: dep.medicalDetails.weight || null,
                                        preExistDiseases: dep.medicalDetails.preExistDiseases || null,
                                        medication: dep.medicalDetails.medication || null,
                                        bloodGroup: dep.medicalDetails.bloodGroup || null,
                                        isPastSurgery: dep.medicalDetails.isPastSurgery || false,
                                        isChronicCondition: dep.medicalDetails.isChronicCondition || false,
                                        dischargeSummary: dep.medicalDetails.dischargeSummary || null,
                                        diagnosticReport: dep.medicalDetails.diagnosticReport || null,
                                        isSmoker: dep.medicalDetails.isSmoker || false,
                                        isDrinker: dep.medicalDetails.isDrinker || false,
                                        //  documents: JSON.stringify(depDocuments), // Store as JSON string
                                        updatedBy: userEntity,
                                        updatedAt: new Date()
                                    });
                                } else {
                                    await manager.save(DependentMedical, {
                                        dependentId: existingDep,
                                        ticketId: ticket,
                                        height: dep.medicalDetails.height || null,
                                        weight: dep.medicalDetails.weight || null,
                                        preExistDiseases: dep.medicalDetails.preExistDiseases || null,
                                        medication: dep.medicalDetails.medication || null,
                                        bloodGroup: dep.medicalDetails.bloodGroup || null,
                                        isPastSurgery: dep.medicalDetails.isPastSurgery || false,
                                        isChronicCondition: dep.medicalDetails.isChronicCondition || false,
                                        dischargeSummary: dep.medicalDetails.dischargeSummary || null,
                                        diagnosticReport: dep.medicalDetails.diagnosticReport || null,
                                        isSmoker: dep.medicalDetails.isSmoker || false,
                                        isDrinker: dep.medicalDetails.isDrinker || false,
                                        // documents: JSON.stringify(depDocuments), // Store as JSON string
                                        createdBy: userEntity
                                    });
                                }
                            }
                        } else {
                            const newDependent = await manager.save(InsuranceDependent, {
                                name: dep.name,
                                dateOfBirth: dep.dateOfBirth || null,
                                gender: dep.gender || null,
                                primaryContactNumber: dep.primaryContactNumber || null,
                                relation: dep.relation || null,
                                ticketId: ticket,
                                createdBy: userEntity
                            });

                            if (dep.medicalDetails) {
                                await manager.save(DependentMedical, {
                                    dependentId: newDependent,
                                    ticketId: ticket,
                                    height: dep.medicalDetails.height || null,
                                    weight: dep.medicalDetails.weight || null,
                                    preExistDiseases: dep.medicalDetails.preExistDiseases || null,
                                    medication: dep.medicalDetails.medication || null,
                                    bloodGroup: dep.medicalDetails.bloodGroup || null,
                                    isPastSurgery: dep.medicalDetails.isPastSurgery || false,
                                    isChronicCondition: dep.medicalDetails.isChronicCondition || false,
                                    dischargeSummary: dep.medicalDetails.dischargeSummary || null,
                                    diagnosticReport: dep.medicalDetails.diagnosticReport || null,
                                    isSmoker: dep.medicalDetails.isSmoker || false,
                                    isDrinker: dep.medicalDetails.isDrinker || false,
                                    // documents: JSON.stringify(depDocuments), // Store as JSON string
                                    createdBy: userEntity
                                });
                            }
                        }
                    }
                }

                // Update Vehicle Details (MOTOR)
                if (ticket.insuranceType === Insurance_Type.Motor && vehicleDetails) {
                    const existingVehicle = await manager.findOne(InsuranceVehicleDetails, {
                        where: { ticketId: { id: ticketId } }
                    });

                    if (existingVehicle) {
                        await manager.update(InsuranceVehicleDetails, existingVehicle.id, {
                            vehicleType: vehicleDetails.vehicleType || null,
                            vehicleNumber: vehicleDetails.vehicleNumber || null,
                            makingYear: vehicleDetails.makingYear || null,
                            vehicleName: vehicleDetails.vehicleName || null,
                            modelNumber: vehicleDetails.modelNumber || null,
                            rcOwnerName: vehicleDetails.rcOwnerName || null,
                            engineNumber: vehicleDetails.engineNumber || null,
                            chassisNumber: vehicleDetails.chassisNumber || null,
                            dateOfReg: vehicleDetails.dateOfReg || null,
                            madeBy: vehicleDetails.madeBy || null,
                            vehicleCategory: vehicleDetails.vehicleCategory || null,
                            othersVehicleCategory: vehicleDetails.othersVehicleCategory || null,
                            seatingCapacity: vehicleDetails.seatingCapacity || null,
                            grossVehicleWeight: vehicleDetails.grossVehicleWeight || null,
                            overTurning: vehicleDetails.overTurning || null,
                            noClaimBonus: vehicleDetails.noClaimBonus || null,
                            noClaimBonusOnPrePolicy: vehicleDetails.noClaimBonusOnPrePolicy || null,

                            //documents: JSON.stringify(documents), // Store as JSON string
                            updatedBy: userEntity,
                            updatedAt: new Date()
                        });
                    } else {
                        await manager.save(InsuranceVehicleDetails, {
                            insuranceUserId: ticket.insuranceUserId,
                            ticketId: ticket,
                            vehicleType: vehicleDetails.vehicleType || null,
                            vehicleNumber: vehicleDetails.vehicleNumber || null,
                            makingYear: vehicleDetails.makingYear || null,
                            vehicleName: vehicleDetails.vehicleName || null,
                            modelNumber: vehicleDetails.modelNumber || null,
                            rcOwnerName: vehicleDetails.rcOwnerName || null,
                            engineNumber: vehicleDetails.engineNumber || null,
                            chassisNumber: vehicleDetails.chassisNumber || null,
                            dateOfReg: vehicleDetails.dateOfReg || null,
                            madeBy: vehicleDetails.madeBy || null,
                            vehicleCategory: vehicleDetails.vehicleCategory || null,
                            othersVehicleCategory: vehicleDetails.othersVehicleCategory || null,
                            seatingCapacity: vehicleDetails.seatingCapacity || null,
                            grossVehicleWeight: vehicleDetails.grossVehicleWeight || null,
                            overTurning: vehicleDetails.overTurning || null,
                            noClaimBonus: vehicleDetails.noClaimBonus || null,
                            noClaimBonusOnPrePolicy: vehicleDetails.noClaimBonusOnPrePolicy || null,

                            //documents: JSON.stringify(documents), // Store as JSON string
                            createdBy: userEntity
                        });
                    }
                }

                // end of vehicle details

                // insured person code
                if (ticket.insuranceType === Insurance_Type.Life && insuredPersons) {
                    const existingInsured = await manager.findOne(InsuredPerson, {
                        where: { ticketId: { id: ticketId } }
                    });
                    const existingInsuredMedi = await manager.findOne(InsuredMedical, {
                        where: { ticketId: { id: ticketId } },
                        order: { id: 'DESC' }
                    });

                    if (existingInsured) {
                        await manager.update(InsuredPerson, existingInsured.id, {
                            name: insuredPersons.name || null,
                            dateOfBirth: insuredPersons.dateOfBirth || null,
                            gender: insuredPersons.gender || null,
                            primaryContactNumber: insuredPersons.primaryContactNumber || null,
                            secondaryContactNumber: insuredPersons.secondaryContactNumber || null,
                            emailId: insuredPersons.emailId || null,
                            relation: insuredPersons.relation || null,
                            permanentAddress: insuredPersons.permanentAddress || null,
                            permanentCity: insuredPersons.permanentCity || null,
                            permanentState: insuredPersons.permanentState || null,
                            permanentPinCode: insuredPersons.permanentPinCode || null,

                            //documents: JSON.stringify(documents), // Store as JSON string
                            updatedBy: userEntity,
                            updatedAt: new Date()
                        });
                    } else {
                        await manager.save(InsuredPerson, {
                            ticketId: ticket,
                            name: insuredPersons.name || null,
                            dateOfBirth: insuredPersons.dateOfBirth || null,
                            gender: insuredPersons.gender || null,
                            primaryContactNumber: insuredPersons.primaryContactNumber || null,
                            secondaryContactNumber: insuredPersons.secondaryContactNumber || null,
                            emailId: insuredPersons.emailId || null,
                            relation: insuredPersons.relation || null,
                            permanentAddress: insuredPersons.permanentAddress || null,
                            permanentCity: insuredPersons.permanentCity || null,
                            permanentState: insuredPersons.permanentState || null,
                            permanentPinCode: insuredPersons.permanentPinCode || null,
                            createdBy: userEntity
                        });
                    }

                    if (insuredMedicalDetails) {
                        // console.log('insuraded medical details1=================', insuredMedicalDetails);
                        if (existingInsuredMedi) {
                            // console.log(
                            //     'insuraded medical details2=================',
                            //     insuredMedicalDetails.dischargeSummary
                            // );
                            await manager.update(InsuredMedical, existingInsuredMedi.id, {
                                height: insuredMedicalDetails.height || null,
                                weight: insuredMedicalDetails.weight || null,
                                preExistDiseases: insuredMedicalDetails?.preExistDiseases || null,
                                medication: insuredMedicalDetails.medication || null,
                                bloodGroup: insuredMedicalDetails.bloodGroup || null,
                                isPastSurgery: insuredMedicalDetails.isPastSurgery || false,
                                isChronicCondition: insuredMedicalDetails.isChronicCondition || false,
                                dischargeSummary: insuredMedicalDetails.dischargeSummary || null,
                                diagnosticReport: insuredMedicalDetails.diagnosticReport || null,
                                isSmoker: insuredMedicalDetails.isSmoker || false,
                                isDrinker: insuredMedicalDetails.isDrinker || false,
                                //documents: JSON.stringify(documents), // Store as JSON string
                                updatedBy: userEntity,
                                updatedAt: new Date()
                            });
                        } else {
                            await manager.save(InsuredMedical, {
                                ticketId: ticket,
                                height: insuredMedicalDetails.height || null,
                                weight: insuredMedicalDetails.weight || null,
                                preExistDiseases: insuredMedicalDetails.preExistDiseases || null,
                                medication: insuredMedicalDetails.medication || null,
                                bloodGroup: insuredMedicalDetails.bloodGroup || null,
                                isPastSurgery: insuredMedicalDetails.isPastSurgery || false,
                                isChronicCondition: insuredMedicalDetails.isChronicCondition || false,
                                dischargeSummary: insuredMedicalDetails.dischargeSummary || null,
                                diagnosticReport: insuredMedicalDetails.diagnosticReport || null,
                                isSmoker: insuredMedicalDetails.isSmoker || false,
                                isDrinker: insuredMedicalDetails.isDrinker || false,
                                // documents: JSON.stringify(documents), // Store as JSON string
                                createdBy: userEntity
                            });
                        }
                    }
                }
            });

            return response;
        } catch (error) {
            // console.log('-api/insurance-ticket/updateTicketDetails', error.message);
            return {
                status: 'error',
                message: `Internal server error: ${error.message}`,
                data: { ticketId }
            };
        }
    }

    async updateTicketStatus(ticketId: number, reqBody: any): Promise<any> {
        try {
            // const userEntity = await this.userRepo.findOne({ where: { email: 'aftab.alam@aaveg.com' } });
            const userEntity = this.loggedInsUserService.getCurrentUser();
            //  console.log('loggedInUser in update ticket status-------------------', userEntity.id);
            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }
            const { ticketStatus, isActive } = reqBody;
            const ticket = await this.ticketRepo.findOne({
                where: { id: ticketId },
                relations: ['insuranceUserId']
            });
            if (!ticket) {
                return {
                    status: 'error',
                    message: `Ticket not found`,
                    data: { ticketId }
                };
            }

            if (ticket.currentStepStart === Current_Step.CLOSED || ticket.ticketStatus === Ticket_Status.CLOSED) {
                return {
                    status: 'error',
                    message: `Ticket is already closed`,
                    data: { ticketId }
                };
            }

            if (ticket.ticketStatus === Ticket_Status.CANCELLED && ticketStatus=== Ticket_Status.CANCELLED) {
                return {
                    status: 'error',
                    message: `Ticket is already cancelled`,
                    data: { ticketId }
                };
            }

            const updateData: any = {
                ticketStatus,
                isActive,
                updatedBy: userEntity,
                updatedAt: new Date()
            };
            let currentStepTimeline = new Date(Date.now() + 1 * 60 * 1000);

            if (ticketStatus === Ticket_Status.CLOSED) {
                updateData.currentStepStart = Current_Step.CLOSED;
                updateData.nextStepStart = Current_Step.CLOSED;
            }

            await this.ticketRepo.update(ticketId, updateData);
            // console.log('updateData', updateData);
            if (ticketStatus === Ticket_Status.CLOSED) {
                // console.log('in closed status');

                currentStepTimeline = new Date(Date.now() + 1 * 60 * 1000); // 1 minutes
                // currentStepTimeline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
                await this.ticketNotiService.scheduleEscalationCase(
                    ticket.id,
                    Current_Step.CLOSED,
                    currentStepTimeline,
                    userEntity
                );
            }
            // console.log('After ticket closed ----------------------');

            const logParams = [
                ticketId,
                ticket.ticketNumber,
                ticket.insuranceUserId.id,
                ticket.assignTo || null,
                ticketStatus,
                TICKET_LOG_EVENTS.TICKET_STATUS_CHANGED,
                ticketStatus === Ticket_Status.CLOSED ? Current_Step.CLOSED : ticket.currentStepStart,
                ticketStatus === Ticket_Status.CLOSED ? new Date() : ticket.currentStepStartAt,
                ticketStatus === Ticket_Status.CLOSED ? Current_Step.CLOSED : ticket.nextStepStart,
                ticketStatus === Ticket_Status.CLOSED ? addHours(1) : ticket.nextStepDeadline,
                ticket.insuranceType,
                ticket.agentRemarks,
                ticket.othersRemarks,
                userEntity.id
            ];

            await this.ticketRepo.query(
                'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                logParams
            );

            return {
                status: 'success',
                message: 'Ticket status updated successfully',
                data: { ticketId }
            };
        } catch (error) {
            // console.log('-api/insurance-ticket/updateTicketStatus', error.message);
            return {
                status: 'error',
                message: `Internal server error: ${error.message}`,
                data: { ticketId }
            };
        }
    }

    async changeSteps(reqBody: any, req: any): Promise<any> {
        try {
            const { ticketId, currentStep, paymentRemarks, policyProvisionRemarks, documents, policyNumber } = reqBody;
            const userEntity = await this.loggedInsUserService.getCurrentUser();

            if (!userEntity) {
                return {
                    status: 'error',
                    message: 'Logged user not found',
                    data: null
                };
            }

            const ticket = await this.ticketRepo.findOne({
                where: {
                    id: ticketId
                },
                relations: ['insuranceUserId', 'assignTo', 'selectedProduct']
            });

            if (!ticket) {
                return {
                    status: 'error',
                    message: `Ticket not found`,
                    data: { ticketId }
                };
            }

            if (ticket.currentStepStart === Current_Step.CLOSED || ticket.ticketStatus === Ticket_Status.CLOSED) {
                return {
                    status: 'error',
                    message: `Ticket already closed`,
                    data: { ticketId }
                };
            }

            const product = await this.productRepo.findOne({
                where: { id: ticket.selectedProduct.id }
            });

            switch (currentStep) {
                case Current_Step.PAYMENT_LINK_GENERATED:
                    if (ticket.currentStepStart !== Current_Step.CUSTOMER_APPROVED) {
                        return {
                            status: 'error',
                            message: 'Please make sure customer approved quote',
                            data: null
                        };
                    }
                    ticket.currentStepStart = Current_Step.PAYMENT_LINK_GENERATED;
                    ticket.nextStepStart = Current_Step.PAYMENT_CONFIRMED;
                    ticket.paymentRemarks = paymentRemarks;
                    ticket.nextStepDeadline = addHours(4);
                    // ticket.nextStepDeadline = twoMinutesLater;

                    break;

                case Current_Step.PAYMENT_DENIED:
                    if (ticket.currentStepStart !== Current_Step.PAYMENT_LINK_GENERATED) {
                        return {
                            status: 'error',
                            message: 'Please make sure payment link generated',
                            data: null
                        };
                    }
                    ticket.currentStepStart = Current_Step.PAYMENT_DENIED;
                    ticket.nextStepStart = Current_Step.PAYMENT_LINK_GENERATED;
                    ticket.paymentRemarks = paymentRemarks;
                    // ticket.nextStepDeadline = addHours(24);
                    break;

                case Current_Step.PAYMENT_CONFIRMED:
                    if (ticket.currentStepStart !== Current_Step.PAYMENT_LINK_GENERATED) {
                        return {
                            status: 'error',
                            message: 'Please make sure payment link generated',
                            data: null
                        };
                    }
                    ticket.currentStepStart = Current_Step.PAYMENT_CONFIRMED;
                    ticket.nextStepStart = Current_Step.POLICY_ISSUED;
                    ticket.paymentRemarks = paymentRemarks;
                    ticket.nextStepDeadline = addHours(24);
                    break;

                case Current_Step.POLICY_ISSUED:
                    if (ticket.currentStepStart !== Current_Step.PAYMENT_CONFIRMED) {
                        return {
                            status: 'error',
                            message: 'Please make sure payment confirmed',
                            data: null
                        };
                    }
                    const start = new Date(); // policy start date
                    const end = new Date(start); // clone the date
                    end.setMonth(end.getMonth() + product.durationMonths); // add months

                    const policyResult = await this.policyService.createPolicy(
                        ticketId,
                        policyNumber,
                        userEntity,
                        start,
                        end
                    );
                    console.log('in current step change policy_issued-', policyResult?.message);

                    if (!policyResult || policyResult.status !== true) {
                        return {
                            status: 'error',
                            message: policyResult?.message || 'Failed to create policy',
                            data: null
                        };
                    }

                    ticket.currentStepStart = Current_Step.POLICY_ISSUED;
                    ticket.nextStepStart = Current_Step.POLICY_RECEIVED;
                    ticket.documents = documents;
                    ticket.policyProvisionRemarks = policyProvisionRemarks;
                    ticket.nextStepDeadline = addHours(24); // add existing
                    ticket.policyStartDate = start;
                    ticket.policyEndDate = end;

                    break;
                case Current_Step.POLICY_RECEIVED:
                    if (ticket.currentStepStart !== Current_Step.POLICY_ISSUED) {
                        return {
                            status: 'error',
                            message: 'Please make sure policy issued',
                            data: null
                        };
                    }
                    ticket.currentStepStart = Current_Step.POLICY_RECEIVED;
                    ticket.nextStepStart = Current_Step.POLICY_DELIVERED;
                    ticket.policyProvisionRemarks = policyProvisionRemarks;
                    // ticket.nextStepDeadline = addHours(24); // add existing
                    break;
                case Current_Step.POLICY_DELIVERED:
                    if (ticket.currentStepStart !== Current_Step.POLICY_RECEIVED) {
                        return {
                            status: 'error',
                            message: 'Please make sure policy received',
                            data: null
                        };
                    }
                    ticket.currentStepStart = Current_Step.POLICY_DELIVERED;
                    ticket.nextStepStart = Current_Step.CLOSED;
                    ticket.policyProvisionRemarks = policyProvisionRemarks;

                    break;
            }

            const query = 'CALL log_insuranceTicket(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            await this.ticketRepo.query(query, [
                ticketId,
                ticket.ticketNumber,
                ticket?.insuranceUserId?.id,
                ticket?.assignTo?.id || null,
                Ticket_Status.IN_PROGRESS,
                TICKET_LOG_EVENTS.TICKET_STATUS_CHANGED,
                ticket.currentStepStart,
                ticket.currentStepStartAt,
                ticket.nextStepStart,
                ticket.nextStepDeadline,
                ticket.insuranceType,
                ticket.agentRemarks,
                ticket.othersRemarks,
                userEntity.id
            ]);
            const savedTicket = await this.ticketRepo.save(ticket);
            await this.ticketNotiService.scheduleDeadlineNotification(
                savedTicket.id,
                savedTicket.currentStepStart,
                savedTicket.nextStepDeadline
            );

            if (savedTicket) {
                return {
                    status: 'success',
                    message: 'status updated successfully',
                    data: null
                };
            } else {
                return {
                    status: 'error',
                    message: `Internal server error`,
                    data: null
                };
            }
        } catch (error) {
            // console.log('-api/insurance-ticket/changedSteps', error.message);
            return {
                status: 'error',
                message: `Internal server error: ${error.message}`,
                data: null
            };
        }
    }

    // @Cron('0 0 2 * * *')
    // @Cron('0 56 16 * * *', {
    //     timeZone: 'Asia/Kolkata'
    // })
    // async croncheckfun() {
    //     const today = new Date();
    //     console.log('this is cronjob checking********************** on : ', today);
    // }

    async getStepStatusByRole(reqObj: any, req: any): Promise<any> {
        const role = reqObj.role;
        if (!role) {
            return {
                status: 'error',
                message: 'Role not found',
                data: null
            };
        }
        let stepStatus = [];
        if (role === Roles.admin || role === Roles.superadmin) {
            stepStatus = [
                Current_Step.PAYMENT_LINK_GENERATED,
                Current_Step.PAYMENT_DENIED,
                Current_Step.PAYMENT_CONFIRMED,
                Current_Step.POLICY_ISSUED,
                Current_Step.POLICY_RECEIVED,
                Current_Step.POLICY_DELIVERED
            ];
        }
        if (
            role === Roles.staff ||
            role === Roles.client ||
            role === Roles.branchManager ||
            role === Roles.insuranceManager ||
            role === Roles.productHead
        ) {
            stepStatus = [
                Current_Step.PAYMENT_DENIED,
                Current_Step.PAYMENT_CONFIRMED,
                Current_Step.POLICY_RECEIVED,
                Current_Step.POLICY_DELIVERED
            ];
        }
        if (role === Roles.teleCaller) {
            stepStatus = [Current_Step.PAYMENT_LINK_GENERATED, Current_Step.POLICY_ISSUED];
        }

        return {
            status: 'success',
            message: 'Step found successfully',
            stepStatus: stepStatus
        };
    }

    async calculateAgentIncentive(ticketId: any) {
        // ticket

        // if (ticket.insuranceType !== 'THIRD_PARTY') return;
        // write here logic for fetch selected products and there price// price will be from quote table
        // write code for calculate payout
        // find all agent and their share
        // divide payout to acumen and agent
        // update payout to incentive
        // insert agent and company incentive into monthly incentive table

        const ticket = await this.ticketRepo.findOne({
            where: { id: ticketId }
        });
        const selectedProduct = ticket.selectedProduct;
        if (!selectedProduct) {
            return {
                status: 'error',
                message: 'Product not found',
                data: null
            };
        }
        const payoutQuery = 'call get_payouts(?)';
        const result = await this.quoteRepo.query(payoutQuery, [ticketId]);
        const policyAmount = result[0][0].premium_amount;
        if (!policyAmount) {
            return {
                status: 'error',
                message: 'Policy amount not found',
                data: null
            };
        }
        const acumenPayout = policyAmount * 0.3;
        const agents = ticket;

        const agentTotalShare = acumenPayout * 0.2;
        const acumenActualPayout = acumenPayout - agentTotalShare;

        // Get current assigned agent
        const currentAssignedId = ticket.assignTo?.id;

        // Get previous assigned agents from insurance_assigned_to table
        // const previousAssigned = await this.insuranceAssignedRepo.find({
        //     where: { ticketId: ticket.id },
        //     select: ['previousAssignedTo'],
        // });

        // const prevAgentIds = [...new Set(previousAssigned.map(p => p.previousAssignedTo))];

        // Add current assigned agent
        // const allAgentIdsSet = new Set(prevAgentIds);
        // if (currentAssignedId) {
        //     allAgentIdsSet.add(currentAssignedId);
        // }

        // const allAgentIds = Array.from(allAgentIdsSet);
        // const individualShare = agentTotalShare / allAgentIds.length;

        // for (const agentId of allAgentIds) {
        //     await this.agentIncentiveRepo.save({
        //         ticketId: ticket.id,
        //         agentId,
        //         amount: individualShare,
        //         calculatedAt: new Date()
        //     });
        // }
    }
}
