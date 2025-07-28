import { ReportType, MasterType } from 'src/utils/app.utils';

export interface ValidationResult<T> {
    dbCount: number;
    totalRows: number;
    insertedCount: number;
    updatedCount: number;
    errorCount: number;
    errors: { row: number; missingFields: string[] }[];
    validColumns: Record<string, any[]>;
}

export interface ImportResult {
    statusCode: number;
    message: string;
    errorType?: string;
    details?: string[];
    data?: {
        totalRows: number;
        insertedCount: number;
        updatedCount: number;
        errorCount: number;
        errors?: { row: number; missingFields: string[] }[];
    };
}

export interface BranchDateMetrics {
    date: string;
    branchId: string;
    totalBrokerage?: number;
    totalProfitLoss?: number;
    segmentRevenue?: { Equity: number; Commodity: number; Currency: number };
    clientContributions: Record<string, number>;
}

export interface MasterImportResult {
    dtos: any[];
    errors: { row: number; missingFields: string[] }[];
}

export interface ReportRequest {
    body: {
        branchId: string;
        reportType: ReportType;
    };
    QUERY_STRING?: {
        where?: string;
        orderBy?: { key: string };
        skip?: number;
        limit?: number;
    };
}