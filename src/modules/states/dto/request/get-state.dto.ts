import { IsNotEmpty, IsNumber } from '@nestjs/class-validator';
export class GetStateDto {
    @IsNotEmpty()
    @IsNumber()
    stateId: number;
}
