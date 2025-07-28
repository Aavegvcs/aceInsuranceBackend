import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
export class UpdateRoleDto {
    @ApiProperty({
        description: 'Id of Role',
        example: '1'
    })
    @IsNotEmpty()
    id: number;

    @ApiProperty({
        description: 'Description of Role',
        example: 'This is Admin with all authorities'
    })
    description: string;
}
