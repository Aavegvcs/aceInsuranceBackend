import { Module, forwardRef } from '@nestjs/common';
import { FeatureActionService } from './feature-action.service';
import { FeatureActionController } from './feature-action.controller';
import { FeatureAction } from './entities/feature-action.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionModule } from '../action/action.module';
import { FeatureModule } from '../feature/feature.module';
import { AbilityModule } from '../ability/ability.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([FeatureAction]),
        ActionModule,
        forwardRef(() => FeatureModule),
        forwardRef(() => AbilityModule)
    ],
    controllers: [FeatureActionController],
    providers: [FeatureActionService],
    exports: [FeatureActionService]
})
export class FeatureActionModule {}
