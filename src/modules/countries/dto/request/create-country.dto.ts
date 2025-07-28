import { IsNotEmpty, IsString } from '@nestjs/class-validator';
export class CreateteCountryDto {
    @IsNotEmpty()
    @IsString()
    countryName: string;
}
