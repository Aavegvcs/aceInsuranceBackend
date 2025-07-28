import { Module, forwardRef } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { FeatureController } from './feature.controller';
import { Feature } from './entities/feature.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFeatureActionModule } from '../user-feature-action/user-feature-action.module';
@Module({
    imports: [forwardRef(() => UserFeatureActionModule), TypeOrmModule.forFeature([Feature])],
    controllers: [FeatureController],
    providers: [FeatureService],
    exports: [FeatureService]
})
export class FeatureModule {}
