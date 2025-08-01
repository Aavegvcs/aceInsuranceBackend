import { Injectable, UnauthorizedException, Logger, ExecutionContext, CanActivate, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { SecretService } from '../aws/aws-secrets.service';
import { LoggedInsUserService } from './logged-ins-user.service';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/user/user.entity';

@Injectable()
export class JwtInsAuthGuard implements CanActivate, OnModuleInit {
    private readonly logger = new Logger(JwtInsAuthGuard.name);
    private secrets: any; // Store secrets

    constructor(
        private jwtService: JwtService,
        private userService: UserService,
        private secretService: SecretService,
        private loggedInsUserService: LoggedInsUserService,
        private reflector: Reflector,
        @InjectRepository(User)
        private readonly userRepo: Repository<User>
    ) {}

    async onModuleInit() {
        try {
            //   const awsSecrets = await this.secretService.getSecret();
            this.secrets = await this.secretService?.getSecret();
            this.secrets = {
                APP_SECRET: this.secrets['APP_SECRET']
            };
        } catch (error) {
            this.logger.error('Failed to initialize secrets:', error);
        }
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];

        // Extract token
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            this.logger.error('No valid Bearer token provided');
            throw new UnauthorizedException('No token provided');
        }
        const token = authHeader.split(' ')[1];
        try {
            // Verify token using JWT_ACCESS_SECRET
            const secret = this.secrets?.APP_SECRET;
            if (!secret) {
                this.logger.error('JWT_ACCESS_SECRET not initialized');
                throw new UnauthorizedException('Server configuration error');
            }

            const payload = await this.jwtService.verifyAsync(token, { secret });

            // Check expiration

            const currentTime = Math.floor(Date.now() / 1000);
            if (payload.exp < currentTime) {
                this.logger.error('Token has expired');
                throw new UnauthorizedException('Token has expired');
            }

            // Fetch user
            const { email } = payload;

            const dbUser = await this.userRepo.findOne({
                where: {
                    email: email,
                    company: { id: 1 }
                },
                relations: ['company', 'userType', 'branch', 'department']
            });

            // console.log('here is db user is-----', dbUser);
            if (!dbUser) {
                this.logger.error(`User not found for : ${email}`);
                throw new UnauthorizedException('User not found');
            }

            // Set global user
            this.loggedInsUserService.setCurrentUser(dbUser);
            this.logger.log(`Logged-in user set for email: ${dbUser.email}`);

            // Attach user to request for compatibility
            request.user = dbUser;

            return true;
        } catch (error) {
            this.logger.error(`Error in InsuranceJwtAuthGuard: ${error.message}`);
            throw new UnauthorizedException(error.message || 'Unauthorized');
        }
    }
}
