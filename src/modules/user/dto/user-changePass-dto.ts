import { IsAlphanumeric, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserChangePassDto {
    @ApiProperty({
        description: 'current alphanumeric password',
        example: 'learning123'
    })
    @IsNotEmpty()
    @IsAlphanumeric()
    currentPassword: string;

    @ApiProperty({
        description: 'new alphanumeric password',
        example: 'learning123'
    })
    @IsNotEmpty()
    @IsAlphanumeric()
    newPassword: string;
}
