import { PartialType } from '@nestjs/swagger';
import { CreateFeatureActionDto } from './request/create-feature-action.dto';

export class UpdateFeatureActionDto extends PartialType(CreateFeatureActionDto) {}
