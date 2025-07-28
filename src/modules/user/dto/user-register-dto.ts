import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserRegisterDto {
    @ApiProperty({
        description: 'First Name of User',
        example: 'kinze '
    })
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({
        description: 'Last Name of User',
        example: 'jay'
    })
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({
        description: 'phoneNumber of User',
        example: '+123986394'
    })
    @IsNotEmpty()
    phoneNumber: string;

    @ApiProperty({
        description: 'unique email can be only alphabets or alphanumeric',
        example: 'kinzejay@kinze.com'
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'alphanumeric password',
        example: 'learning123'
    })
    @IsNotEmpty()
    password: string;

    otp: string;

    @ApiProperty({
        description: 'status can be inactive , active  (optional)',
        example: 'active'
    })
    status: string;
}
