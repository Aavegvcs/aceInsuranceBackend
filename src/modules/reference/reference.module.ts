import { Module } from '@nestjs/common';
import { ReferenceService } from './reference.service';
import { ReferenceController } from './reference.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reference } from './reference.entity';
@Module({
    imports: [TypeOrmModule.forFeature([Reference])],
    controllers: [ReferenceController],
    providers: [ReferenceService],
    exports: [ReferenceService]
})
export class ReferenceModule {}
