import { IsNumber } from '@nestjs/class-validator';
import { IsNotEmpty } from 'class-validator';

export class GetCountryDto {
    @IsNotEmpty()
    @IsNumber()
    countryId: number;
}
