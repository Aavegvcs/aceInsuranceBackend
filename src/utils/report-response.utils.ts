import { HttpException } from '@nestjs/common';
import { ImportResult, ValidationResult } from '../types/report.types';

export class ReportResponseUtils {

    static formatError(errorType: string, message: string, details?: string[]): ImportResult {
        return { statusCode: 400, message, errorType, details };
    }

    static handleServiceError(error: any): ImportResult {
        if (error instanceof HttpException) {
            const response = error.getResponse() as any;
            return {
                statusCode: error.getStatus(),
                message: response.message || 'An error occurred',
                errorType: response.errorType,
                details: response.details,
            };
        }
        return { statusCode: 500, message: 'Internal server error', errorType: 'SERVER_ERROR' };
    }

    static createSuccessResponse(
        upsertedCount: number,
        validationResult: ValidationResult<any> & {
            insertedCount: number;
            updatedCount: number;
            errorCount: number;
        },
        totalRows: number,
    ): ImportResult {
        const { insertedCount, updatedCount, errorCount, errors } = validationResult;
        const messageParts: string[] = [`Success: ${upsertedCount} records upserted out of ${totalRows} total rows`];
        if (insertedCount > 0) messageParts.push(`${insertedCount} inserted`);
        if (updatedCount > 0) messageParts.push(`${updatedCount} updated`);
        if (errorCount > 0) messageParts.push(`with ${errorCount} errors/warnings`);

        const message = messageParts.join(', ');
        const statusCode = errorCount === totalRows && totalRows > 0 ? 400 : 201;

        return {
            statusCode,
            message,
            data: {
                totalRows,
                insertedCount,
                updatedCount,
                errorCount,
                errors:
                    errorCount > 0
                        ? errors.map((e) => ({
                            row: e.row,
                            missingFields: e.missingFields,
                        }))
                        : undefined,
            },
        };
    }
}