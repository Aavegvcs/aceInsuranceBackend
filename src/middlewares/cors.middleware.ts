import { Injectable, NestMiddleware } from '@nestjs/common';
import { Response, Request, NextFunction } from 'express';

@Injectable()
export class CorsMiddleware implements NestMiddleware {
    private readonly allowedOrigins = [
        'https://stage.insighttherapysolutions.com/',
        'https://app.insighttherapysolutions.com/'
    ];

    use(req: Request, res: Response, next: NextFunction) {
        const origin = req.headers.origin;
        if (this.allowedOrigins.includes(origin)) {
            res.header('Access-Control-Allow-Origin', origin);
        }

        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    }
}
