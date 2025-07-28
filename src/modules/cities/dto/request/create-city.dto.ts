import { IsNotEmpty, IsNumber, IsString } from '@nestjs/class-validator';
export class CreateCityDto {
    @IsNotEmpty()
    @IsString()
    "cityName": string;

    @IsNotEmpty()
    @IsNumber()
    stateId?: number;
}

