import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class InsuranceReassignedDto {
    @ApiProperty({ example: 1, description: 'Unique ticket id' })
    @IsNotEmpty()
    ticketId: number;

    @ApiProperty({ example: 1, description: 'agent id' })
    @IsNotEmpty()
    agentId: number;
}
