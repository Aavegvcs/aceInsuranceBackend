import { IsNotEmpty, IsNumber, IsString } from '@nestjs/class-validator';
export class CreateStateDto {
    @IsNotEmpty()
    @IsString()
    stateName: string;

    @IsNotEmpty()
    @IsNumber()
    countryId?: number;
}
