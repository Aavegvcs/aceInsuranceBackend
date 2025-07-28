import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Insurance_Type, Ticket_Status } from 'src/utils/app.utils';

export class CreateInsuranceTicketDto {
    @ApiProperty({ example: '2', description: 'Unique ticket id' })
    ticketId: number;

    @ApiProperty({ example: 'TICKET12345', description: 'Unique ticket number' })
    @IsString()
    ticketNumber: string;

    @ApiProperty({ example: 1, description: 'ID of the associated client' })
    @IsNumber()
    clientId: number;

    @ApiProperty({ example: 'HEALTH', description: 'Type of insurance', enum: Insurance_Type })
    @IsNotEmpty()
    @IsEnum(Insurance_Type)
    insuranceType: Insurance_Type;

    @ApiProperty({ example: 2, description: 'ID of the assigned insurance agent' })
    @IsNotEmpty()
    @IsNumber()
    assignTo: number;

    @ApiProperty({ example: 'OPEN', description: 'Status of the ticket', enum: Ticket_Status })
    @IsNotEmpty()
    @IsEnum(Ticket_Status)
    ticketStatus: Ticket_Status;

    @ApiProperty({ example: 'Initial assessment completed.', description: 'Remarks by the agent' })
    @IsOptional()
    @IsString()
    agentRemarks?: string;

    @ApiProperty({ example: 'Awaiting client response.', description: 'Remarks by others' })
    @IsOptional()
    @IsString()
    othersRemarks?: string;

    @ApiProperty({ example: true, description: 'Indicates if the ticket is active', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateInsuranceTicketDto extends PartialType(CreateInsuranceTicketDto) {}
