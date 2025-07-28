import { User } from '../../user.entity';
// DTO is data transfer object
export class VerifyOTPResponseDto {
    token: string;
    user: User;
}
