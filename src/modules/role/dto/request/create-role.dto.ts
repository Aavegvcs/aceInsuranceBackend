import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
export class CreateRoleDto {
    @ApiProperty({
        description: 'Name of Role',
        example: 'admin'
    })
    @IsNotEmpty()
    roleName: string;
}
