import { InsuranceSubType } from '@modules/insurance-ticket/entities/insurance-subtype.entity';
import { InsuranceTypeMaster } from '@modules/insurance-ticket/entities/insurance-type-master.entity';
import { User } from '@modules/user/user.entity';
import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn
} from 'typeorm';

@Entity({ name: 'claim_documents' })
export class ClaimDocuments {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        name: 'document_name',
        nullable: false
    })
    documentName: string;

    @ManyToOne(() => InsuranceTypeMaster)
    @JoinColumn({ name: 'insurance_types' })
    private insuranceTypes: InsuranceTypeMaster;

    @ManyToOne(() => InsuranceSubType)
    @JoinColumn({ name: 'insurance_sub_type' })
    private insuranceSubType: InsuranceSubType;

    @Column({
        name: 'allowed_formats',
        nullable: true
    })
    allowedFormats: string; // pdf,jpg,png

    @Column({
        name: 'max_size_mb',
        type: 'int',
        nullable: true
    })
    maxSizeMb: number;

    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true
    })
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
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
    deletedAt: Date;
}
