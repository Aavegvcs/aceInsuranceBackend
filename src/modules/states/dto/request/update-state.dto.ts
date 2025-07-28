import { IsNotEmpty, IsNumber } from '@nestjs/class-validator';
export class UpdateStateDto {
    @IsNotEmpty()
    @IsNumber()
    stateId: number;
}
