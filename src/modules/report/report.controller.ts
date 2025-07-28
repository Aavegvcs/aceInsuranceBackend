import { Controller, Post, Param, UploadedFile, UseInterceptors, Get, Req, Body, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReportService } from './report.service';
import { MasterType, masterTypeArr, ReportType, reportTypeArr } from 'src/utils/app.utils';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ReportLogs } from './entities/report-logs.entity';
import { ErrorHandler } from 'src/utils/error.handler';
import { ImportResult } from 'src/types/report.types';

@Controller('reports')
export class ReportController {

    constructor(
        private readonly reportService: ReportService,
        @InjectRepository(ReportLogs)
        private readonly reportLogsRepository: Repository<ReportLogs>,
    ) { }

    @Post('validate/:reportType')
    @UseInterceptors(FileInterceptor('file', {
        fileFilter: (req, file, cb) => {
            if (!file?.originalname.match(/\.(xls|xlsx|csv)$/i)) {
                const error = ErrorHandler.invalidInput('Only Excel files (.xlsx, .xls, .csv) are allowed');
                Logger.error(`Invalid file type uploaded for reportType ${req.params.reportType}: ${error.message}`);
                return cb(error, false);
            }
            cb(null, true);
        },
    }))
    async validateReport(
        @Param('reportType') reportType: ReportType,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Body('financialYear') financialYear?: string,
        @Body('region') region?: string,
    ): Promise<ImportResult> {
        try {
            ErrorHandler.validateInput([
                [!file, 'NO_FILE_UPLOADED', 'No file uploaded'],
                [!reportTypeArr.includes(reportType), 'INVALID_REPORT_TYPE', `Invalid report type: ${reportType}`],
            ]);
            return await this.reportService.validateAndUpsertExcelFile(file.buffer, reportType, financialYear, region);
        } catch (error) {
            Logger.error(`Failed to validate report ${reportType}: ${error.message}`);
            throw error; // Rethrow to let NestJS handle error response
        }
    }

    @Post('master-import/:masterType')
    @UseInterceptors(FileInterceptor('file', {
        fileFilter: (req, file, cb) => {
            if (!file?.originalname.match(/\.(xls|xlsx|csv)$/i)) {
                const error = ErrorHandler.invalidInput('Only Excel files (.xlsx, .xls, .csv) are allowed');
                Logger.error(`Invalid file type uploaded for masterType ${req.params.masterType}: ${error.message}`);
                return cb(error, false);
            }
            cb(null, true);
        },
    }))
    async importMasterFile(
        @Param('masterType') masterType: MasterType,
        @UploadedFile() file: Express.Multer.File | undefined,
    ): Promise<ImportResult> {
        try {
            ErrorHandler.validateInput([
                [!file, 'NO_FILE_UPLOADED', 'No file uploaded'],
                [!masterTypeArr.includes(masterType), 'INVALID_MASTER_TYPE', `Invalid master type: ${masterType}`],
            ]);
            return await this.reportService.importMasterFile(file.buffer, masterType);
        } catch (error) {
            Logger.error(`Failed to import master ${masterType}: ${error.message}`);
            throw error;
        }
    }

    @Get('last-upload-times')
    async getLastUploadTimes(): Promise<Record<ReportType | MasterType, { lastUpdatedAt: string | null, message: string | null }>> {
        try {
            const allTypes = [...reportTypeArr, ...masterTypeArr] as (ReportType | MasterType)[];

            const uploadInfo: Record<ReportType | MasterType, { lastUpdatedAt: string | null, message: string | null }> =
                Object.fromEntries(allTypes.map(type => [type, { lastUpdatedAt: null, message: null }])) as
                Record<ReportType | MasterType, { lastUpdatedAt: string | null, message: string | null }>;

            const result = await this.reportLogsRepository
                .createQueryBuilder('log')
                .select('SUBSTRING_INDEX(log.fileName, "_insert", 1)', 'reportType')
                .addSelect('log.updatedAt', 'lastUpdatedAt')
                .addSelect(
                    'CONCAT("dbCount: ", log.dbCount, ", Total rows: ", log.totalRows, ", Inserted: ", log.insertedCount, ", Updated: ", log.updatedCount, ", Errors: ", log.errorCount)',
                    'message',
                )
                .innerJoin(
                    qb => qb
                        .select('SUBSTRING_INDEX(fileName, "_insert", 1)', 'reportType')
                        .addSelect('MAX(updatedAt)', 'maxUpdatedAt')
                        .from('report_logs', 'sub')
                        .where('sub.fileName LIKE :pattern', { pattern: '%_insert%' })
                        .groupBy('reportType'),
                    'latest',
                    'latest.reportType = SUBSTRING_INDEX(log.fileName, "_insert", 1) AND latest.maxUpdatedAt = log.updatedAt',
                )
                .where('log.fileName LIKE :pattern', { pattern: '%_insert%' })
                .setParameter('pattern', '%_insert%')
                .getRawMany();

            result.forEach(row => {
                const type = row.reportType as ReportType | MasterType;
                if (allTypes.includes(type)) {
                    uploadInfo[type] = {
                        lastUpdatedAt: row.lastUpdatedAt instanceof Date
                            ? row.lastUpdatedAt.toISOString()
                            : new Date(row.lastUpdatedAt).toISOString(),
                        message: row.message ?? null,
                    };
                }
            });

            return uploadInfo;
        } catch (error) {
            Logger.error(`Failed to fetch last upload times: ${error.message}`);
            throw error;
        }
    }

    @Post('fetch-report')
    async getReport(@Req() req: any) {
        try {
            return await this.reportService.getReport(req);
        } catch (error) {
            Logger.error(`Failed to fetch report: ${error.message}`);
            throw error;
        }
    }

    @Post('send-client-mail-report')
    async sendClientMailReport(@Req() req: any) {
        return await this.reportService.sendClientMailReport(req);
    }

    @Post('updateClientSummaryIncrementally')
    async updateClientSummaryIncrementally(@Req() req: any) {
        return await this.reportService.updateClientSummaryIncrementally();
    }
}