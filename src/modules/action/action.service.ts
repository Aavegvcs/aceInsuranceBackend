import { Injectable } from '@nestjs/common';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionDto } from './dto/update-action.dto';
import { Action } from './entities/action.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class ActionService {
    constructor(
        @InjectRepository(Action)
        private actionRepo: Repository<Action>
    ) {}

    create(createActionDto: CreateActionDto) {
        return 'This action adds a new action';
    }

    async findAll() {
        return await this.actionRepo.find();
    }

    async findOne(id: number) {
        return await this.actionRepo.findOneBy({ id });
    }

    async findOneByName(actionName: string) {
        return await this.actionRepo.findOneBy({ actionName });
    }

    update(id: number, updateActionDto: UpdateActionDto) {
        return `This action updates a #${id} action`;
    }

    remove(id: number) {
        return `This action removes a #${id} action`;
    }
}
