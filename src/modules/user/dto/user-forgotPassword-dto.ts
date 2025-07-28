import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserForgotPassDto {
    @ApiProperty({
        description: 'unique email can be only alphabets or alphanumeric',
        example: 'kinzejay@kinze.com'
    })
    @IsNotEmpty()
    @IsString()
    id: string;
}
