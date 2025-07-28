import { IsAlphanumeric, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserResetPassDto {
    @ApiProperty({
        description: 'id received in Query-string of reset-password page',
        example: '?id=187'
    })
    @IsNotEmpty()
    id: string;

    @ApiProperty({
        description: 'new alphanumeric password',
        example: 'learning123'
    })
    @IsNotEmpty()
    @IsAlphanumeric()
    password: string;
}
