import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { STRATEGIES } from 'src/utils/app.utils';
import { SecretService } from '../aws/aws-secrets.service';

@Injectable()
export class TokenService implements OnModuleInit {
    private secrets;
    constructor(
        private configService: ConfigService,
        private jwtService: JwtService,
        private secretService: SecretService
    ) {}

    async onModuleInit() {
        try {
            const awsSecrets = await this.secretService.getSecret();
            this.secrets = {
                JWT_VERIFY_SECRET: awsSecrets?.JWT_VERIFY_SECRET,
                JWT_VERIFY_EXPIRY: awsSecrets?.JWT_VERIFY_EXPIRY,
                JWT_ACCESS_SECRET: awsSecrets?.JWT_ACCESS_SECRET,
                JWT_ACCESS_EXPIRY: awsSecrets?.JWT_ACCESS_EXPIRY,
                JWT_REFRESH_SECRET: awsSecrets?.JWT_REFRESH_SECRET,
                JWT_REFRESH_EXPIRY: awsSecrets?.JWT_REFRESH_EXPIRY
            };
        } catch (error) {
            console.error('Failed to initialize S3Client:', error);
        }
    }

    async generateJWT(user: any, type: STRATEGIES.VERIFY | STRATEGIES.ACCESS | STRATEGIES.REFRESH) {
        const payload = {
            email: user.email
        };

        return await this.jwtService.signAsync(payload, {
            secret: this.secrets[`JWT_${type}_SECRET`],
            expiresIn: this.secrets[`JWT_${type}_EXPIRY`]
        });
    }

    async generateVerifyToken(payload: any): Promise<string> {
        return '';
    }

    async generateAccessToken(payload: any): Promise<string> {
        return '';
    }

    async generateRefreshToken(payload: any): Promise<string> {
        return '';
    }

    async verifyToken(
        authorizationHeader: string,
        type: STRATEGIES.VERIFY | STRATEGIES.ACCESS | STRATEGIES.REFRESH
    ): Promise<any> {
        const [, token] = authorizationHeader.split('Bearer ');
        if (!token) throw new UnauthorizedException(['Not Authorized..']);

        let payload: any = null;

        switch (type) {
            case STRATEGIES.VERIFY:
                payload = this.jwtService.verifyAsync(token, { secret: this.secrets['JWT_VERIFY_SECRET'] });
                // console.log('in jwt payload', payload);
                if (!payload) throw new UnauthorizedException(['Not Allowed..']);
                break;

            case STRATEGIES.ACCESS:
                payload = await this.jwtService.verifyAsync(token, { secret: this.secrets['JWT_ACCESS_SECRET'] });
                if (!payload) throw new UnauthorizedException(['Not Allowed..']);
                break;

            case STRATEGIES.REFRESH:
                payload = await this.jwtService.verifyAsync(token, { secret: this.secrets['JWT_REFRESH_SECRET'] });
                if (!payload) throw new UnauthorizedException(['Not Allowed..']);
                break;

            default:
                throw new UnauthorizedException(['Not Allowed..']);
        }

        return payload;
    }

    async conferenceToken(body: any): Promise<string> {
        const expiresIn = '1h'; // token expiration time
        const payload = {
            context: {
                user: {
                    name: body.name,
                    email: body.email
                }
            },
            moderator: true,
            aud: 'jitsi',
            iss: '6A882F64BAA1B2CD1FF5E686FDD69',
            sub: 'meet.insighttherapysolutions.com',
            room: '*',
            nbf: 1053398815
        };

        return this.jwtService.sign(payload, {
            secret: this.secrets.APP_SECRET,
            expiresIn
        });
    }
}
