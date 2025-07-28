// jwt-match.guard.ts

import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/user/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class JwtMatchGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
        @InjectRepository(User)
        private UserRepository: Repository<User>
    ) {}

    async canActivate(context: ExecutionContext): Promise<any> {
        const request = context.switchToHttp().getRequest();
        const jwtTokenFromHeader = this.extractTokenFromHeader(request);

        if (!jwtTokenFromHeader) {
            throw new UnauthorizedException('JWT token not found in the Bearer header');
        }

        const user = await this.validateJwtToken(jwtTokenFromHeader);
        if (!user) {
            throw new UnauthorizedException('invalid Token');
        }

        return true;
    }

    private extractTokenFromHeader(request: any): string | null {
        const authHeader = request.headers.authorization;

        if (!authHeader) return null;

        const [, token] = authHeader.split(' ');

        if (!token) return null;

        return token;
    }

    private async validateJwtToken(jwtToken: string): Promise<User | null> {
        const user: User = await this.UserRepository.findOneBy({ accessToken: jwtToken });
        if (!user) return null; // Token does not match the stored token in the database

        return user;
    }
}
