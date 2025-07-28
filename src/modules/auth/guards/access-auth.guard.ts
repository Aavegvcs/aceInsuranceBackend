import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtAccessStrategy } from '../strategies/access.strategy';
import { STRATEGIES } from 'src/utils/app.utils';

@Injectable()
export class AccessAuthGuard extends AuthGuard(STRATEGIES.ACCESS) {
    constructor(private readonly accessJwtStrategy: JwtAccessStrategy) {
        super();
    }
}
