import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { Family_Member_Type } from 'src/utils/app.utils';
import { DependentMedical } from './dependent-medical-details.entity';

@Entity({ name: 'insurance_dependent' })
export class InsuranceDependent extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'dependent_name', type: 'varchar', length: 255 })
    name: string;

    @Column({ name: 'date_of_birth', type: 'varchar', nullable: true })
    dateOfBirth: string;

    @Column({ name: 'gender', type: 'varchar', length: 10, nullable: true })
    gender: string;

    @Column({ name: 'primary_contact_number', nullable: false })
    primaryContactNumber : string;

    @Column({ name: 'secondary_contact_number', nullable: true })
    secondaryContactNumber : string;

    @Column({ name: 'email_id', type: 'varchar', length: 255, nullable: true })
    emailId: string;

    @Column({ type: 'enum', enum: Family_Member_Type, name: 'relation', nullable: true })
    relation: Family_Member_Type;

    @ManyToOne(() => InsuranceTicket, (data) => data.insuranceDependent, { nullable: false })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

    @Column({ type: 'json', name: 'documents', nullable: true })
    documents: any;

    /** Address Fields **/
    @Column({ name: 'address', nullable: true })
    permanentAddress: string;

    @Column({ name: 'city', nullable: true })
    permanentCity: string;

    @Column({ name: 'state', nullable: true })
    permanentState: string;

    @Column({ name: 'pincode', nullable: true })
    permanentPinCode: string;

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

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @OneToMany(() => DependentMedical, (data) => data.dependentId)
    medicalDetails: DependentMedical[];
}
