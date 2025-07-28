import { PartialType } from '@nestjs/swagger';
import { CreateRoleFeatureActionDto } from './create-role-feature-action.dto';

export class UpdateRoleFeatureActionDto extends PartialType(CreateRoleFeatureActionDto) {}
