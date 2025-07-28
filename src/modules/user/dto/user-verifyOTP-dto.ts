import { IsAlphanumeric, IsNotEmpty } from '@nestjs/class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class UserVerifyOTPDto {
    @ApiProperty({
        description: '6-Digit alphanumeric OTP',
        example: '1qCBXy'
    })
    @IsNotEmpty()
    @IsAlphanumeric()
    otp: string;
}
