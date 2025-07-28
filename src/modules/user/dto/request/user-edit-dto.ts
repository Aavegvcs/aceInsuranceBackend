import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserEditDto {
    @ApiProperty({
        description: 'First-Name of User',
        example: 'John'
    })
    firstName: string;

    @ApiProperty({
        description: 'Last-Name of User',
        example: 'Carter'
    })
    lastName: string;

    @ApiProperty({
        description: 'unique email can be only alphabets or alphanumeric',
        example: 'kinzejay@kinze.com'
    })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Id of Role',
        example: 3
    })
    roleId: number;

    @ApiProperty({
        description: 'Id of company',
        example: 2
    })
    company: number;
}
