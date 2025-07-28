import {
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn
} from 'typeorm';
import { Country } from 'src/modules/countries/entities/country.entity';
import { City } from 'src/modules/cities/entities/city.entity';
@Entity({ name: 'states' })
export class State extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false })
    name: string;

    @ManyToOne(() => Country, (country) => country.states, { nullable: false })
    @JoinColumn({ name: 'country' })
    country: Country;

    @OneToMany(() => City, (city) => city.state)
    cities: City[];
}
