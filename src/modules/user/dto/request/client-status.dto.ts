import { IsNotEmpty } from '@nestjs/class-validator';
// DTO is data transfer object
export class ClientStatusDto {
    @IsNotEmpty()
    clientId: number;

    @IsNotEmpty()
    status: string;
}
