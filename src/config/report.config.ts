import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import {
    ReportType,
    generateRowKey,
    branchModelsArr,
    MasterType,
    roleIds,
    createPasswordHash
} from 'src/utils/app.utils';
import { RiskReport } from '@modules/report/entities/risk-report.entity';
import { SegmentRevenue } from '@modules/report/entities/segment-revenue.entity';
import { ClientProfitLossEquity } from '@modules/client/entities/client-pl-equity.entity';
import { ClientProfitLossCommodity } from '@modules/client/entities/client-pl-commodity.entity';
import { NetPositionReport } from '@modules/report/entities/net-position-report.entity';
import { FiveDaysDebitReport } from '@modules/report/entities/five-days-debit-report.entity';
import { MtfReport } from '@modules/report/entities/mtf-report.entity';
import { ISINMaster } from '@modules/report/entities/isin-master.entity';
import { TouchTurnover } from '@modules/report/entities/touch-turnover.entity';
import { MonthlySettlement } from '@modules/report/entities/monthly-settlement.entity';
import { QuarterlySettlement } from '@modules/report/entities/quarterly-settlement.entity';
import { HoldingsStatement } from '@modules/report/entities/holdings-statement.entity';
import { BranchTarget } from '@modules/branch/entities/branch-target.entity';
import { Client } from '@modules/client/entities/client.entity';
import { Employee } from '@modules/employee/entities/employee.entity';
import { Branch } from '@modules/branch/entities/branch.entity';
import { State } from '@modules/states/entities/state.entity';
import { Country } from '@modules/countries/entities/country.entity';
import { ClientMappingInput, ClientService } from '@modules/client/client.service';
import { EmployeeService } from '@modules/employee/employee.service';
import { BranchService } from '@modules/branch/branch.service';
import { Logger } from '@nestjs/common';
import { CreateClientDto } from '@modules/client/dto/create-client.dto';
import { CreateEmployeeDto } from '@modules/employee/dto/create-employee.dto';
import { CreateBranchDto } from '@modules/branch/dto/create-branch.dto';
import { DateUtils } from 'src/utils/date.utils';
import { AnnualBranchStats } from '@modules/branch/entities/annual-branch-stats.entity';


export interface BulkInsertResult<T> {
    statusCode: number;
    message: string;
    data: {
        total: number;
        created: number;
        updated?: number;
        failed: number;
        errors: { row: number; entityName: string; error: string }[];
        createdEntities: T[];
    };
}

export interface ReportConfig {
    columnMapping: Record<string, string>;
    requiredColumns: string[];
    entity: any;
    uniqueKeys?: string[]; // Optional, only for upsert-based reports
    master?: boolean;
    derivedFields?: (columns: Record<string, any[]>) => Record<string, any[]>;
    transformRow?: (row: any, dataSource?: DataSource, cache?: Record<string, any>) => any;
    validateRow?: (
        rows: any[],
        manager: EntityManager
    ) => Promise<{ validRows: any[]; errors: { row: number; message: string }[] }>;
    batchableFields?: string[];
    bulkInsert?:
    | ((dtos: CreateClientDto[], service: ClientService) => Promise<BulkInsertResult<Client>>)
    | ((dtos: CreateEmployeeDto[], service: EmployeeService) => Promise<BulkInsertResult<Employee>>)
    | ((dtos: CreateBranchDto[], service: BranchService) => Promise<BulkInsertResult<Branch>>)
    | ((dtos: ClientMappingInput[], service: ClientService) => Promise<BulkInsertResult<Client>>);
}

export const reportConfigs: Record<ReportType | MasterType, ReportConfig> = {
    [ReportType.RISK_REPORT]: {
        columnMapping: {
            CLIENT_ID: 'clientId',
            CLIENT_NAME: 'clientName',
            Financial: 'financial',
            Unrealiz: 'unrealized',
            Stock: 'stock',
            POA_stock: 'poaStock',
            COLLATERAL_HAIRCUT: 'collateralHaircut',
            Cash_Margin: 'cashMargin',
            MARGIN: 'margin',
            Overall: 'overall',
            FNO_Exposure: 'fnoExposure'
        },
        requiredColumns: [
            'CLIENT_ID',
            'CLIENT_NAME',
            'Financial',
            'Unrealiz',
            'Stock',
            'POA_stock',
            'COLLATERAL_HAIRCUT',
            'Cash_Margin',
            'MARGIN',
            'Overall',
            'FNO_Exposure'
        ],
        entity: RiskReport,
        uniqueKeys: ['clientId'],
        batchableFields: ['clientId'],
        transformRow: async (row, dataSource, cache) => {
            const clientData = cache?.client?.get(row.clientId);
            let branchId = clientData?.branchId || 'Unknown Branch'; // Fixed: Use branchId instead of branch.id
            return {
                ...row,
                ...Object.fromEntries(
                    [
                        'financial',
                        'unrealized',
                        'stock',
                        'poaStock',
                        'collateralHaircut',
                        'cashMargin',
                        'margin',
                        'overall',
                        'fnoExposure'
                    ].map((field) => [field, Number(row[field]) || 0])
                ),
                branchId
            };
        }
    },
    [ReportType.SEGMENT_REVENUE]: {
        columnMapping: {
            'TRADE DATE': 'tradeDate',
            'CLIENT ID': 'clientId',
            'CLIENT NAME': 'clientName',
            NOTE3: 'branchId',
            'TOTAL TURNOVER': 'tradeAmount',
            'TOTAL NET_BROKERAGE': 'netBrokerage',
            'TOTAL BROKERAGE': 'grossBrokerage',
            TRADEEXCHANGE: 'exchange',
            CTCLID: 'terminalId',
            'REMESHIRE1 BROKERAGE': 'rem1Brokerage',
            'REMESHIRE2 BROKERAGE': 'rem2Brokerage',
            'COMPANY CODE': 'cocd'
        },
        requiredColumns: [
            'TRADE DATE',
            'CLIENT ID',
            'CLIENT NAME',
            'NOTE3',
            'TOTAL TURNOVER',
            'TOTAL NET_BROKERAGE',
            'TOTAL BROKERAGE',
            'TRADEEXCHANGE',
            // 'CTCLID',
            'COMPANY CODE',
            'REMESHIRE1 BROKERAGE',
            'REMESHIRE2 BROKERAGE'
        ],
        entity: SegmentRevenue,
        uniqueKeys: ['rowKey'],
        transformRow: (row) => ({
            ...row,
            tradeDate: DateUtils.parseDate(row.tradeDate),
            tradeAmount: Number(row.tradeAmount) || 0,
            netBrokerage: Number(row.netBrokerage) || 0,
            grossBrokerage: Number(row.grossBrokerage) || 0,
            rem1Brokerage: Number(row.rem1Brokerage) || 0,
            rem2Brokerage: Number(row.rem2Brokerage) || 0,
            terminalId: row.terminalId ? String(row.terminalId).replace(/'/g, '') : null,
            rowKey: generateRowKey(row, [
                'clientId',
                'cocd',
                'terminalId',
                { name: 'tradeDate', transform: (d) => DateUtils.parseDate(d) }
            ])
        })
    },
    [ReportType.PORTFOLIO_EQUITY]: {
        columnMapping: {
            CLIENT_ID: 'clientId',
            CLIENT_NAME: 'clientName',
            SCRIP_NAME: 'scripName',
            BUY_QTY: 'buyQuantity',
            BUY_RATE: 'buyRate',
            BUY_AMOUNT: 'buyAmount',
            SALE_QTY: 'saleQuantity',
            SALE_RATE: 'saleRate',
            BUY_TRD_DATE: 'buyTradeDate',
            SALE_TRD_DATE: 'saleTradeDate',
            SALE_AMOUNT: 'saleAmount',
            SHORTTERM: 'shortTerm',
            LONGTERM: 'longTerm',
            CLOSINGPRICE: 'closingPrice',
            NOTIONALPL: 'plAmount',
            TR_TYPE: 'tradeType',
            BRANCH_CODE: 'branchId',
            ISIN: 'isin',
            TRADING: 'trading'
        },
        requiredColumns: [
            'CLIENT_ID',
            'CLIENT_NAME',
            'SCRIP_NAME',
            'BUY_QTY',
            'BUY_RATE',
            'BUY_AMOUNT',
            'SALE_QTY',
            'SALE_RATE',
            'SALE_AMOUNT',
            'SHORTTERM',
            'LONGTERM',
            'CLOSINGPRICE',
            'TRADING',
            'NOTIONALPL',
            'TR_TYPE',
            'BRANCH_CODE',
            'BUY_TRD_DATE',
            'SALE_TRD_DATE',
            'ISIN'
        ],
        entity: ClientProfitLossEquity,
        uniqueKeys: ['clientId', 'scripName', 'buyTradeDate', 'saleTradeDate', 'buyRate', 'saleRate'],
        transformRow: (row, dataSource, cache) => {
            // Normalize and validate buyTradeDate (non-nullable)
            const buyTradeDateRaw = row.buyTradeDate?.toString().trim();
            const buyTradeDate = DateUtils.toMySQLDate(buyTradeDateRaw) || '1900-01-01';

            // Validate and parse saleTradeDate (nullable)
            const saleTradeDateRaw = row.saleTradeDate?.toString().trim();
            const saleTradeDate = DateUtils.toMySQLDate(saleTradeDateRaw);

            return {
                ...row,
                scripName: row.scripName || '',
                buyQuantity: Number(row.buyQuantity) || 0,
                buyRate: Number(row.buyRate) || 0,
                buyAmount: Number(row.buyAmount) || 0,
                saleQuantity: Number(row.saleQuantity) || 0,
                saleRate: Number(row.saleRate) || 0,
                saleAmount: Number(row.saleAmount) || 0,
                shortTerm: Number(row.shortTerm) || 0,
                longTerm: Number(row.longTerm) || 0,
                trading: Number(row.trading) || 0,
                closingPrice: Number(row.closingPrice) || 0,
                plAmount: Number(row.plAmount) || 0,
                buyTradeDate, // Guaranteed to be a valid Date
                saleTradeDate, // Can be null
                financialYear: cache?.financialYear || row.financialYear,
                region: cache?.region || row.region
            };
        }
    },
    [ReportType.PORTFOLIO_FNO]: {
        columnMapping: {
            CLIENT_ID: 'clientId',
            CLIENT_NAME: 'clientName',
            SCRIP_SYMBOL: 'scripName',
            OPENQTY: 'opQuantity',
            OPENAMOUNT: 'opAmount',
            BUYQTY: 'buyQuantity',
            BUYAMOUNT: 'buyAmount',
            SALEQTY: 'saleQuantity',
            SALEAMOUNT: 'saleAmount',
            CLOSINGPRICE: 'closingPrice',
            BOOKPROFIT: 'plAmount',
            NOTIONALPL: 'notional',
            BRANCH_CODE: 'branchId',
            ISIN: 'isin',
            EXCHANGE: 'cocd'
        },
        requiredColumns: [
            'CLIENT_ID',
            'CLIENT_NAME',
            'SCRIP_SYMBOL',
            'OPENQTY',
            'OPENAMOUNT',
            'BUYQTY',
            'BUYAMOUNT',
            'SALEQTY',
            'SALEAMOUNT',
            'CLOSINGPRICE',
            'NOTIONALPL',
            'BOOKPROFIT',
            'BRANCH_CODE',
            'ISIN',
            'EXCHANGE'
        ],
        entity: ClientProfitLossCommodity,
        uniqueKeys: ['clientId', 'scripName', 'financialYear', 'cocd'],
        transformRow: (row, dataSource, cache) => ({
            ...row,
            opQuantity: Number(row.opQuantity) || 0,
            opAmount: Number(row.opAmount) || 0,
            buyQuantity: Number(row.buyQuantity) || 0,
            buyAmount: Number(row.buyAmount) || 0,
            saleQuantity: Number(row.saleQuantity) || 0,
            saleAmount: Number(row.saleAmount) || 0,
            closingPrice: Number(row.closingPrice) || 0,
            plAmount: Number(row.plAmount) || 0,
            notional: Number(row.notional) || 0,
            expiryDate: DateUtils.extractDateFromScripSymbol(row.scripName),
            financialYear: cache?.financialYear || row.financialYear
        })
    },
    [ReportType.NET_POSITION_REPORT]: {
        columnMapping: {
            CLIENT_ID: 'clientId',
            FULL_SCRIP_SYMBOL: 'scripName',
            AVG_RATE: 'netRate',
            CLOSING_PRICE: 'closingPrice',
            COMPANY_CODE: 'exchange',
            EXPIRY_DATE: 'expiryDate',
            INSTRUMENT_TYPE: 'instrumentType',
            NETQTY: 'netQuantity',
            OSAMT: 'outstandingAmount',
            NOTINAL: 'notional',
            BRANCH_CODE: 'branchId',
            STRIKE_PRICE: 'strikePrice'
        },
        requiredColumns: [
            'CLIENT_ID',
            'FULL_SCRIP_SYMBOL',
            'AVG_RATE',
            'CLOSING_PRICE',
            'COMPANY_CODE',
            'EXPIRY_DATE',
            'INSTRUMENT_TYPE',
            'NETQTY',
            'OSAMT',
            'NOTINAL',
            'BRANCH_CODE',
            'STRIKE_PRICE'
        ],
        entity: NetPositionReport,
        uniqueKeys: ['clientId', 'scripName'],
        transformRow: (row) => ({
            ...row,
            netRate: Number(row.netRate) || 0,
            closingPrice: Number(row.closingPrice) || 0,
            netQuantity: Number(row.netQuantity) || 0,
            outstandingAmount: Number(row.outstandingAmount) || 0,
            notional: Number(row.notional) || 0,
            strikePrice: Number(row.strikePrice) || 0,
            expiryDate: DateUtils.parseDate(row.expiryDate)
        })
    },
    [ReportType.FIVE_DAYS_DEBIT_REPORT]: {
        columnMapping: {
            Client: 'clientId',
            Name: 'clientName',
            Branchcode: 'branchId',
            Closing: 'closingBalance',
            '3 Days': 'threeDays',
            '4 Days': 'fourDays',
            '5 Days': 'fiveDays',
            '6 Days': 'sixDays',
            '7 Days': 'sevenDays',
            '>7 Days': 'moreThanSevenDays',
            'Closing Stock': 'closingStock'
        },
        requiredColumns: [
            'Client',
            'Name',
            'Branchcode',
            'Closing',
            '3 Days',
            '4 Days',
            '5 Days',
            '6 Days',
            '7 Days',
            '>7 Days',
            'Closing Stock'
        ],
        entity: FiveDaysDebitReport,
        uniqueKeys: ['clientId'],
        transformRow: (row) => ({
            ...row,
            closingBalance: Number(row.closingBalance) || 0,
            threeDays: Number(row.threeDays) || 0,
            fourDays: Number(row.fourDays) || 0,
            fiveDays: Number(row.fiveDays) || 0,
            sixDays: Number(row.sixDays) || 0,
            sevenDays: Number(row.sevenDays) || 0,
            moreThanSevenDays: Number(row.moreThanSevenDays) || 0,
            closingStock: Number(row.closingStock) || 0
        })
    },
    [ReportType.MTF_REPORT]: {
        columnMapping: {
            CLIENT_ID: 'clientId',
            LEDGER: 'ledgerBalance',
            MTF_FUNDED: 'mtfFunded',
            MTF_TotalFundedAmount: 'mtfTotalFundedAmount',
            MTF_Cash_Collatral: 'mtfCashCollateral',
            MTF_Share_Collatral: 'mtfShareCollateral',
            MTF_TotalCollatral: 'mtfTotalCollateral',
            MTF_REQMargin: 'mtfRequiredMargin',
            MTF_MTMLoss: 'mtfMtmLoss',
            MTF_MarginShortAcess: 'mtfMarginShortAccess',
            MTF_LIMIT: 'mtfLimit',
            MFT_Max_Amount: 'mtfMaxAmount'
        },
        requiredColumns: [
            'CLIENT_ID',
            'LEDGER',
            'MTF_FUNDED',
            'MTF_TotalFundedAmount',
            'MTF_Cash_Collatral',
            'MTF_Share_Collatral',
            'MTF_TotalCollatral',
            'MTF_REQMargin',
            'MTF_MTMLoss',
            'MTF_MarginShortAcess',
            'MTF_LIMIT',
            'MFT_Max_Amount'
        ],
        batchableFields: ['clientId'],
        entity: MtfReport,
        uniqueKeys: ['clientId'],
        transformRow: async (row, dataSource, cache) => {
            const clientData = cache?.client?.get(row.clientId);
            let branchId = clientData?.branchId || 'Unknown Branch';
            return {
                ...row,
                ledgerBalance: Number(row.ledgerBalance) || 0,
                mtfFunded: Number(row.mtfFunded) || 0,
                mtfTotalFundedAmount: Number(row.mtfTotalFundedAmount) || 0,
                mtfCashCollateral: Number(row.mtfCashCollateral) || 0,
                mtfShareCollateral: Number(row.mtfShareCollateral) || 0,
                mtfTotalCollateral: Number(row.mtfTotalCollateral) || 0,
                mtfRequiredMargin: Number(row.mtfRequiredMargin) || 0,
                mtfMtmLoss: Number(row.mtfMtmLoss) || 0,
                mtfMarginShortAccess: Number(row.mtfMarginShortAccess) || 0,
                mtfLimit: Number(row.mtfLimit) || 0,
                mtfMaxAmount: Number(row.mtfMaxAmount) || 0,
                branchId
            };
        }
    },
    [ReportType.ISIN_MASTER]: {
        columnMapping: {
            ISIN_CODE: 'isinCode',
            SCRIP_NAME: 'scripName'
        },
        requiredColumns: ['ISIN_CODE', 'SCRIP_NAME'],
        entity: ISINMaster,
        uniqueKeys: ['isinCode'],
        transformRow: (row) => ({
            ...row
        })
    },
    [ReportType.TOUCH_TURNOVER_REPORT]: {
        columnMapping: {
            COMPANY_CODE: 'cocd',
            CLIENT_ID: 'clientId',
            TRADE_DATE: 'tradeDate',
            OT_IBT19: 'netBrokerage'
        },
        batchableFields: ['clientId'],
        requiredColumns: ['COMPANY_CODE', 'CLIENT_ID', 'TRADE_DATE', 'OT_IBT19'],
        entity: TouchTurnover,
        uniqueKeys: ['rowKey'],
        transformRow: async (row, dataSource, cache) => {
            const clientData = cache?.client?.get(row.clientId);
            const clientName = cache?.user?.get(row.clientId) || 'Unknown Client';
            const branchId = clientData?.branchId || 'HOFM';
            const regionBranchId = clientData?.regionBranchId || null; // Use cached regionBranchId
            return {
                ...row,
                tradeDate: DateUtils.parseDate(row.tradeDate),
                netBrokerage: Number(row.netBrokerage) || 0,
                branchId,
                clientName,
                regionBranchId, // Add regionBranchId to the row
                rowKey: generateRowKey(row, [
                    'clientId',
                    { name: 'tradeDate', transform: (d) => DateUtils.parseDate(d) },
                    'cocd',
                ])
            };
        }
    },
    [ReportType.MONTHLY_SETTLEMENT]: {
        columnMapping: {
            'BRANCH CODE': 'branchId',
            'Client Id': 'clientId',
            'CLIENT NAME': 'clientName',
            'Net Payment Release': 'netPaymentRelease',
            'Last Trade Dt': 'lastTradedDate',
            'Days Last Traded': 'daysLastTraded'
        },
        requiredColumns: [
            'BRANCH CODE',
            'Client Id',
            'CLIENT NAME',
            'Net Payment Release',
            'Last Trade Dt',
            'Days Last Traded'
        ],
        entity: MonthlySettlement,
        uniqueKeys: ['clientId'],
        transformRow: (row) => ({
            ...row,
            netPaymentRelease: Number(row.netPaymentRelease) || 0,
            lastTradedDate: DateUtils.parseDate(row.lastTradedDate) || null,
            daysLastTraded: Number(row.daysLastTraded) || 0
        })
    },
    [ReportType.QUARTERLY_SETTLEMENT]: {
        columnMapping: {
            'Br Code': 'branchId',
            'Client Id': 'clientId',
            'CLIENT NAME': 'clientName',
            'Net Payment Release': 'netPaymentRelease'
        },
        requiredColumns: ['Br Code', 'Client Id', 'CLIENT NAME', 'Net Payment Release'],
        entity: QuarterlySettlement,
        uniqueKeys: ['clientId'],
        transformRow: (row) => ({
            ...row,
            netPaymentRelease: Number(row.netPaymentRelease) || 0
        })
    },
    [ReportType.HOLDINGS_STATEMENT]: {
        columnMapping: {
            'Client code': 'clientId',
            ISIN: 'isinCode',
            Quantity: 'quantity',
            'Closing Price': 'previousClosing',
            'Purchase Average of shares': 'buyAvg'
        },
        requiredColumns: ['Client code', 'ISIN', 'Quantity', 'Closing Price', 'Purchase Average of shares'],
        entity: HoldingsStatement,
        uniqueKeys: ['clientId', 'isinCode'],
        batchableFields: ['isinCode', 'clientId'],
        transformRow: async (row, dataSource, cache) => {
            try {
                if (!row.isinCode || typeof row.isinCode !== 'string') {
                    throw new Error(`Invalid isinCode: ${row.isinCode}`);
                }
                if (!row.clientId || typeof row.clientId !== 'string') {
                    throw new Error(`Invalid clientId: ${row.clientId}`);
                }

                const isinKey = row.isinCode.trim().toUpperCase();
                const scripName = cache.isin_master.get(isinKey) || isinKey; // Fixed: Use .get() for Map

                const clientKey = row.clientId.trim();
                let clientData = cache.client.get(clientKey);
                let clientName = cache.user.get(clientKey) || 'Unknown Client';
                let clientKeyUsed = clientKey;

                const quantity = parseFloat(row.quantity) || 0;
                const previousClosing = parseFloat(row.previousClosing) || 0;
                const value = quantity * previousClosing;
                const roundedValue = Number(value.toFixed(2));

                const branchId = clientData?.branchId;
                if (!branchId) {
                    throw new Error(`No branchId found for clientId: ${clientKeyUsed}`);
                }

                if (!clientName) {
                    throw new Error(`clientName is null/undefined for clientId: ${clientKey}`);
                }

                return {
                    ...row,
                    branchId,
                    clientName,
                    scripName,
                    value: roundedValue
                };
            } catch (error) {
                return {
                    ...row,
                    error: error.message
                };
            }
        }
    },
    [ReportType.BRANCH_TARGET]: {
        columnMapping: {
            branch_code: 'branchId',
            equity_target: 'equityTarget',
            fno_target: 'fnoTarget',
            commodity_target: 'commodityTarget',
            slbm_target: 'slbmTarget',
            total_target: 'totalTarget',
            mf_target: 'mfTarget',
            insurance_target: 'insuranceTarget',
            total_active_clients_goal: 'activeClientsGoal',
            new_clients_goal: 'newClientsTarget',
            reactivationClientsTarget: 'reactivationClientsTarget',
            'No trading days': 'noDays',
            Date: "date",
        },
        requiredColumns: [
            'No trading days',
            'branch_code',
            'equity_target',
            'fno_target',
            'commodity_target',
            // 'slbm_target',
            'total_target',
            // 'mf_target',
            // 'insurance_target',
            'total_active_clients_goal',
            'new_clients_goal',
            // 'reactivationClientsTarget',
            // 'No days',
            'Date'
        ],
        entity: BranchTarget,
        uniqueKeys: ['branchId', 'month'],
        transformRow: (row) => {
            const transformed: any = {
                branchId: row.branchId,
                month: DateUtils.toMonthFormat(row.date),
            };

            const optionalFields = {
                equityTarget: parseFloat(row.equityTarget || 0),
                fnoTarget: parseFloat(row.fnoTarget || 0),
                commodityTarget: parseFloat(row.commodityTarget || 0),
                slbmTarget: parseFloat(row.slbmTarget || 0),
                totalTarget: parseFloat(row.totalTarget || 0),
                mfTarget: parseFloat(row.mfTarget || 0),
                insuranceTarget: parseFloat(row.insuranceTarget || 0),
                activeClientsGoal: parseInt(row.activeClientsGoal || 0, 10),
                newClientsTarget: parseInt(row.newClientsTarget || 0, 10),
                noDays: parseInt(row.noDays || 0, 10),
                reactivationClientsTarget: parseInt(row.reactivationClientsTarget || 0, 10),
            };

            // Only assign optional fields if they are valid numbers
            for (const key in optionalFields) {
                const val = optionalFields[key];
                if (!isNaN(val)) {
                    transformed[key] = val;
                }
            }

            return transformed;
        }

    },
    [ReportType.ANNUAL_BRANCH_REPORT]: {
        columnMapping: {
            'Branch Code': 'branchId',
            'Eq': 'equityBrokerage',
            'F&O': 'fnoBrokerage',
            'Slbm': 'slbmBrokerage',
            Comm: 'commodityBrokerage',
            Mf: 'mfBrokerage',
            Bonds: 'bondsBrokerage',
            Insurance: 'insuranceBrokerage',
            Others: 'othersBrokerage',
            Total: 'totalBrokerage',
            'Clients traded': 'tradedClients',
            Avg: "average",
        },
        requiredColumns: [
            'Branch Code',
            'Eq',
            'F&O',
            'Comm',
            'Total',
        ],
        entity: AnnualBranchStats,
        uniqueKeys: ['branchId', 'financialYear'],
        transformRow: (row,dataSource,cache) => {
            const transformed: any = {
                branchId: row.branchId,
                financialYear: cache.financialYear
            };

            const optionalFields = {
                equityBrokerage: parseFloat(row.equityBrokerage || 0),
                fnoBrokerage: parseFloat(row.fnoBrokerage || 0),
                commodityBrokerage: parseFloat(row.commodityBrokerage || 0),
                slbmBrokerage: parseFloat(row.slbmBrokerage || 0),
                bondsBrokerage: parseFloat(row.bondsBrokerage || 0),
                totalBrokerage: parseFloat(row.totalBrokerage || 0),
                mfBrokerage: parseFloat(row.mfBrokerage || 0),
                insuranceBrokerage: parseFloat(row.insuranceBrokerage || 0),
                othersBrokerage: parseFloat(row.othersBrokerage || 0),
                tradedClients: parseInt(row.tradedClients || 0, 10),
                average: parseFloat(row.average || 0),
            };

            // Only assign optional fields if they are valid numbers
            for (const key in optionalFields) {
                const val = optionalFields[key];
                if (!isNaN(val)) {
                    transformed[key] = val;
                }
            }

            return transformed;
        }

    },
    [MasterType.DEALER_RM_MAPPING]: {
        master: true,
        columnMapping: {
            Code_: 'clientId',
            deal1: 'equityDealer',
            deal2: 'commodityDealer1',
            deal3: 'commodityDealer2',
            r_m: 'rm',
            mapping: 'mappingStatus',
            online: 'isOnlineClient',
        },
        requiredColumns: ['Code_'],
        entity: Client,
        uniqueKeys: ['clientId'],
        transformRow: (row) => ({
            clientId: row.Code_ || null,
            equityDealer: row.deal1 || null,
            commodityDealer1: row.deal2 || null,
            commodityDealer2: row.deal3 || null,
            rm: row.r_m || null,
            mappingStatus: row.mapping === '1' || row.mapping === 1 || false,
            isOnlineClient: row.online === '1' || row.online === 1 || false,
        }),
        validateRow: async (
            rows: any[],
            manager: EntityManager,
        ): Promise<{ validRows: any[]; errors: { row: number; message: string }[] }> => {
            const validRows: any[] = [];
            const errors: { row: number; message: string }[] = [];
            const seenClientIds = new Set<string>();

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNumber = i + 2; // Header row = 1

                // Validate clientId
                if (!row.clientId) {
                    errors.push({ row: rowNumber, message: 'Missing clientId' });
                    continue;
                }

                // Check for duplicates
                if (seenClientIds.has(row.clientId)) {
                    errors.push({ row: rowNumber, message: `Duplicate clientId '${row.clientId}'` });
                    continue;
                }
                seenClientIds.add(row.clientId);

                // Skip rows with all empty fields except clientId
                const fields = [
                    row.equityDealer,
                    row.commodityDealer1,
                    row.commodityDealer2,
                    row.rm,
                    row.mappingStatus,
                    row.isOnlineClient,
                ];
                const hasNonEmptyField = fields.some(
                    (field) => field !== null && field !== undefined && field !== '' && field !== false,
                );
                if (!hasNonEmptyField) {
                    errors.push({
                        row: rowNumber,
                        message: `Skipping row ${rowNumber}: all fields except clientId are empty`,
                    });
                    continue;
                }

                validRows.push(row);
            }

            Logger.debug(`Processed ${rows.length} rows. Valid: ${validRows.length}, Skipped: ${errors.length}`);
            return { validRows, errors };
        },
        bulkInsert: async (dtos: ClientMappingInput[], service: ClientService): Promise<BulkInsertResult<Client>> => {
            return await service.bulkUpsertClientMappings(dtos);
        },
    },
    [MasterType.KYC_MASTER]: {
        master: true,
        columnMapping: {
            CLIENT_ID: 'clientId',
            BRANCH_CODE: 'branchId',
            MOBILE_NO: 'phoneNumber',
            CLIENT_ID_MAIL: 'email',
            CLIENT_NAME: 'clientName',
            BIRTH_DATE: 'dateOfBirth',
            SEX: 'gender',
            CL_RESI_ADD1: 'address1',
            CL_RESI_ADD2: 'address2',
            CL_RESI_ADD3: 'address3',
            CITY: 'cityName',
            R_STATE: 'stateName',
            COUNTRY: 'countryName',
            PIN_CODE: 'zip',
            ACTIVE_INACTIVE: 'status',
            PAN_NO: 'panNumber',
            CLIENT_DP_CODE: 'dpId',
            NOTE5: 'clientActivationDate',
            NOTE4: 'clientReactivationDate',
            // AGREEMENT_DATE: 'clientActivationDate',
            BANK_ACCTYPE: 'bankAccountType',
            BANK_ACNO: 'bankAccountNumber',
            IFSCCODE: 'bankIfscCode',
            CLIENT_BANK_NAME: 'bankName',
            DEFAULT_ACC_BANK: 'defaultBank',
            FAMILY_GROUP: 'familyGroup',
            REGION_BRANCH_CODE: 'onlineClient',
            NOTE3: 'regionBranchCode'
        },
        requiredColumns: [
            'CLIENT_ID',
            'BRANCH_CODE',
            // 'MOBILE_NO',
            'CLIENT_ID_MAIL',
            'CLIENT_NAME',
            'R_STATE',
            'COUNTRY',
            // 'PIN_CODE',
            // 'ACTIVE_INACTIVE',
            'PAN_NO',
            'NOTE5'
            // 'AGREEMENT_DATE'
        ],
        entity: Client,
        uniqueKeys: ['clientId'],
        transformRow: async (row, dataSource) => {
            if (!row.clientId) {
                Logger.warn(`Row missing clientId: ${JSON.stringify(row, null, 2)}`);
            }
            if (row.onlineClient !== 'TBON' && row.regionBranchCode === 'TBHO') {
                row.regionBranchCode = null;
            }
            const addresses = [row.address1, row.address2, row.address3]
                .filter(Boolean)
                .map((addr) => (typeof addr === 'string' ? addr.trim() : addr))
                .join(' ');
            // Validate and set stateId if stateName is provided
            if (row.stateName) {
                const state = await dataSource
                    .getRepository(State)
                    .createQueryBuilder('state')
                    .where('LOWER(state.name) = LOWER(:name)', { name: row.stateName })
                    .getOne();
                if (!state) {
                    throw new Error(`State with name ${row.stateName} not found`);
                }
                row.stateId = state.id;
            }

            // Validate and set countryId if countryName is provided
            if (row.countryName) {
                const country = await dataSource
                    .getRepository(Country)
                    .createQueryBuilder('country')
                    .where('LOWER(country.name) = LOWER(:name)', { name: row.countryName })
                    .getOne();
                if (!country) {
                    throw new Error(`country with name ${row.countryName} not found`);
                }
                row.countryId = country.id;
            }
            return {
                clientId: row.clientId,
                branchId: row.branchId,
                phoneNumber: row.phoneNumber || undefined,
                regionBranchCode: row.regionBranchCode,
                email: row.email,
                clientName: row.clientName || '',
                dateOfBirth: row.dateOfBirth ? DateUtils.parseDate(row.dateOfBirth) : undefined,
                gender: row.gender === 'M' ? 'Male' : row.gender === 'F' ? 'Female' : null,
                addresses: addresses || undefined,
                stateId: row.stateId,
                cityName: row.cityName,
                countryId: row.countryId,
                zip: row.zip || undefined,
                status: row.status === 'A' ? 'active' : 'inactive',
                panNumber: row.panNumber || undefined,
                dpId: row.dpId || undefined,
                clientActivationDate: row.clientActivationDate
                    ? DateUtils.parseDate(row.clientActivationDate)
                    : undefined,
                clientReactivationDate: row.clientReactivationDate
                    ? DateUtils.parseDate(row.clientReactivationDate)
                    : undefined,
                bankAccountType: row.bankAccountType || undefined,
                bankAccountNumber: row.bankAccountNumber || undefined,
                bankIfscCode: row.bankIfscCode || undefined,
                bankName: row.bankName || undefined,
                defaultBank: row.defaultBank === 'Y' ? true : false,
                online: false,
                mappingStatus: false,
                familyGroup: row.familyGroup ?? undefined,
                companyId: 1
            };
        },
        validateRow: async (
            rows: any[],
            manager: EntityManager
        ): Promise<{ validRows: any[]; errors: { row: number; message: string }[] }> => {
            // Collect unique branchIds and regionBranchCodes
            const branchIds = [
                ...new Set(
                    rows
                        .map((r) => r.branchId?.toString().trim().toUpperCase() ?? null)
                        .filter(Boolean)
                )
            ];
            const regionBranchCodes = [
                ...new Set(
                    rows
                        .map((r) => r.regionBranchCode?.toString().trim().toUpperCase() ?? null)
                        .filter(Boolean)
                )
            ];

            // Fetch all valid branches for both branchId and regionBranchCode
            const branches = await manager.find(Branch, {
                where: { id: In([...branchIds, ...regionBranchCodes]), deletedAt: IsNull() },
                select: ['id']
            });

            const branchMap = new Map(branches.map((b) => [b.id.toUpperCase(), b]));

            const seenClientIds = new Set<string>();
            const validRows: any[] = [];
            const errors: { row: number; message: string }[] = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNumber = i + 2; // Assuming header is row 1

                // Validate clientId
                const clientId = row.clientId;
                if (!clientId) {
                    errors.push({ row: rowNumber, message: `Missing clientId` });
                    continue;
                }

                // Skip if clientId is duplicate
                if (seenClientIds.has(clientId)) {
                    Logger.warn(`Duplicate clientId '${clientId}' found at row ${rowNumber}, skipping`);
                    errors.push({ row: rowNumber, message: `Duplicate clientId '${clientId}'` });
                    continue;
                }

                // Validate branchId (required)
                const rawBranchId = row.branchId?.toString().trim().toUpperCase();
                if (!rawBranchId || !branchMap.has(rawBranchId)) {
                    Logger.warn(`Branch '${row.branchId || 'missing'}' not found for clientId '${clientId}' at row ${rowNumber}, skipping`);
                    errors.push({
                        row: rowNumber,
                        message: `Invalid or missing branchId '${row.branchId || 'missing'}' not found in branch table`
                    });
                    continue;
                }

                // Validate regionBranchCode (optional, since region_branch_id is nullable)
                const rawRegionBranchCode = row.regionBranchCode?.toString().trim().toUpperCase();
                if (rawRegionBranchCode && !branchMap.has(rawRegionBranchCode)) {
                    Logger.warn(`Region branch code '${row.regionBranchCode}' not found for clientId '${clientId}' at row ${rowNumber}, skipping`);
                    errors.push({
                        row: rowNumber,
                        message: `Invalid regionBranchCode '${row.regionBranchCode}' not found in branch table`
                    });
                    continue;
                }

                // Handle onlineClient and regionBranchCode logic
                if (row.onlineClient !== 'TBON' && rawRegionBranchCode === 'TBHO') {
                    row.regionBranchCode = null; // Respect existing transformRow logic
                }

                // Mark clientId as seen and add row to validRows
                seenClientIds.add(clientId);
                validRows.push(row);
            }

            Logger.debug(
                `Processed ${rows.length} rows. Valid: ${validRows.length}, Errors: ${errors.length}, ` +
                `BranchIds: ${branchIds.join(', ')}, RegionBranchCodes: ${regionBranchCodes.join(', ')}`
            );

            return { validRows, errors };
        },

        bulkInsert: async (dtos: CreateClientDto[], service: ClientService): Promise<BulkInsertResult<Client>> => {
            return await service.bulkCreate(dtos);
        }
    },
    [MasterType.BRANCH_MASTER]: {
        master: true,
        requiredColumns: [
            'Code',
            'Name',
            'Model (Fr /Ref /Branch /Region /State)',
            'Contrl Br',
            'Email',
            'Mobile',
            'Pincode',
            'Address'
        ],
        entity: Branch,
        uniqueKeys: ['id'],
        columnMapping: {
            Code: 'id',
            Name: 'name',
            'Model (Fr /Ref /Branch /Region /State)': 'model',
            'Contrl Br': 'controlBranchId',
            'Region Master': 'regionalManagerId',
            'State Name': 'stateName',
            City: 'city',
            Pincode: 'pincode',
            Address: 'address',
            Email: 'email',
            Mobile: 'phone',
            'PAN No': 'panNumber',
            'Segment Availed': 'segments',
            'Activation Date': 'activationDate',
            'Terminal ID 1': 'terminal1',
            'Terminal ID 2': 'terminal2',
            'Terminal ID 3': 'terminal3',
            'Terminal ID 4': 'terminal4',
            'Terminal ID 5': 'terminal5',
            'Terminal ID 6': 'terminal6',
            'Terminal ID 7': 'terminal7',
            'Terminal ID 8': 'terminal8',
            'Terminal ID 9': 'terminal9',
            'Terminal ID 10': 'terminal10',
            'Terminal ID 11': 'terminal11',
            Sharing: 'sharing'
        },
        transformRow: (row: any): CreateBranchDto => {
            const terminals = [
                row.terminal1,
                row.terminal2,
                row.terminal3,
                row.terminal4,
                row.terminal5,
                row.terminal6,
                row.terminal7,
                row.terminal8,
                row.terminal9,
                row.terminal10,
                row.terminal11
            ].filter((terminal: string) => terminal && terminal.trim() !== '' && terminal !== '0');
            return {
                id: row.id,
                name: row.name,
                model: row.model ? row.model : undefined,
                controlBranchId: row.controlBranchId ? row.controlBranchId.toUpperCase() : undefined,
                stateId: row.stateId,
                regionalManagerId: row.regionalManagerId,
                city: row.city,
                pincode: row.pincode ? parseInt(row.pincode, 10) : undefined,
                address: row.address,
                email: row.email || undefined,
                phone: row.phone || undefined,
                panNumber: row.panNumber || undefined,
                segments: row.segments ? row.segments.split(',').map((s: string) => s.trim()) : [],
                activationDate: row.activationDate ? new Date(DateUtils.parseDate(row.activationDate)) : undefined,
                active: true,
                sharing: row.sharing ? parseFloat(row.sharing) : undefined,
                terminals
            };
        },
        validateRow: async (
            rows: any[],
            manager: EntityManager
        ): Promise<{ validRows: any[]; errors: { row: number; message: string }[] }> => {
            const stateNames = [...new Set(rows.map((row) => row.stateName).filter((name) => name))];
            let stateMap = new Map<string, any>();

            if (stateNames.length > 0) {
                const states = await manager
                    .createQueryBuilder(State, 'state')
                    .where('LOWER(REPLACE(state.name, " ", "")) IN (:...names)', {
                        names: stateNames.map((name) => name.toLowerCase().replace(/\s+/g, ''))
                    })
                    .getMany();
                stateMap = new Map(states.map((state) => [state.name.toLowerCase().replace(/\s+/g, ''), state])); // Normalize spaces in state names
            }

            const validRows: any[] = [];
            const errors: { row: number; message: string }[] = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNumber = i + 2; // Assuming rows start from the second row (1-indexed for display purposes)
                let isValid = true;
                const errorMessages: string[] = [];

                // Model validation
                if (row.model) {
                    const validModels = branchModelsArr;
                    const lowercaseModel = row.model.toLowerCase();
                    const lowercaseValidModels = validModels.map((model) => model.toLowerCase());
                    if (!lowercaseValidModels.includes(lowercaseModel)) {
                        errorMessages.push(`Invalid model: ${row.model}. Must be one of ${validModels.join(', ')}`);
                        isValid = false;
                    }
                } else {
                    errorMessages.push('Model is required');
                    isValid = false;
                }

                // State validation (Allow null or empty stateName)
                if (row.stateName) {
                    const normalizedStateName = row.stateName.toLowerCase().replace(/\s+/g, ''); // Normalize spaces
                    const state = stateMap.get(normalizedStateName);
                    if (!state) {
                        errorMessages.push(`State with name ${row.stateName} not found`);
                        isValid = false;
                    } else {
                        row.stateId = state.id;
                    }
                } else if (row.stateName === null) {
                    row.stateId = null; // Allow state to be null
                }

                // Pincode validation
                if (!row.pincode || isNaN(row.pincode) || parseInt(row.pincode, 10) <= 0) {
                    errorMessages.push(`Invalid pincode: ${row.pincode}. Must be a positive number`);
                    isValid = false;
                }

                // If the row is not valid, add it to the errors list
                if (!isValid) {
                    errors.push({ row: rowNumber, message: errorMessages.join('; ') });
                    Logger.warn(`Row ${rowNumber} skipped: ${errorMessages.join('; ')}`);
                } else {
                    validRows.push(row);
                }
            }

            Logger.debug(`Processed ${rows.length} rows. Valid: ${validRows.length}, Skipped: ${errors.length}`);
            if (errors.length > 0) {
                Logger.debug(`Validation errors: ${JSON.stringify(errors, null, 2)}`);
            }

            return { validRows, errors };
        },

        bulkInsert: async (dtos: CreateBranchDto[], service: BranchService): Promise<BulkInsertResult<Branch>> => {
            return await service.bulkCreate(dtos);
        }
    },
    [MasterType.EMPLOYEE_MASTER]: {
        master: true,
        columnMapping: {
            'Staff name': 'employeeName',
            'Staff Code': 'employeeId',
            Mobile: 'phoneNumber',
            Email: 'email',
            'Branch Code': 'branchId',
            'Dealer Code': 'dealerId',
            'Pan NO': 'panNumber',
            'MCX CTCL ID': 'terminal1',
            'NCDEX  CTCL ID': 'terminal2',
            'NSE CTCL ID': 'terminal3',
            'NFO CTCL ID': 'terminal4',
            'NSE CD CTCL ID': 'terminal5',
            'NSE Comm   CTCL ID': 'terminal6',
            'BSE CTCL ID': 'terminal7',
            'BFO CTCL ID': 'terminal8'
        },
        requiredColumns: ['Staff name', 'Staff Code', 'Mobile', 'Email', 'Branch Code'],
        entity: Employee,
        uniqueKeys: ['employeeId'],
        transformRow: (row) => {
            const terminals = new Set<string>(
                [
                    row.terminal1,
                    row.terminal2,
                    row.terminal3,
                    row.terminal4,
                    row.terminal5,
                    row.terminal6,
                    row.terminal7,
                    row.terminal8
                ].filter((terminal: string) => terminal && terminal.trim() !== '' && terminal !== '0')
            );
            return {
                firstName: row.employeeName,
                employeeId: row.employeeId,
                phone: row.phoneNumber,
                email: row.email,
                branchId: row.branchId,
                dealerId: row.dealerId,
                panNumber: row.panNumber,
                terminals: Array.from(terminals),
                companyId: 1,
                roleId: row.dealerId ? roleIds.dealer : roleIds.staff // Default role based on dealerId
            };
        },
        validateRow: async (
            rows: any[],
            manager: EntityManager
        ): Promise<{ validRows: any[]; errors: { row: number; message: string }[] }> => {
            const branchIds = [...new Set(rows.map((row) => row.branchId).filter((id) => id))];
            const branches = await manager.find(Branch, {
                where: { id: In(branchIds), deletedAt: IsNull() },
                select: ['id']
            });
            const branchMap = new Map(branches.map((branch) => [branch.id, branch]));

            const validRows: any[] = [];
            const errors: { row: number; message: string }[] = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const rowNumber = i + 2;
                let isValid = true;
                const errorMessages: string[] = [];

                if (row.branchId && !branchMap.has(row.branchId)) {
                    errorMessages.push(`Branch with ID ${row.branchId} not found`);
                    isValid = false;
                }

                if (!isValid) {
                    errors.push({ row: rowNumber, message: errorMessages.join('; ') });
                    Logger.warn(`Row ${rowNumber} skipped: ${errorMessages.join('; ')}`);
                } else {
                    validRows.push(row);
                }
            }

            Logger.debug(`Processed ${rows.length} rows. Valid: ${validRows.length}, Skipped: ${errors.length}`);
            if (errors.length > 0) {
                Logger.debug(`Validation errors: ${JSON.stringify(errors, null, 2)}`);
            }

            return { validRows, errors };
        },
        bulkInsert: async (
            dtos: CreateEmployeeDto[],
            service: EmployeeService
        ): Promise<BulkInsertResult<Employee>> => {
            return await service.bulkCreate(dtos);
        }
    }
};
