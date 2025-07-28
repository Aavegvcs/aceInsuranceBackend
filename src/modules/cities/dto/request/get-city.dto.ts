import { IsNumber } from '@nestjs/class-validator';
import { IsNotEmpty } from 'class-validator';
export class GetCityDto {
    @IsNotEmpty()
    @IsNumber()
    cityId: number;
}
