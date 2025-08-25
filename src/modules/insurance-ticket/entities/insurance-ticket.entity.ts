import {
    Client_Type,
    Coverage_Type,
    Current_Step,
    Family_Member_Type,
    Insurance_Purpose,
    Insurance_Type,
    Policy_Holerder_Type,
    Ticket_Status,
    Ticket_Type
} from 'src/utils/app.utils';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany,
    OneToOne
} from 'typeorm';
import { InsuranceEscalations } from '../../insurance-escalation/entities/insurance-escalations.entity';
import { InsuranceIncentives } from '../../insurance-product/entities/insurance-incentives.entity';
import { InsuranceAgent } from './insurance-agent.entity';
import { InsuranceAssignedTo } from './insurance-ticket-assignedTo.entity';
import { User } from '@modules/user/user.entity';
import { InsurancePurchasedProduct } from '@modules/insurance-product/entities/insurance-puchased-product.entity';
import { InsuranceTicketLogs } from '@modules/insurance-ticket/entities/insurance-ticket-logs.entity';
import { InsuranceUser } from '@modules/insurance-ticket/entities/insurance-user.entity';
import { InsuranceDependent } from './insurance-dependent.entity';
import { InsuredPerson } from './insured-person.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { InsuranceVehicleDetails } from './insurance-vehicle-details.entity';
import { ProposersMedical } from './proposer-medical-details.entity';
import { DependentMedical } from './dependent-medical-details.entity';
import { InsuredMedical } from './insured-medical.entity';
import { InsuranceQuotation } from '@modules/insurance-quotations/entities/insurance-quotation.entity';
import { InsuranceProduct } from '@modules/insurance-product/entities/insurance-product.entity';
import { InsuranceTicketNotification } from '@modules/insurance-escalation/entities/insurance-ticket-notification.entity';
import { InsuranceTicketDeviation } from '@modules/insurance-escalation/entities/insurance-notification-deviation.entity';
import { EscalationCase } from '@modules/insurance-escalation/entities/escalation-case.entity';
import { InsurancePolicy } from '@modules/insurance-policy/entities/insurance-policy.entity';

@Entity({ name: 'insurance_ticket' })
export class InsuranceTicket {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'ticket_number', nullable: false })
    ticketNumber: string;

    @ManyToOne(() => InsuranceUser, (data) => data.ticket_id, { nullable: false })
    @JoinColumn({ name: 'insurance_user_id' })
    insuranceUserId: InsuranceUser;

    @Column({ type: 'enum', enum: Ticket_Type, name: 'ticket_type', nullable: true })
    ticketType: Ticket_Type;

    @Column({ type: 'enum', enum: Insurance_Type, name: 'insurance_type', nullable: true })
    insuranceType: Insurance_Type;

    @Column({ type: 'enum', enum: Policy_Holerder_Type, name: 'policy_holder_type', nullable: true })
    policyHolderType: Policy_Holerder_Type;

    @Column({ type: 'enum', enum: Family_Member_Type, name: 'family_member_type', nullable: true })
    familyMemberType: Family_Member_Type;

    @ManyToOne(() => User, (data) => data.assignedTicket, { nullable: true })
    @JoinColumn({ name: 'assign_to' })
    assignTo: User;

    @Column({ name: 'ticket_status', type: 'enum', enum: Ticket_Status, nullable: false })
    ticketStatus: Ticket_Status;

    @Column({ name: 'current_step_start', type: 'enum', enum: Current_Step, nullable: false })
    currentStepStart: Current_Step;

    @Column({ name: 'next_step_start', type: 'enum', enum: Current_Step, nullable: true })
    nextStepStart: Current_Step;

    @CreateDateColumn({ name: 'current_step_start_at', type: 'timestamp' })
    currentStepStartAt: Date;

    @CreateDateColumn({ name: 'next_step_deadline', type: 'timestamp' })
    nextStepDeadline: Date;

    @Column({name: 'agent_remarks',nullable: true})
    agentRemarks: string;

    @Column({name: 'others_remarks', nullable: true})
    othersRemarks: string;

    @Column({name: 'payment_remarks', nullable: true})
    paymentRemarks: string;

    @Column({name: 'policy_provision_remarks', nullable: true})
    policyProvisionRemarks: string;

    @Column({name: 'quotation_revised_remarks', nullable: true})
    quotationRevisedRemarks: string;

    //------ added column on 10-03-2025 ------
    @ManyToOne(() => Branch, (data) => data.tickets, { nullable: true })
    @JoinColumn({ name: 'branch_id' })
    branch: Branch;

    @Column({ name: 'preferred_company', nullable: true })
    preferredCompany: string;

    @Column({ name: 'preferred_product', nullable: true })
    preferredProduct: string;

    @Column({ name: 'pre_policy_number', nullable: true })
    prePolicyNumber: string;

    @Column({ name: 'pre_insurance_company', nullable: true })
    preInsuranceComapny: string;

    @Column({ type: 'decimal', name: 'coveraged_required', precision: 10, scale: 2, nullable: true })
    coveragedRequired: number;

    @Column({ type: 'int', name: 'user_preferred_amount', nullable: true })
    userPreferredAmount: number;

    // @Column({type:'int', name: 'Primium_policy_term', nullable: true })
    // PrimiumPolicyTerm: number;

    @Column({ type: 'int', name: 'Primium_payment_term', nullable: true })
    PrimiumPaymentTerm: number;

    @Column({ type: 'int', name: 'policy_term', nullable: true })
    policyTerm: number;

    // @Column({type:'int', name: 'Primium_term', nullable: true })
    // PrimiumTerm: number;


    @Column({ name: 'is_pre_year_claim', type: 'boolean', default: true })
    isPreYearClaim: boolean;

    @Column({ type: 'enum', enum: Coverage_Type, name: 'coverage_type', nullable: true })
    coverageType: Coverage_Type;

    @Column({ type: 'decimal', name: 'pre_idf', precision: 10, scale: 2, nullable: true })
    preIdf: number;

    @Column({ name: 'endorsment_to_noted', nullable: true })
    endorsmentToNoted: string;

    @Column({ type: 'enum', enum: Insurance_Purpose, name: 'insurance_purpose', nullable: true })
    insurancePurpose: Insurance_Purpose;

    @Column({ type: 'enum', enum: Client_Type, name: 'client_type', nullable: true })
    clientType: Client_Type;

    @Column({ name: 'nominee_name', nullable: true })
    nomineeName: string;

    @Column({ type: 'enum', enum: Family_Member_Type, name: 'nominee_relation', nullable: true })
    nomineeRelation: Family_Member_Type;

    @Column({ name: 'nominee_mobile_number', nullable: true })
    nomineeMobileNumber: string;

    @Column({ name: 'nominee_email_id', nullable: true })
    nomineeEmailId: string;

    @Column({ name: 'include_self_as_dependent', type: 'boolean', default: false })
    includeSelfAsDependent: boolean;

    @Column({ name: 'is_document_collected', type: 'boolean', default: false })
    isDocumentCollected : boolean;
    
    @Column({ type: 'json', name: 'documents', nullable: true })
    documents: any;

    @Column({ name: 'is_product_selected', type: 'boolean', default: false })
    isProductSelected : boolean;

    @ManyToOne(() => InsuranceProduct,{ nullable: true })
    @JoinColumn({ name: 'selected_product' })
    selectedProduct: InsuranceProduct;

        // 👇 The policy this ticket belongs to (only set for renewals)
    @ManyToOne(() => InsurancePolicy, (policy) => policy.tickets, { nullable: true })
    @JoinColumn({ name: 'policy_id' })
    policy: InsurancePolicy;
    
    // selected means after customer approved this and now proceed to pay payments
    @ManyToOne(() => InsuranceQuotation, (data) => data.quotes)
    @JoinColumn({ name: 'quotation_id' })
    selectedQuotation: InsuranceQuotation;

    @Column({ type: 'decimal', name: 'selected_coveraged', precision: 10, scale: 2, nullable: true })
    selectedCoveraged: number;

    @Column({ type: 'decimal', name: 'selected_premium', precision: 10, scale: 2, nullable: true })
    SelectedPremium: number;

    @Column({ type: 'date', name: 'policy_start_date', nullable: true })
    policyStartDate: Date;

    @Column({ type: 'date', name: 'policy_end_date', nullable: true })
    policyEndDate: Date;

    //------ end added column on 10-03-2025 ------

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @OneToMany(() => InsuranceEscalations, (escalations) => escalations.ticketId, { nullable: true })
    escalations: InsuranceEscalations[];

    @OneToMany(() => InsurancePurchasedProduct, (purchasedProduct) => purchasedProduct.productId, { nullable: true })
    purchasedProduct: InsurancePurchasedProduct[];

    @OneToMany(() => InsuranceIncentives, (insuranceIncentives) => insuranceIncentives.ticketId, { nullable: true })
    insuranceIncentives: InsuranceIncentives[];

    @OneToMany(() => InsuranceAssignedTo, (ticketHistory) => ticketHistory.ticketId, { nullable: true })
    ticketHistory: InsuranceAssignedTo[];

    @OneToMany(() => InsuranceTicketLogs, (data) => data.ticket, { nullable: true })
    ticketLogs: InsuranceTicketLogs[];

    @OneToMany(() => InsuranceDependent, (data) => data.ticketId, { nullable: true })
    insuranceDependent: InsuranceDependent[];

    @OneToOne(() => InsuredPerson, (data) => data.ticketId, { nullable: true })
    insuredPersons: InsuredPerson;

    @OneToMany(() => InsuranceVehicleDetails, (data) => data.ticketId, { nullable: true })
    vehicleDetails: InsuranceVehicleDetails[];

    @OneToMany(() => ProposersMedical, (data) => data.ticketId, { nullable: true })
    proposerMedical: ProposersMedical[];

    @OneToMany(() => DependentMedical, (data) => data.ticketId, { nullable: true })
    dependentMedical: DependentMedical[];

    @OneToMany(() => InsuredMedical, (data) => data.ticketId, { nullable: true })
    insuredMedical: InsuredMedical[];

    @OneToMany(() => InsuranceQuotation, (data) => data.ticketId, { nullable: true })
    quotations: InsuranceQuotation[];

    @OneToMany(() => InsuranceTicketNotification, (data) => data.ticket, { nullable: true })
    notifications: InsuranceTicketNotification[];

    @OneToMany(() => InsuranceTicketDeviation, (data) => data.ticket, { nullable: true })
    deviations: InsuranceTicketDeviation[];

    @OneToMany(() => EscalationCase, (data) => data.ticket, { nullable: true })
    escalationCases: EscalationCase[];
}
