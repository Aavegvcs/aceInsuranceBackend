import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtVerifyStrategy } from '../strategies/verify.strategy';
import { STRATEGIES } from 'src/utils/app.utils';

@Injectable()
export class VerifyAuthGuard extends AuthGuard(STRATEGIES.VERIFY) {
    constructor(private readonly accessJwtStrategy: JwtVerifyStrategy) {
        super();
    }
}
