import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';

export class ErrorHandler {

    static validateInput(conditions: [boolean, string, string][]): void {
        for (const [condition, errorType, message] of conditions) {
            if (condition) throw new BadRequestException({ message, errorType, statusCode: 400 });
        }
    }

    static handleError<T>(promise: Promise<T>): Promise<T> {
        return promise.catch((error) => {
            throw error instanceof BadRequestException
                ? error
                : new BadRequestException({
                      message: `Processing failed: ${error.message}`,
                      errorType: 'PROCESSING_ERROR',
                      statusCode: error.statusCode === 500 ? 500 : 400
                  });
        });
    }

    static invalidInput(message: string): BadRequestException {
        return new BadRequestException({ message, errorType: 'INVALID_INPUT', statusCode: 400 });
    }

    static noSheetsFound(): BadRequestException {
        return new BadRequestException({ message: 'No sheets found', errorType: 'NO_SHEETS_FOUND', statusCode: 400 });
    }

    static emptyFile(): BadRequestException {
        return new BadRequestException({ message: 'Excel file is empty', errorType: 'EMPTY_FILE', statusCode: 400 });
    }

    static unsupportedReportType(reportType: string): BadRequestException {
        return new BadRequestException({
            message: `Unsupported report type: ${reportType}`,
            errorType: 'UNSUPPORTED_REPORT_TYPE',
            statusCode: 400
        });
    }

    static databaseError(error: Error): BadRequestException {
        return new BadRequestException({
            message: 'Database operation failed',
            errorType: 'DATABASE_ERROR',
            details: error.message,
            statusCode: 500
        });
    }

    static missingColumns(missingColumns: string[]): BadRequestException {
        return new BadRequestException({
            message: `Missing required columns: ${missingColumns.join(', ')}`,
            errorType: 'MISSING_COLUMNS',
            statusCode: 400,
            details: { missingColumns }
        });
    }

    static generateFileHash(buffer: Buffer): string {
        return createHash('md5').update(buffer).digest('hex');
    }

    static formatResponse(errorType: string, message: string, additional?: Record<string, any>): any {
        return { message, errorType, statusCode: additional?.statusCode || 400, ...additional };
    }
}