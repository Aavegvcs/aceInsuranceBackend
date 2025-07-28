import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { STRATEGIES } from 'src/utils/app.utils';
import { SecretService } from 'src/modules/aws/aws-secrets.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, STRATEGIES.REFRESH) {
    constructor(
        private configService: ConfigService,
        private secretService: SecretService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: async (request, rawJwtToken, done) => {
                try {
                    // Fetch the secret using SecretService
                    const secret = await secretService.getSecret('JWT_REFRESH_SECRET');
                    done(null, secret);
                } catch (err) {
                    done(err);
                }
            }
        });
    }

    async validate(payload: any) {
        return {
            email: payload.email
        };
    }
}
