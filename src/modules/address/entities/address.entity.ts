import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
    BeforeInsert
} from 'typeorm';
@Entity({ name: 'address' })
export class Address {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    refId: number;

    @Column({ nullable: true })
    refTypeId: number;

    @Column()
    state: string;

    @Column()
    country: string;

    @Column()
    city: string;

    @Column()
    fax: string;

    @Column()
    zip: string;

    @Column()
    addr: string;

    @CreateDateColumn({ type: 'timestamp', default: null, nullable: true })
    createdAt: Date;

    @UpdateDateColumn({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP(6)',
        onUpdate: 'CURRENT_TIMESTAMP(6)'
    })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamp', nullable: true })
    deletedAt: Date;

    @BeforeInsert()
    updateTimestamps() {
        this.createdAt = new Date(Date.now());
    }
}
