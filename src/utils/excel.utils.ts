import * as XLSX from 'xlsx';
import { DataSource, In } from 'typeorm';
import { Readable } from 'typeorm/platform/PlatformTools';
import { MasterType, ReportType } from './app.utils';
import { ReportConfig, reportConfigs } from 'src/config/report.config';
import { ErrorHandler } from './error.handler';
import { Logger } from '@nestjs/common';
import { PassThrough } from 'stream';

type MappedRow = Record<string, any>;
type MappingResult = { mapped: MappedRow; rowErrors: string[] };

export class ExcelUtils {
    private static logger = new Logger('ExcelUtils');

    static async optimizeTransform(
        rows: any[],
        transformRow: (row: any, dataSource?: DataSource, cache?: Record<string, any>) => Promise<any>,
        dataSource: DataSource,
        config: ReportConfig,
        chunkSize = 1000,
        financialYear?: string,
        region?: string,
        sharedCache?: Record<string, any>,
    ): Promise<any[]> {
        const transformedRows: any[] = [];
        const batchableFields = config.batchableFields || [];
        const cache: Record<string, any> = sharedCache || { financialYear, region };

        if (!sharedCache) {
            cache.financialYear = financialYear;
            cache.region = region;
        }

        if (batchableFields.length > 0) {
            try {
                if (batchableFields.includes('isinCode')) {
                    const isinCodes = [...new Set(rows.map((row) => row.isinCode?.trim().toUpperCase()).filter(Boolean))];
                    if (isinCodes.length > 0) {
                        const isinData = await dataSource
                            .getRepository('isin_master')
                            .find({ where: { isinCode: In(isinCodes) }, select: ['isinCode', 'scripName'] });
                        cache['isin_master'] = new Map(isinData.map((item) => [item.isinCode.trim().toUpperCase(), item.scripName]));
                        if (isinData.length === 0) {
                            this.logger.warn(`No isin_master data found for ${isinCodes.length} ISIN codes`);
                        }
                    }
                }

                if (batchableFields.includes('clientId')) {
                    const clientIds = [...new Set(rows.map((row) => row.clientId?.trim()).filter(Boolean))];

                    if (clientIds.length > 0) {
                        const CHUNK_SIZE = chunkSize;
                        const clientData = [];
                        for (let i = 0; i < clientIds.length; i += CHUNK_SIZE) {
                            const chunkIds = clientIds.slice(i, i + CHUNK_SIZE);
                            const chunkData = await dataSource
                                .getRepository('client')
                                .createQueryBuilder('client')
                                .leftJoinAndSelect('client.branch', 'branch')
                                .leftJoinAndSelect('client.regionBranch', 'regionBranch')
                                .leftJoinAndSelect('client.user', 'user')
                                .select([
                                    'client.id',
                                    'branch.id AS branchId',
                                    'regionBranch.id AS regionBranchId',
                                    'user.firstName AS user_firstName',
                                    'user.lastName AS user_lastName',
                                ])
                                .where('client.id IN (:...clientIds)', { clientIds: chunkIds })
                                .getRawMany();
                            clientData.push(...chunkData);
                        }
                        cache['client'] = new Map(clientData.map((client) => [client.client_id, {
                            branchId: client.branchId || 'HOFM',
                            regionBranchId: client.regionBranchId || 'TBHO', // Cache region_branch_id
                        }]));
                        cache['user'] = new Map(
                            clientData.map((client) => [
                                client.client_id,
                                `${client.user_firstName || ''} ${client.user_lastName || ''}`.trim() || 'Unknown Client',
                            ]),
                        );
                    }
                }
            } catch (error) {
                this.logger.error(`Failed to preload cache: ${error.message}`);
                throw error;
            }
        }

        for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const chunkResults = await Promise.all(
                chunk.map(async (row, index) => {
                    try {
                        return await transformRow(row, dataSource, cache);
                    } catch (error) {
                        this.logger.warn(`Row transformation failed at row ${i + index + 1}: ${error.message}`);
                        return { ...row, error: error.message };
                    }
                }),
            );
            transformedRows.push(...chunkResults);
        }

        return transformedRows;
    }

    static parseExcelData(
        buffer: Buffer,
        asStream: boolean = false,
        requiredColumns: string[] = [],
    ): MappedRow[] | Readable {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer', });
            if (!workbook?.SheetNames?.length) throw ErrorHandler.noSheetsFound();

            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            if (!sheet) throw ErrorHandler.noSheetsFound();

            const jsonData = XLSX.utils.sheet_to_json(sheet, {
                raw: false,
                defval: null,
                dateNF: 'yyyy-mm-dd',
                header: 1,
            }) as any[][];

            if (!jsonData.length) throw ErrorHandler.emptyFile();

            const headers = jsonData[0].map((h) => (typeof h === 'string' ? h.trim().toLowerCase() : ''));
            const normalizedRequired = requiredColumns.map((col) => col.toLowerCase());
            const missingColumns = normalizedRequired.filter((col) => !headers.includes(col));

            if (missingColumns.length) {
                this.logger.error(`Missing required columns: ${missingColumns.join(', ')}`);
                throw ErrorHandler.missingColumns(missingColumns);
            }

            if (asStream) {
                const passThrough = new PassThrough({ objectMode: true });
                const sheetStream = XLSX.stream.to_json(sheet, {
                    raw: false,
                    defval: null,
                    dateNF: 'yyyy-mm-dd',
                });

                sheetStream
                    .on('data', (row) => {
                        const isValidRow = Object.values(row).some(
                            (val) =>
                                val !== null &&
                                val !== undefined &&
                                val !== '' &&
                                !(typeof val === 'string' && (val.trim() === '\u001a' || val.trim() === '')),
                        );

                        if (isValidRow) {
                            passThrough.write(row);
                        }
                    })
                    .on('end', () => {
                        passThrough.end();
                    })
                    .on('error', (err) => {
                        this.logger.error(`Excel stream error: ${err.message}`);
                        passThrough.emit('error', ErrorHandler.handleError(Promise.reject(err)));
                    });

                return passThrough;
            }

            const dataRows = jsonData
                .slice(1)
                .filter((row) =>
                    Object.values(row).some((val) => val !== null && val !== undefined && val !== ''),
                );

            return dataRows.map((row) =>
                Object.fromEntries(
                    headers.map((header, index) => [header, row[index] ?? null]),
                ),
            );
        } catch (error) {
            this.logger.error(`Failed to parse Excel data: ${error.message}`);
            throw error;
        }
    }

    static mapRowData(
        row: Record<string, any>,
        columnMapping: Record<string, string>,
        requiredColumns: string[],
        rowNumber: number,
    ): MappingResult {
        const mapped: MappedRow = {};
        const rowErrors: string[] = [];

        const normalizedRow = Object.fromEntries(
            Object.entries(row).map(([key, val]) => [key.trim().toLowerCase(), val]),
        );

        for (const [excelHeader, entityField] of Object.entries(columnMapping)) {
            const headerKey = excelHeader.trim().toLowerCase();
            const value = normalizedRow[headerKey];
            if (requiredColumns.includes(headerKey) && (value === undefined || value === '' || value === null)) {
                rowErrors.push(`${excelHeader} is required`);
            }
            mapped[entityField] = value ?? null;
        }

        return { mapped, rowErrors };
    }
}