import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DataSource, EntityManager, Repository, In, IsNull } from 'typeorm';
import {
    ReportType,
    MasterType,
    orderByKey,
    orderByValue,
    ReportEntities,
} from 'src/utils/app.utils';
import { reportConfigs, ReportConfig, BulkInsertResult } from 'src/config/report.config';
import { ErrorHandler } from 'src/utils/error.handler';
import { ExcelUtils } from 'src/utils/excel.utils';
import { ClientService } from '@modules/client/client.service';
import { BranchService } from '@modules/branch/branch.service';
import { Readable } from 'typeorm/platform/PlatformTools';
import { ReportResponseUtils } from 'src/utils/report-response.utils';
import {
    ImportResult,
    ValidationResult,
    ReportRequest,
} from '../../types/report.types';
import { Branch } from '@modules/branch/entities/branch.entity';
import { EmployeeService } from '@modules/employee/employee.service';
import pLimit from 'p-limit';
import { ReportLogs } from './entities/report-logs.entity';
import { DashboardService } from '@modules/dashboard/dashboard.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SegmentRevenue } from './entities/segment-revenue.entity';
import { Client } from '@modules/client/entities/client.entity';
import { HoldingsStatement } from './entities/holdings-statement.entity';
import { FiveDaysDebitReport } from './entities/five-days-debit-report.entity';
import { ClientMailReport } from 'src/utils/email-templates/client/dashboard-report';
import { generateTopHoldingsChartImage } from 'src/utils/email.utils';
import { DateUtils } from 'src/utils/date.utils';
import { NetPositionReport } from './entities/net-position-report.entity';
import { ClientSummary } from '@modules/client/entities/client-summary.entity';

@Injectable()
export class ReportService {
    private readonly logger = new Logger(ReportService.name);
    private readonly BATCH_SIZE = 1000;
    private readonly CONCURRENCY_LIMIT = 5;
    private readonly limit = pLimit(this.CONCURRENCY_LIMIT);
    private entityManager: EntityManager;

    constructor(
        private readonly dataSource: DataSource,
        @Inject(forwardRef(() => ClientService))
        private readonly clientService: ClientService,
        @Inject(forwardRef(() => EmployeeService))
        private readonly employeeService: EmployeeService,
        @Inject(forwardRef(() => BranchService))
        private readonly branchService: BranchService,
        @Inject(forwardRef(() => DashboardService))
        private readonly dashboardService: DashboardService,
        @InjectQueue('report-processing') private readonly reportQueue: Queue,
    ) { }

    private cleanRowData(row: Record<string, any>): Record<string, any> {
        return Object.fromEntries(
            Object.entries(row).map(([key, value]) => [
                key,
                typeof value === 'string' ? value.replace(/['"]/g, '').trim().toUpperCase() : value,
            ]),
        );
    }

    async processExcelStream(
        stream: Readable,
        reportType: ReportType | MasterType,
        config: ReportConfig,
        batchCallback: (batch: any[], rowOffset: number) => Promise<{ inserted: number; updated: number; duplicates: { index: number; key: string }[]; dbCount: number }>,
    ): Promise<ValidationResult<any>> {
        const { columnMapping, requiredColumns } = config;
        const columns: Record<string, any[]> = Object.fromEntries(
            Object.values(columnMapping).map((col) => [col, []]),
        );
        const errors: { row: number; missingFields: string[] }[] = [];
        let rowNumber = 0;
        let validRowIndex = 0;
        let batch: any[] = [];
        let insertedCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        let dbCount = 0;

        return new Promise((resolve, reject) => {
            stream
                .on('data', async (row) => {
                    rowNumber++;
                    const cleanedRow = this.cleanRowData(row);
                    const { mapped, rowErrors } = ExcelUtils.mapRowData(
                        cleanedRow,
                        columnMapping,
                        requiredColumns,
                        rowNumber,
                    );

                    if (rowErrors.length) {
                        errors.push({ row: rowNumber, missingFields: rowErrors });
                        errorCount++;
                    } else {
                        batch.push(mapped);
                        Object.keys(mapped).forEach((col) => {
                            if (!columns[col]) columns[col] = [];
                            columns[col][validRowIndex] = mapped[col];
                        });
                        validRowIndex++;
                    }

                    if (batch.length >= this.BATCH_SIZE) {
                        stream.pause();
                        try {
                            const { inserted, updated, duplicates, dbCount: batchDbCount } = await this.limit(() => batchCallback(batch, rowNumber - batch.length));
                            insertedCount += inserted;
                            updatedCount += updated;
                            errorCount += duplicates.length;
                            dbCount = batchDbCount;
                            errors.push(...duplicates.map((dup) => ({
                                row: dup.index,
                                missingFields: [`${dup.key}`],
                            })));
                            batch = [];
                            stream.resume();
                        } catch (error) {
                            this.logger.error(`Batch processing failed at row ${rowNumber}: ${error.message}`);
                            reject(error);
                        }
                    }
                })
                .on('end', async () => {
                    if (batch.length > 0) {
                        try {
                            const { inserted, updated, duplicates, dbCount: batchDbCount } = await this.limit(() => batchCallback(batch, rowNumber - batch.length));
                            insertedCount += inserted;
                            updatedCount += updated;
                            errorCount += duplicates.length;
                            dbCount = batchDbCount;
                            errors.push(...duplicates.map((dup) => ({
                                row: dup.index,
                                missingFields: [`${dup.key}`],
                            })));
                        } catch (error) {
                            this.logger.error(`Final batch processing failed: ${error.message}`);
                            reject(error);
                        }
                    }
                    resolve({
                        validColumns: columns,
                        errors,
                        totalRows: rowNumber,
                        insertedCount,
                        updatedCount,
                        errorCount,
                        dbCount,
                    });
                })
                .on('error', (error) => {
                    this.logger.error(`Stream error: ${error.message}`);
                    reject(error);
                });
        });
    }

    async validateAndUpsertExcelFile(
        buffer: Buffer,
        reportType: ReportType,
        financialYear?: string,
        region?: string,
    ): Promise<ImportResult> {
        try {
            this.validateInputs(buffer, reportType, financialYear);
            if (reportType === ReportType.PORTFOLIO_EQUITY && (!financialYear || !region)) {
                throw new Error('financialYear and region required for PORTFOLIO_EQUITY');
            }

            const config = this.getReportConfig(reportType);
            const repository = this.dataSource.getRepository(config.entity);
            const initialDbCount = await repository.count();

            const upsertReportTypes = [
                ReportType.PORTFOLIO_FNO,
                ReportType.SEGMENT_REVENUE,
                ReportType.TOUCH_TURNOVER_REPORT,
                ReportType.BRANCH_TARGET,
                ReportType.ANNUAL_BRANCH_REPORT
            ];

            if (!upsertReportTypes.includes(reportType) && reportType !== ReportType.PORTFOLIO_EQUITY) {
                await repository.query(`TRUNCATE TABLE ${repository.metadata.tableName}`);
            }

            const stream = ExcelUtils.parseExcelData(buffer, true, config.requiredColumns) as Readable;
            const sharedCache: Record<string, any> = { financialYear, region };
            let totalDuplicates: { row: number; missingFields: string[] }[] = [];
            let totalInserted = 0;
            let deletedCount = 0;

            const originalRows: any[] = [];

            if (reportType === ReportType.PORTFOLIO_EQUITY) {
                originalRows.push(...await repository.findBy({ financialYear, region }));
                const deleteResult = await repository.delete({ financialYear, region });
                deletedCount = deleteResult.affected || 0;
            }

            const validationResult = await this.processExcelStream(stream, reportType, config, async (batch, rowOffset) => {
                const transformedRows = await ExcelUtils.optimizeTransform(
                    batch,
                    (row, dataSource, cache) => config.transformRow!(row, dataSource, cache),
                    this.dataSource,
                    config,
                    this.BATCH_SIZE,
                    financialYear,
                    region,
                    sharedCache,
                );

                return this.dataSource.transaction(async (manager) => {
                    this.entityManager = manager;
                    const repository = manager.getRepository(config.entity);

                    const invalidRows = transformedRows.filter(
                        (row) => row.error || row.scripName === 'Unknown Scrip' || (row.clientName === 'Unknown Client' && reportType !== ReportType.HOLDINGS_STATEMENT)
                    );

                    const batchErrors: { index: number; key: string }[] = [];
                    invalidRows.forEach((row, index) => {
                        const rowNum = rowOffset + index + 1;
                        let message = row.error || (row.scripName === 'Unknown Scrip' ? 'Unknown Scrip' : 'Unknown Client');
                        batchErrors.push({ index: rowNum, key: message });
                    });

                    let inserted = 0;
                    let updated = 0;
                    let duplicates: { index: number; key: string }[] = [];

                    if (reportType === ReportType.PORTFOLIO_EQUITY) {
                        const validRows = transformedRows.filter(row => !invalidRows.includes(row));
                        const keyCounts = new Map<string, { index: number; row: any }[]>();
                        validRows.forEach((row, idx) => {
                            const key = config.uniqueKeys.map(k => String(row[k] ?? 'NULL').trim().toUpperCase()).concat([String(row.financialYear ?? 'NULL'), String(row.region ?? 'NULL')]).join('::');
                            const entries = keyCounts.get(key) || [];
                            entries.push({ index: idx + rowOffset + 1, row });
                            keyCounts.set(key, entries);
                            if (entries.length > 1) {
                                duplicates.push({ index: idx + rowOffset + 1, key: `Duplicate key: ${key}` });
                            }
                        });

                        const uniqueRows = Array.from(keyCounts.values()).map(entries => entries[0].row);
                        try {
                            const insertResult = await repository.insert(uniqueRows);
                            inserted = insertResult.generatedMaps.length;
                            totalInserted += inserted;
                        } catch (err) {
                            this.logger.error(`Insertion failed for PORTFOLIO_EQUITY, reverting ${deletedCount} deletions`);
                            await repository.insert(originalRows);
                            throw err;
                        }
                    } else if (upsertReportTypes.includes(reportType)) {
                        const upsertResult = await this.bulkUpsert(reportType, transformedRows, config);
                        inserted = upsertResult.inserted;
                        updated = upsertResult.updated;
                        duplicates = upsertResult.duplicates;

                        if (reportType === ReportType.SEGMENT_REVENUE) {
                            const validRows = transformedRows.filter(row => !invalidRows.includes(row)) as SegmentRevenue[];
                            const tradeDate = validRows[0]?.tradeDate;
                            if (tradeDate) {
                                await this.reportQueue.add(
                                    'create-dealer-revenue',
                                    { tradeDate },
                                    {
                                        jobId: `create-dealer-revenue-${tradeDate}`,
                                        backoff: { type: 'exponential', delay: 1000 },
                                        delay: 1000,
                                        removeOnComplete: true,
                                        removeOnFail: true,
                                    }
                                );

                                // Check if updateNotTradedDays has run today
                                const redisClient = this.reportQueue.client;
                                const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
                                const lastUpdateKey = 'notTradedDays:lastUpdate';
                                const lastUpdate = await redisClient.get(lastUpdateKey);

                                if (lastUpdate !== today) {
                                    // Queue update-not-traded-days
                                    await this.reportQueue.add(
                                        'update-not-traded-days',
                                        {},
                                        {
                                            jobId: `update-not-traded-days-${today}`,
                                            backoff: { type: 'exponential', delay: 1000 },
                                            delay: 1000,
                                            removeOnComplete: true,
                                            removeOnFail: true,
                                        }
                                    );

                                    // Set Redis key to mark as updated
                                    await redisClient.setex(lastUpdateKey, 24 * 60 * 60, today);

                                    // Queue update-client-summary to run after update-not-traded-days
                                }
                                await this.reportQueue.add(
                                    'update-client-summary',
                                    {},
                                    {
                                        jobId: `update-client-summary-${today}`,
                                        backoff: { type: 'exponential', delay: 1000 },
                                        delay: 2000, // Ensure it runs after update-not-traded-days
                                        removeOnComplete: true,
                                        removeOnFail: true,
                                    }
                                );
                            }
                        }
                    } else {
                        const validRows = transformedRows.filter(row => !invalidRows.includes(row));
                        if (validRows.length > 0) {
                            const insertResult = await repository.insert(validRows);
                            inserted = insertResult.generatedMaps.length;
                        }
                    }

                    const dbCount = await repository.count();
                    if (reportType === ReportType.PORTFOLIO_EQUITY) {
                        const expectedDbCount = (initialDbCount - deletedCount) + totalInserted;
                        if (dbCount !== expectedDbCount) {
                            this.logger.error(`Database count mismatch: expected ${expectedDbCount}, got ${dbCount}`);
                            await repository.insert(originalRows);
                            throw new Error('Database count mismatch after insert');
                        }
                    }

                    return {
                        inserted,
                        updated,
                        duplicates: [
                            ...duplicates,
                            ...batchErrors.map(e => ({ index: e.index, key: e.key }))
                        ],
                        dbCount,
                    };
                });
            });

            const { insertedCount, updatedCount, errorCount, errors, totalRows, dbCount } = validationResult;
            const validRows = Object.values(validationResult.validColumns)[0]?.length || 0;

            if (validRows === 0 && errorCount === 0) {
                throw ReportResponseUtils.formatError('NO_DATA', 'No valid data found in the file');
            }

            await this.dataSource.transaction(async (manager) => {
                await this.logInsertResult(manager, reportType, totalRows, insertedCount, updatedCount, errors, dbCount);

                if ([ReportType.HOLDINGS_STATEMENT, ReportType.RISK_REPORT].includes(reportType)) {
                    const counterpartType = reportType === ReportType.HOLDINGS_STATEMENT
                        ? ReportType.RISK_REPORT
                        : ReportType.HOLDINGS_STATEMENT;

                    const counterpartLog = await manager.getRepository(ReportLogs)
                        .createQueryBuilder('log')
                        .where('log.fileName = :fileName', { fileName: `${counterpartType}_insert` })
                        .orderBy('log.updatedAt', 'DESC')
                        .getOne();

                    const currentLog = await manager.getRepository(ReportLogs)
                        .createQueryBuilder('log')
                        .where('log.fileName = :fileName', { fileName: `${reportType}_insert` })
                        .orderBy('log.updatedAt', 'DESC')
                        .getOne();

                    if (counterpartLog && currentLog) {
                        const today = new Date().toISOString().split('T')[0];
                        const counterpartDate = counterpartLog.updatedAt.toISOString().split('T')[0];
                        const currentDate = currentLog.updatedAt.toISOString().split('T')[0];

                        if (counterpartDate === today && currentDate === today) {
                            await this.reportQueue.add(
                                'create-client-dashboard-stats',
                                {},
                                {
                                    jobId: 'create-client-dashboard-stats-singleton',
                                    attempts: 3,
                                    backoff: { type: 'exponential', delay: 1000 },
                                    delay: 1000,
                                    removeOnComplete: true,
                                    removeOnFail: true,
                                }
                            );
                        }
                    }
                }
            });

            this.logger.log(`Report ${reportType} processed: ${totalRows} rows, ${insertedCount} inserted, ${updatedCount} updated, ${errorCount} errors, ${dbCount} in DB`);

            return ReportResponseUtils.createSuccessResponse(
                insertedCount + updatedCount,
                { ...validationResult, errors: [...errors, ...totalDuplicates] },
                totalRows,
            );
        } catch (error) {
            this.logger.error(`Import failed for ${reportType}: ${error.message}`);
            return ReportResponseUtils.handleServiceError(error);
        }
    }

    private async bulkUpsert(
        reportType: ReportType,
        rows: any[],
        config: ReportConfig,
    ): Promise<{
        totalRows: number;
        inserted: number;
        updated: number;
        duplicates: { index: number; key: string }[];
        dbCount: number;
    }> {
        const repository = this.entityManager.getRepository(config.entity);
        const duplicates: { index: number; key: string }[] = [];
        const uniqueKeySet = new Set<string>();
        const validRows: any[] = [];

        // Normalize key generation
        const generateKey = (obj: any) =>
            config.uniqueKeys
                .map(k => String(obj[k] ?? 'NULL').trim().toUpperCase())
                .join('::');

        // Filter duplicates in incoming rows
        rows.forEach((row, index) => {
            if (!row.error) {
                const key = generateKey(row);
                if (uniqueKeySet.has(key)) {
                    duplicates.push({ index: index + 1, key });
                } else {
                    uniqueKeySet.add(key);
                    validRows.push(row);
                }
            }
        });

        let inserted = 0;
        let updated = 0;
        let dbCount = await repository.count();

        const upsertReportTypes = [
            ReportType.PORTFOLIO_EQUITY,
            ReportType.PORTFOLIO_FNO,
            ReportType.SEGMENT_REVENUE,
            ReportType.TOUCH_TURNOVER_REPORT,
            ReportType.BRANCH_TARGET,
            ReportType.ANNUAL_BRANCH_REPORT
        ];

        if (validRows.length > 0) {
            try {
                if (upsertReportTypes.includes(reportType)) {
                    // Fetch only existing entries based on unique keys
                    const existingEntities = await repository.find({
                        where: validRows.map(row => {
                            const whereClause: any = {};
                            config.uniqueKeys.forEach(key => {
                                whereClause[key] = row[key] === undefined ? null : row[key];
                            });
                            return whereClause;
                        }),
                        select: config.uniqueKeys,
                    });

                    // Generate keys for existing records
                    const existingKeySet = new Set(
                        existingEntities.map(entity => generateKey(entity))
                    );

                    const rowsToInsert: any[] = [];
                    const rowsToUpdate: any[] = [];

                    validRows.forEach(row => {
                        const key = generateKey(row);
                        if (existingKeySet.has(key)) {
                            rowsToUpdate.push(row);
                        } else {
                            rowsToInsert.push(row);
                        }
                    });

                    // Perform upsert in batches
                    for (let i = 0; i < validRows.length; i += this.BATCH_SIZE) {
                        const batch = validRows.slice(i, i + this.BATCH_SIZE);
                        await repository.upsert(batch, {
                            conflictPaths: config.uniqueKeys,
                            skipUpdateIfNoValuesChanged: true,
                        });
                    }

                    inserted = rowsToInsert.length;
                    updated = rowsToUpdate.length;
                    dbCount = await repository.count();
                } else {
                    // For insert-only types
                    const insertedCounts: number[] = [];
                    for (let i = 0; i < validRows.length; i += this.BATCH_SIZE) {
                        const batch = validRows.slice(i, i + this.BATCH_SIZE);
                        const result = await repository.insert(batch);
                        insertedCounts.push(result.generatedMaps.length);
                    }
                    inserted = insertedCounts.reduce((sum, count) => sum + count, 0);
                    updated = 0;
                    dbCount = await repository.count();
                }
            } catch (error) {
                this.logger.error(`Upsert failed for ${reportType}: ${error.message}`);
                throw error;
            }
        }

        return {
            totalRows: rows.length,
            inserted,
            updated,
            duplicates,
            dbCount,
        };
    }


    private async verifyUpsertCount(
        expectedDbCount: number,
        repository: Repository<any>,
    ): Promise<void> {
        const actualDbCount = await repository.count();
        if (actualDbCount !== expectedDbCount) {
            this.logger.warn(`Row count mismatch in ${repository.metadata.tableName}: expected ${expectedDbCount}, found ${actualDbCount}`);
        }
    }

    private async logInsertResult(
        manager: EntityManager,
        type: MasterType | ReportType,
        totalRows: number,
        insertedCount: number,
        updatedCount: number,
        errors: { row: number; missingFields: string[] }[],
        dbCount: number,
    ): Promise<void> {
        const errorCount = errors.length;
        if (errorCount > 0) {
            this.logger.warn(`Processing ${type} completed with ${errorCount} errors`);
        }

        try {
            await manager.query(
                `INSERT INTO report_logs (fileName, updatedAt, totalRows, insertedCount, updatedCount, errorCount, dbCount) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [`${type}_insert`, new Date(), totalRows, insertedCount, updatedCount, errorCount, dbCount],
            );
        } catch (error) {
            this.logger.error(`Failed to log ${type} to report_logs: ${error.message}`);
        }
    }

    async importMasterFile(buffer: Buffer, masterType: MasterType): Promise<ImportResult> {
        try {
            this.validateInputs(buffer, masterType);
            const config = this.getReportConfig(masterType);
            const stream = ExcelUtils.parseExcelData(buffer, true, config.requiredColumns) as Readable;

            const validationResult = await this.processExcelStream(stream, masterType, config, async (batch, rowOffset) => {
                return this.dataSource.transaction(async (manager) => {
                    this.entityManager = manager;
                    const { dtos, errors } = await this.processMasterRowsBatch(batch, rowOffset, config, manager);
                    const bulkResult = await this.performBulkInsert(masterType, dtos, config);
                    const inserted = bulkResult.data.created;
                    const updated = bulkResult.data.updated || 0;
                    const duplicates = bulkResult.data.errors.map((e) => ({
                        index: e.row,
                        key: e.error,
                    }));
                    errors.forEach((e, index) => {
                        duplicates.push({ index: e.row, key: e.missingFields.join(',') });
                    });
                    const dbCount = await manager.getRepository(config.entity).count();
                    return { inserted, updated, duplicates, dbCount };
                });
            });

            const { totalRows, insertedCount, updatedCount, errorCount, errors, dbCount } = validationResult;
            const validRows = Object.values(validationResult.validColumns)[0]?.length || 0;

            if (validRows === 0 && errorCount === 0) {
                throw ReportResponseUtils.formatError('NO_DATA', 'No valid data found in the file');
            }

            await this.dataSource.transaction(async (manager) => {
                await this.logInsertResult(
                    manager,
                    masterType,
                    totalRows,
                    insertedCount,
                    updatedCount,
                    errors,
                    dbCount
                );
                await this.verifyUpsertCount(insertedCount + updatedCount, manager.getRepository(config.entity));
            });

            this.logger.log(`Master ${masterType} processed: ${totalRows} rows, ${insertedCount} inserted, ${updatedCount} updated, ${errorCount} errors, ${dbCount} in DB`);
            return ReportResponseUtils.createSuccessResponse(
                insertedCount + updatedCount,
                { ...validationResult, insertedCount, updatedCount, errorCount, errors },
                totalRows
            );
        } catch (error) {
            this.logger.error(`Import failed for ${masterType}: ${error.message}`);
            return ReportResponseUtils.handleServiceError(error);
        }
    }

    private validateInputs(buffer: Buffer, type: string, financialYear?: string): void {
        ErrorHandler.validateInput([
            [!buffer || !(buffer instanceof Buffer), 'INVALID_INPUT', 'Buffer must be a valid Buffer instance'],
            [!type || typeof type !== 'string', 'INVALID_INPUT', 'Type must be a valid string'],
            [
                [ReportType.PORTFOLIO_EQUITY, ReportType.PORTFOLIO_FNO, ReportType.ANNUAL_BRANCH_REPORT].includes(type as ReportType) && !financialYear,
                'MISSING_FINANCIAL_YEAR',
                'Financial year is required for Equity and FNO reports',
            ],
        ]);
    }

    private getReportConfig(type: ReportType | MasterType): ReportConfig {
        const config = reportConfigs[type];
        if (!config) throw ErrorHandler.unsupportedReportType(type);
        return config;
    }

    private async processMasterRowsBatch(
        batch: any[],
        rowOffset: number,
        config: ReportConfig,
        manager: EntityManager,
    ): Promise<{ dtos: any[]; errors: { row: number; missingFields: string[] }[] }> {
        const dtos: any[] = [];
        const errors: { row: number; missingFields: string[] }[] = [];

        try {
            if (config.validateRow) {
                const { validRows, errors: validationErrors } = await config.validateRow(batch, manager);
                errors.push(...validationErrors.map((e) => ({
                    row: e.row + rowOffset,
                    missingFields: [e.message]
                })));

                const { batchDtos, batchErrors } = await this.transformBatch(validRows, rowOffset, config);
                dtos.push(...batchDtos);
                errors.push(...batchErrors);
            } else {
                const { batchDtos, batchErrors } = await this.transformBatch(batch, rowOffset, config);
                dtos.push(...batchDtos);
                errors.push(...batchErrors);
            }
        } catch (error) {
            this.logger.error(`Batch processing failed at row ${rowOffset + 1}: ${error.message}`);
            errors.push({
                row: rowOffset + 1,
                missingFields: [`Bulk processing failed: ${error.message}`]
            });
        }

        return { dtos, errors };
    }

    private async transformBatch(
        batch: any[],
        baseRowNumber: number,
        config: ReportConfig,
    ): Promise<{ batchDtos: any[]; batchErrors: { row: number; missingFields: string[] }[] }> {
        const batchDtos: any[] = [];
        const batchErrors: { row: number; missingFields: string[] }[] = [];

        const transformPromises = batch.map((rowData, index) =>
            this.limit(async () => {
                const rowNumber = baseRowNumber + index + 1;
                try {
                    const dto = config.transformRow
                        ? await config.transformRow(rowData, this.dataSource)
                        : rowData;
                    return { dto, error: null };
                } catch (error) {
                    return {
                        dto: null,
                        error: {
                            row: rowNumber,
                            missingFields: [`${error.message}`]
                        }
                    };
                }
            })
        );

        const results = await Promise.all(transformPromises);
        results.forEach((result) => {
            if (result.dto) {
                batchDtos.push(result.dto);
            }
            if (result.error) {
                batchErrors.push(result.error);
            }
        });

        return { batchDtos, batchErrors };
    }

    private async performBulkInsert(
        masterType: MasterType,
        dtos: any[],
        config: ReportConfig,
    ): Promise<BulkInsertResult<any>> {
        let service;
        switch (masterType) {
            case MasterType.KYC_MASTER:
                service = this.clientService;
                break;
            case MasterType.EMPLOYEE_MASTER:
                service = this.employeeService;
                break;
            case MasterType.BRANCH_MASTER:
                service = this.branchService;
                break;
            case MasterType.DEALER_RM_MAPPING:
                service = this.clientService;
                break;
            default:
                throw ErrorHandler.unsupportedReportType(masterType);
        }

        if (dtos.length > 0 && config.bulkInsert) {
            const bulkResult = await config.bulkInsert(dtos, service);
            if (bulkResult.data.errors.length > 0) {
                bulkResult.data.errors.forEach((error) => {
                    this.logger.error(`Bulk insert error for ${masterType} at row ${error.row}: ${error.error}`);
                });
            }
            return bulkResult;
        }
        return {
            statusCode: 200,
            message: 'No records to insert',
            data: {
                total: dtos.length,
                created: 0,
                failed: 0,
                errors: [],
                createdEntities: [],
            },
        };
    }

    async getSubBranchIds(
        branchId: string,
        branchRepository: Repository<Branch>,
        visited: Set<string> = new Set(),
    ): Promise<string[]> {
        if (visited.has(branchId)) {
            return [];
        }
        visited.add(branchId);

        const subBranchIds: string[] = [branchId];
        const branches = await branchRepository.find({
            where: { controlBranch: { id: branchId }, deletedAt: IsNull() },
            select: ['id'],
        });

        for (const branch of branches) {
            const childIds = await this.getSubBranchIds(branch.id, branchRepository, visited);
            subBranchIds.push(...childIds);
        }

        return subBranchIds;
    }

    async getReport(req: ReportRequest) {
        ErrorHandler.validateInput([[!req || !req.body, 'INVALID_INPUT', 'Request body is required']]);
        const { branchId, reportType } = req.body;
        ErrorHandler.validateInput([[!branchId, 'MISSING_BRANCH_ID', 'Branch ID is required']]);

        const repository = this.dataSource.getRepository(ReportEntities[reportType]);
        const branchRepository = this.dataSource.getRepository(Branch);

        const subBranchIds = await this.getSubBranchIds(branchId, branchRepository);
        const limit = req?.QUERY_STRING?.limit || 100;
        const skip = req?.QUERY_STRING?.skip || 0;

        const items = await repository
            .createQueryBuilder('report')
            .where('report.branchId IN (:...subBranchIds)', { subBranchIds })
            .andWhere(req?.QUERY_STRING?.where || '1=1')
            .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'report' }), orderByValue({ req }))
            .skip(skip)
            .take(limit)
            .getMany();

        const qb = await repository
            .createQueryBuilder('report')
            .where('report.branchId IN (:...subBranchIds)', { subBranchIds })
            .andWhere(req?.QUERY_STRING?.where || '1=1')
            .select([]);

        return { items, qb };
    }

    async updateClientSummaryIncrementally(date: Date = new Date()): Promise<void> {
        try {
            const monthKey = ClientSummary.generateMonthKey(date);
            const startOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
            const endDate = date;

            // Validate date
            if (isNaN(date.getTime())) {
                this.logger.error('Invalid date provided');
                throw new Error('Invalid date');
            }

            this.logger.log(`Starting client summary update for ${monthKey}`);

            // Fetch all branches
            const branches = await this.dataSource.getRepository(Branch).find();
            if (!branches.length) {
                this.logger.warn('No branches found');
                return;
            }

            const branchIds = branches.map(branch => branch.id);

            // Fetch existing summaries for the month and all branches
            // const existingSummaries = await this.dataSource
            //     .getRepository(ClientSummary)
            //     .find({
            //         where: { month: monthKey, branchId: In(branchIds) },
            //         select: ['clientId', 'branchId', 'month', 'totalGross', 'totalNet', 'eqGross', 'eqNet', 'comGross', 'comNet', 'currGross', 'currNet', 'slbmGross', 'slbmNet'],
            //     });
            // const summaryMap = new Map<string, ClientSummary>(
            //     existingSummaries.map(s => [`${s.clientId}-${s.month}`, s])
            // );

            // Query SegmentRevenue for all branches in one go
            const segmentRevenueResult = await this.dataSource
                .getRepository(SegmentRevenue)
                .createQueryBuilder('sr')
                .select([
                    'sr.clientId AS clientId',
                    'sr.branchId AS branchId',
                    'MAX(sr.clientName) AS clientName',
                    'SUM(COALESCE(sr.grossBrokerage, 0)) AS totalGross',
                    'SUM(COALESCE(sr.netBrokerage, 0)) AS totalNet',
                    'SUM(CASE WHEN sr.cocd IN (\'NSE_CASH\', \'BSE_CASH\', \'NSE_DLY\') THEN COALESCE(sr.grossBrokerage, 0) ELSE 0 END) AS eqGross',
                    'SUM(CASE WHEN sr.cocd IN (\'NSE_CASH\', \'BSE_CASH\', \'NSE_DLY\') THEN COALESCE(sr.netBrokerage, 0) ELSE 0 END) AS eqNet',
                    'SUM(CASE WHEN sr.cocd IN (\'NSE_FNO\', \'BSE_FNO\', \'MCX\', \'NCDEX\', \'NSE_COM\') THEN COALESCE(sr.grossBrokerage, 0) ELSE 0 END) AS comGross',
                    'SUM(CASE WHEN sr.cocd IN (\'NSE_FNO\', \'BSE_FNO\', \'MCX\', \'NCDEX\', \'NSE_COM\') THEN COALESCE(sr.netBrokerage, 0) ELSE 0 END) AS comNet',
                    'SUM(CASE WHEN sr.cocd = \'CD_NSE\' THEN COALESCE(sr.grossBrokerage, 0) ELSE 0 END) AS currGross',
                    'SUM(CASE WHEN sr.cocd = \'CD_NSE\' THEN COALESCE(sr.netBrokerage, 0) ELSE 0 END) AS currNet',
                    'SUM(CASE WHEN sr.cocd = \'NSE_SLBM\' THEN COALESCE(sr.grossBrokerage, 0) ELSE 0 END) AS slbmGross',
                    'SUM(CASE WHEN sr.cocd = \'NSE_SLBM\' THEN COALESCE(sr.netBrokerage, 0) ELSE 0 END) AS slbmNet',

                ])
                .where('sr.branchId IN (:...branchIds)', { branchIds })
                .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', { start: startOfMonth, end: endDate })
                .groupBy('sr.clientId, sr.branchId')
                .getRawMany();


            const clientSummaryArray: ClientSummary[] = [];
            const numericFields = [
                'totalGross', 'totalNet', 'eqGross', 'eqNet', 'comGross', 'comNet', 'currGross', 'currNet', 'slbmGross', 'slbmNet'
            ];

            for (const result of segmentRevenueResult) {
                const key = `${result.clientId}-${monthKey}`;
                // const existingSummary = summaryMap.get(key);
                const clientSummary = new ClientSummary();

                clientSummary.clientId = result.clientId;
                clientSummary.branchId = result.branchId;
                clientSummary.month = monthKey;
                clientSummary.clientName = result.clientName || 'Unknown';

                for (const field of numericFields) {
                    const value = result[field];
                    const numValue = value && !isNaN(parseFloat(value)) ? parseFloat(value) : 0;
                    if (typeof value === 'string' && value.match(/\.\d*\.\d*/g)) {
                        this.logger.warn(`Invalid ${field} value '${value}' for client ${result.clientId} in branch ${result.branchId}`);
                        // clientSummary[field] = existingSummary?.[field] || 0;
                    } else {
                        clientSummary[field] = Number(numValue.toFixed(2));
                    }
                }

                clientSummaryArray.push(clientSummary);
            }

            if (clientSummaryArray.length > 0) {
                await this.dataSource.transaction(async transactionalEntityManager => {
                    await transactionalEntityManager
                        .getRepository(ClientSummary)
                        .upsert(clientSummaryArray, ['clientId', 'month']);
                });
                this.logger.log(`Upserted ${clientSummaryArray.length} ClientSummary records for ${monthKey}`);
            } else {
                this.logger.warn(`No ClientSummary records to upsert for ${monthKey}`);
            }

            this.logger.log('Client summary updated successfully');
        } catch (error) {
            this.logger.error(`Client summary update failed: ${error.message}`);
            throw error;
        }
    }

    async createClientMailReport(date: Date, clientId?: string) {
        // Set date to yesterday, truncating time
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        try {
            const clientRepo = this.dataSource.getRepository(Client);

            const whereCondition: any = { deletedAt: null };
            if (clientId) whereCondition.id = clientId;

            const activeClients = await clientRepo.find({
                where: whereCondition,
                relations: ['user', 'branch', 'bankAccounts'],
            });

            if (!activeClients.length) {
                this.logger.log('No active clients found for report generation');
                return;
            }

            // Process clients with concurrency limit
            const tasks = activeClients.map(client =>
                this.limit(async () => {
                    try {
                        if (!client.user?.email) {
                            this.logger.warn(`Skipping client ${client.id}: No email address`);
                            return null;
                        }

                        const [dashboardStats, holdings, debitReport, netPositions] = await Promise.all([
                            this.dashboardService.getClientDashboardStats(client.id),
                            this.dataSource.getRepository(HoldingsStatement).find({ where: { clientId: client.id } }),
                            this.dataSource.getRepository(FiveDaysDebitReport).findOne({ where: { clientId: client.id } }),
                            this.dataSource.getRepository(NetPositionReport).find({ where: { clientId: client.id } }),
                        ]);

                        // Compute top 10 holdings once
                        const top10 = [...holdings]
                            .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
                            .slice(0, 10)
                            .map(h => ({ scripName: h.scripName ?? 'Unknown', value: Number(h.value) ?? 0 }));

                        const chartImage = await generateTopHoldingsChartImage(top10);
                        const reportHtml = ClientMailReport(client, dashboardStats, holdings, debitReport, netPositions, yesterday, chartImage);

                        return {
                            name: 'send-client-mail-report',
                            data: {
                                to: client.user.email,
                                subject: `Daily Report - ${DateUtils.formatDate(yesterday)}`,
                                body: reportHtml,
                                attachments: [
                                    {
                                        filename: 'top10-holdings.png',
                                        content: Buffer.isBuffer(chartImage)
                                            ? chartImage
                                            : Buffer.from(chartImage as any), // fallback if something slipped through
                                        contentType: 'image/png',
                                        cid: 'top10chart', // Match CID with HTML
                                        disposition: 'inline'
                                    },
                                ],
                            },
                            opts: {
                                attempts: 3,
                                backoff: { type: 'exponential', delay: 1000 },
                                delay: 1000,
                                removeOnComplete: true,
                                removeOnFail: true,
                            },
                            clientId: client.id,
                        };
                    } catch (error) {
                        this.logger.error(`Failed to process client ${client.id}: ${error.message}`);
                        return null;
                    }
                })
            );

            // Execute tasks and filter out null results
            const jobDetails = (await Promise.all(tasks)).filter((job): job is NonNullable<typeof job> => job !== null);

            if (!jobDetails.length) {
                this.logger.warn('No valid jobs generated for report queue');
                return;
            }

            // Add jobs to queue
            await this.reportQueue.addBulk(
                jobDetails.map(job => ({
                    ...job,
                    opts: {
                        ...job.opts,
                        jobId: `${job.name}-${job.clientId}-${yesterday.toISOString().split('T')[0]}`,
                    },
                }))
            );

            this.logger.log(`Added ${jobDetails.length} jobs to reportQueue for ${DateUtils.formatDate(yesterday)}`);
        } catch (error) {
            this.logger.error(`Failed to generate client mail reports: ${error.message}`);
            throw error; // Rethrow or handle based on your needs
        }
    }

    async sendClientMailReport(req: any) {
        try {
            const { clientId, date = new Date() } = req.body;
            const client = await this.clientService.getClientById(clientId);
            if (!client) {
                this.logger.error(`Client with ID ${clientId} not found`);
                return { status: 404, message: 'Client not found' };
            }
            this.logger.log('Adding job to mailQueue for create-client-mail-report');
            const job = await this.reportQueue.add(
                'create-client-mail-report',
                { clientId, date },
                {
                    jobId: 'create-client-mail-report-singleton',
                    removeOnComplete: true,
                    removeOnFail: true,
                }
            );
            this.logger.log('Job added to reportQueue successfully');
            return { status: 200, message: 'Job queued successfully', jobId: job.id };
        } catch (error) {
            this.logger.error(`Failed to add job to mailQueue: ${error.message}`, error.stack);
            throw error;
        }
    }
}