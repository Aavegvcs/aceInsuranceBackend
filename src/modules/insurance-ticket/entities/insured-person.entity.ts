import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { User } from '@modules/user/user.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { Family_Member_Type } from 'src/utils/app.utils';
import { InsuredMedical } from './insured-medical.entity';

@Entity({ name: 'insured_person' })
export class InsuredPerson extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'insured_name', type: 'varchar', length: 255 })
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

    @Column({ name: 'annual_income', type:'decimal',  precision: 15, scale: 2, nullable: true })
    annualIncome: number;

    @Column({ name: 'highest_edu_qualification', nullable: true })
    highestEduQualification: string;
    
    @Column({ type: 'enum', enum: Family_Member_Type, name: 'relation', nullable: true })
    relation: Family_Member_Type;

    @OneToOne(() => InsuranceTicket, (data) => data.insuredPersons, { nullable: false })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

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
    
    @OneToMany(() => InsuredMedical, (data) => data.insuredPersonId)
    medicalDetails: InsuredMedical[];
}
