import { PartialType } from '@nestjs/swagger';
import { CreateUserFeatureActionDto } from './create-user-feature-action.dto';

export class UpdateUserFeatureActionDto extends PartialType(CreateUserFeatureActionDto) {}
