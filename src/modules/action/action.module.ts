import { Module } from '@nestjs/common';
import { ActionService } from './action.service';
import { ActionController } from './action.controller';
import { Action } from './entities/action.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [TypeOrmModule.forFeature([Action])],
    controllers: [ActionController],
    providers: [ActionService],
    exports: [ActionService]
})
export class ActionModule {}
