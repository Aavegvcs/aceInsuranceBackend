import { User } from '@modules/user/user.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { Pre_Existing_Diseases } from 'src/utils/app.utils';
import { InsuredPerson } from './insured-person.entity';

@Entity('insured_medical')
export class InsuredMedical extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => InsuredPerson, (data) => data.medicalDetails, { nullable: true })
    @JoinColumn({ name: 'insured_person_id' })
    insuredPersonId: InsuredPerson;

    @ManyToOne(() => InsuranceTicket, (data) => data.insuredMedical, { nullable: false })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

    @Column({ type: 'decimal', name: 'height', precision: 10, scale: 2, nullable: true })
    height: number;

    @Column({ type: 'decimal', name: 'weight', precision: 10, scale: 2, nullable: true })
    weight: number;

    // @Column({ type: 'enum', enum: Pre_Existing_Diseases, name: 'pre_exist_diseases', nullable: true })
    // preExistDiseases: Pre_Existing_Diseases;

    @Column({ type: 'simple-array', name: 'pre_exist_diseases', nullable: true })
    preExistDiseases: string[];

    @Column({ type: 'varchar', name: 'others_diseases', nullable: true })
    othersDiseases: string;

    @Column({ type: 'varchar', name: 'medication', nullable: true })
    medication: string;

    @Column({ type: 'boolean', name: 'is_past_surgery', default: false })
    isPastSurgery: boolean;

    @Column({ type: 'boolean', name: 'is_chronic_condition', default: false })
    isChronicCondition: boolean;

    @Column({ type: 'varchar', name: 'discharge_summary', nullable: true })
    dischargeSummary: string;

    @Column({ type: 'varchar', name: 'diagnostic_report', nullable: true })
    diagnosticReport: string;

    @Column({ type: 'boolean', name: 'is_smoker', default: false })
    isSmoker: boolean;

    @Column({ type: 'boolean', name: 'is_drinker', default: false })
    isDrinker: boolean;

    @Column({ type: 'varchar', name: 'blood_group', nullable: true })
    bloodGroup: string;

    // @Column({ type: 'json', name: 'documents', nullable: true })
    // documents: any;

    @Column({ type: 'json', nullable: true }) // MySQL JSON type
    documents: string | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'updated_by' })
    updatedBy: User;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
    updatedAt: Date;

    @Column({ type: 'boolean', name: 'is_active', default: true })
    isActive: boolean;
}
