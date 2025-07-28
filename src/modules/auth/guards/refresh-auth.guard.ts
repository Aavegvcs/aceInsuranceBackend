import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtRefreshStrategy } from '../strategies/refresh.strategy';
import { STRATEGIES } from 'src/utils/app.utils';

@Injectable()
export class RefreshAuthGuard extends AuthGuard(STRATEGIES.REFRESH) {
    constructor(private readonly accessJwtStrategy: JwtRefreshStrategy) {
        super();
    }
}
