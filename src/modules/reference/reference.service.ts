import { Injectable } from '@nestjs/common';
import { Reference } from './reference.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Injectable()
export class ReferenceService {
    constructor(
        @InjectRepository(Reference)
        private referenceRepository: Repository<Reference>
    ) {}
    async findOneByName(name: string): Promise<Reference> {
        return this.referenceRepository.findOneBy({ refType: name });
    }
}
