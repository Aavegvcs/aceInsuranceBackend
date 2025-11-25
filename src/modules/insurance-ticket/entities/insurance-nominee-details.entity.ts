import { InsurancePurchasedProduct } from '@modules/insurance-product/entities/insurance-puchased-product.entity';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { Employment_Type, Family_Member_Type, Gender } from 'src/utils/app.utils';
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
export class InsuranceNominee extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'name', nullable: true })
    name: string;

    @Column({ type: 'enum', enum: Gender, name: 'gender', nullable:true })
    gender: Gender;

    @Column({ name: 'date_of_birth', nullable: true })
    dateOfBirth: string;

    @Column({ name: 'primary_contact_number', nullable: true })
    primaryContactNumber: string;

    @Column({ type: 'enum', enum: Family_Member_Type, name: 'relation', nullable: true })
    relation: Family_Member_Type;

    @OneToOne(() => InsuranceTicket, (data) => data.nominee, { nullable: true })
    @JoinColumn({ name: 'ticket_id' })
    ticketId: InsuranceTicket;

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
}
