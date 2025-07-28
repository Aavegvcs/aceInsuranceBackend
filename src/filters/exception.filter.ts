// exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, HttpException, Logger } from '@nestjs/common';
import { encryptData } from '../utils/encryption.utils';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    async catch(exception: any, host: ArgumentsHost): Promise<any> {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest();
        const response = ctx.getResponse();
        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        Logger.error({
            status,
            error: exception.response?.error ?? exception.message,
            data: exception.response?.message ?? exception.response?.error ?? exception.message,
            ip: request?.CLIENT_INFO?.ip
        });

        // Handle the exception and modify the response as needed
        const encrypted = await encryptData({
            status,
            error: exception.response?.error ?? exception.message,
            data: exception.response?.message ?? exception.response?.error ?? exception.message
        });

        response.status(status).json({ string: encrypted });
    }
}
