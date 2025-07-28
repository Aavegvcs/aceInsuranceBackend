import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserFeatureActionService } from '../user-feature-action/user-feature-action.service';
import { UserService } from '../user/user.service';
import { SecretService } from '../aws/aws-secrets.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private userService: UserService,
        private userFeatureActionService: UserFeatureActionService,
        private secretService: SecretService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKeyProvider: async (request, rawJwtToken, done) => {
                try {
                    // Fetch the secret using SecretService
                    const secret = await secretService.getSecret('APP_SECRET');
                    done(null, secret);
                } catch (err) {
                    done(err);
                }
            }
        });
    }

    async validate(payload: any) {
        let allPermissions: any = null;
        if (payload.forRoutes === 'otp') {
            const dbUser = await this.userService.findOneByGenericId(payload.userType, payload.genericId);
            if (!dbUser) throw new NotFoundException('User not found');

            allPermissions = await this.userFeatureActionService.findOne(dbUser.id);
        }

        return {
            genericId: payload.genericId,
            userType: payload.userType,
            forRoutes: payload.forRoutes ?? null,
            allPermissions
        };
    }

    // async validate(payload: any) {
    //     let allPermissions: any = null;

    //     if (payload.forRoutes === 'otp') {
    //         const dbUser = await this.userService.findOneByEmail(payload.email);
    //         if (!dbUser) throw new NotFoundException('User not found');

    //         allPermissions = await this.userFeatureActionService.findOne(dbUser.id);
    //     }

    //     return {
    //         email: payload.email,
    //         forRoutes: payload.forRoutes ?? null,
    //         allPermissions
    //     };
    // }
}
