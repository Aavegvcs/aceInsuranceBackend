import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    Index,
    UpdateDateColumn,
    CreateDateColumn
} from 'typeorm';
import { Client } from '@modules/client/entities/client.entity';

@Entity()
export class BankAccount extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Client, (client) => client.bankAccounts)
    client: Client; // Each bank account belongs to a Client

    @Column({ type: 'varchar', length: 50, nullable: false }) // Adjust length as needed
    accountType: string;

    @Column()
    @Index('idx_bank_account_number_client', { unique: true })
    accountNumber: string; // Unique bank account number

    @Column({ nullable: false })
    bankName: string; // Bank name

    @Column({ nullable: true })
    active: boolean; // Whether the bank account is active or not

    @Column({ nullable: false })
    ifscCode: string; // IFSC code

    @Column({ nullable: true })
    branchAddress: string; // Branch address

    @Column({ nullable: true, default: true })
    isDefault: boolean; // Whether the bank account is the default account or not

    @CreateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)'
    })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    updatedAt: Date;
}
