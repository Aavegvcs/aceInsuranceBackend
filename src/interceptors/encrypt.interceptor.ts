import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { encryptData } from 'src/utils/encryption.utils'; // Import your encryption service

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const shouldEncrypt = this.shouldEncryptRoute(context);

        if (!shouldEncrypt) {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        return next.handle().pipe(
            map(async (data) => {
                const modifiedData = await this.handlePaginationLogic(data, req);
                const status = response.statusCode;

                return this.handleEncryption(modifiedData, data, status);
            })
        );
    }

    // Separate pagination logic
    private async handlePaginationLogic(data: any, req: any): Promise<any> {
        if (!data || !data.qb) {
            return data;
        }

        const counts = await this.getQueryCount(data.qb);

        const modifiedData = {
            items: data?.items?.items ?? data?.items,
            pageNumber: req?.QUERY_STRING?.pageNumber,
            totalCount: counts,
            totalPages:
                !req?.QUERY_STRING?.limit || req?.QUERY_STRING?.limit >= counts
                    ? 1
                    : Math.ceil(counts / req?.QUERY_STRING?.limit)
        };

        if (data?.items?.items) {
            for (const key of Object.keys(data?.items)) {
                modifiedData[key] = data?.items[key];
            }
        }

        return modifiedData;
    }

    // Extract count logic
    private async getQueryCount(qb: any): Promise<number> {
        if (!qb.getRawQueryCount) {
            return await qb.getCount();
        }
        return (await qb.getRawQueryCount.getRawMany()).length;
    }

    // Handle encryption logic
    private async handleEncryption(modifiedData: any, data: any, status: number): Promise<string> {
        const encrypted = await encryptData({
            status,
            message: 'success',
            data: data?.qb ? modifiedData : data
        });

        return JSON.stringify({ string: encrypted });
    }

    // mention any route(s) to exclude from encryption
    private shouldEncryptRoute(context: ExecutionContext): boolean {
        // Implement your logic to determine whether the route should be encrypted
        const request = context.switchToHttp().getRequest();
        const excludedRoutes = [
            '/backend/encrypt',
            '/backend/decrypt',
            '/backend/status',
            '/backend/downloadFile',
            '/backend/apidata',
            '/backend/clients/generate-client-pdf',
            '/backend/generate-token-via-app'
        ];

        return !excludedRoutes.includes(request.url);
    }
}
