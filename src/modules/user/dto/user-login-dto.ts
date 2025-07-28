import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserLoginDto {
    @ApiProperty({
        description: 'unique email can be only alphabets or alphanumeric',
        example: 'kinzejay@kinze.com'
    })
    // @IsNotEmpty()
    // @IsEmail()
    email: string;

    @ApiProperty({
        description: 'alphanumeric password',
        example: 'learning123'
    })
    // @IsNotEmpty()
    password: string;
}
