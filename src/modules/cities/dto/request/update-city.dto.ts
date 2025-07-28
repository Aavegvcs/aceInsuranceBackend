import { IsNumber } from '@nestjs/class-validator';
import { IsNotEmpty } from 'class-validator';
export class UpdateCityDto {
    @IsNotEmpty()
    @IsNumber()
    cityId: number;
}
