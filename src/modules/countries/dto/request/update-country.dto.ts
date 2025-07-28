import { IsNotEmpty, IsNumber } from '@nestjs/class-validator';

export class UpdateCountryDto {
    @IsNotEmpty()
    @IsNumber()
    countryId: number;
}
