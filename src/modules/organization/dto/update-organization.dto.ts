import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './response/create-organization.dto';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {}
