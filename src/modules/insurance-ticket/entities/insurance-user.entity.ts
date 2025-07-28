import { InsurancePurchasedProduct } from '@modules/insurance-product/entities/insurance-puchased-product.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { Employment_Type, Gender } from 'src/utils/app.utils';
import { json } from 'stream/consumers';
import {
    BaseEntity,
    BeforeInsert,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToMany,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from 'typeorm';
import { ProposersMedical } from './proposer-medical-details.entity';
import { InsuranceVehicleDetails } from './insurance-vehicle-details.entity';

@Entity()
export class InsuranceUser extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'name' })
    name: string;

    @Column({ type: 'enum', enum: Gender, name: 'gender' })
    gender: Gender;

    @Column({ name: 'user_code', nullable: true })
    userCode: string;

    @Column({ name: 'date_of_birth', nullable: true })
    dateOfBirth: string;

    @Column({ name: 'primary_contact_number', nullable: false })
    primaryContactNumber : string;

    @Column({ name: 'secondary_contact_number', nullable: true })
    secondaryContactNumber : string;

    @Column({ name: 'email_id', nullable: true })
    emailId: string;

    @Column({ type: 'enum', enum: Employment_Type, name: 'employment_type', nullable: true })
    employmentType: Employment_Type;

    @Column({ name: 'annual_income', type:'decimal',  precision: 15, scale: 2, nullable: true })
    annualIncome: number;

    @Column({ name: 'highest_edu_qualification', nullable: true })
    highestEduQualification: string;

    @Column({ type: 'json', name: 'documents', nullable: true })
    documents: any;

    /** Current Address Fields **/
    @Column({ name: 'current_address', nullable: true })
    currentAddress: string;

    @Column({ name: 'current_city', nullable: true })
    currentCity: string;

    @Column({ name: 'current_state', nullable: true })
    currentState: string;

    @Column({ name: 'current_pincode', nullable: true })
    currentPinCode: string; 

    /** Permanent Address Fields **/
    @Column({ name: 'permanent_address', nullable: true })
    permanentAddress: string;

    @Column({ name: 'permanent_city', nullable: true }) 
    permanentCity: string;

    @Column({ name: 'permanent_state', nullable: true })
    permanentState: string;

    @Column({ name: 'permanent_pincode', nullable: true })
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

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;

    @OneToMany(() => InsuranceTicket, (insuranceTicket) => insuranceTicket.insuranceUserId)
    ticket_id: InsuranceTicket[];

    @OneToMany(() => InsurancePurchasedProduct, (purchasedProduct) => purchasedProduct.insuranceUserId)
    purchasedProduct: InsurancePurchasedProduct[];
    
    @OneToMany(() => ProposersMedical, (data) => data.insuranceUserId)
    medicalDetails: ProposersMedical[];

    @OneToMany(() => InsuranceVehicleDetails, (data) => data.insuranceUserId)
    vehicleDetails: InsuranceVehicleDetails[];
}
