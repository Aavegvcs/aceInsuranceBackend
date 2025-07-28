import { BaseEntity, BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { State } from 'src/modules/states/entities/state.entity';
@Entity({ name: 'countries' })
export class Country extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @OneToMany(() => State, (state) => state.country)
    states: State[];
}
