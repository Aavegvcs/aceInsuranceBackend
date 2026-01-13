import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { User } from '@modules/user/user.entity';
import { endorsement_field_type, endorsement_fields_visibility } from 'src/utils/app.utils';
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('endorsement_fields')
export class InsuranceEndorsementField {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column({
        type: 'enum',
        enum: endorsement_fields_visibility,
        name: 'visible_to',
        nullable: false
    })
    visibleTo: endorsement_fields_visibility;

    @Column({
        type: 'enum',
        enum: endorsement_field_type,
        name: 'field_type',
        nullable: false
    })
    fieldType: endorsement_field_type;

    @Column({ name: 'field_key', nullable: false })
    fieldKey: string;

    @Column({ name: 'field_label', nullable: true })
    fieldLabel: string;

    @Column({ name: 'is_always_visible', default: true })
    isAlwaysVisible: boolean;

    @Column({ name: 'is_payment_required', default: false })
    isPaymentRequired: boolean;

    @Column({ default: true })
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
}
