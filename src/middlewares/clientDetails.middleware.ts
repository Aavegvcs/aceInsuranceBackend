import { Injectable, NestMiddleware } from '@nestjs/common';
import * as info from 'request-info';

@Injectable()
export class ClientDetailsMiddleware implements NestMiddleware {
    async use(req: any, res: any, next: () => void) {
        const api = req?.originalUrl;
        const method = req?.method;

        const requestDetails = await info(req);

        let x_user_info = req.headers['x-user-info'] ? JSON.parse(req.headers['x-user-info']) : null;

        req.CLIENT_INFO = { ...requestDetails, ...x_user_info, api, method };

        next();
    }
}
