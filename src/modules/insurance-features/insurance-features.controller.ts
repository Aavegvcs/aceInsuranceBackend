import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { InsuranceFeaturesService } from "./insurance-features.service";

@ApiTags('insurance-features')
@Controller('insurance-features')
export class InsuranceFeaturesController {
    constructor(private readonly _featuresService: InsuranceFeaturesService) {}
}