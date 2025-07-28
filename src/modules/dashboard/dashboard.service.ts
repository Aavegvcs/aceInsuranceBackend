import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Between, DataSource, In, LessThanOrEqual, Repository } from 'typeorm';
import { Branch } from '@modules/branch/entities/branch.entity';
import { Client } from '@modules/client/entities/client.entity';
import { DailyBranchStats } from './entities/daily-branch-stats.entity';
import { SegmentRevenue } from '@modules/report/entities/segment-revenue.entity';
import { BranchTarget } from '@modules/branch/entities/branch-target.entity';
import { BranchModels, branchModelsArr, Designation, mapCocdToSegment } from 'src/utils/app.utils';
import { DateUtils } from 'src/utils/date.utils';
import { Employee, EmployeeStatus } from '@modules/employee/entities/employee.entity';
import { combineItems, parseRevenueValue } from 'src/utils/string.utils';
import { ClientDashboardStats } from './entities/client-stats.entity';
import { HoldingsStatement } from '@modules/report/entities/holdings-statement.entity';
import { RiskReport } from '@modules/report/entities/risk-report.entity';
import pLimit from 'p-limit';
import { TouchTurnover } from '@modules/report/entities/touch-turnover.entity';
import * as moment from 'moment';
import 'moment-timezone';
import { Dealer } from '@modules/employee/entities/dealer.entity';
import { DailyDealerStats } from './entities/daily-dealer-stats.entity';

interface ClientAggregatedData {
    clientId: string;
    equities: number;
    mutualFunds: number;
    totalHolding: number;
    ledgerBalance: number;
    spanMargin: number;
    totalBalance: number;
}

interface ExistingStats {
    clientId: string;
    portfolioValue: number;
    totalHolding: number;
    equities: number;
    mutualFunds: number;
    totalBalance: number;
    spanMargin: number;
    ledgerBalance: number;
}

@Injectable()
export class DashboardService {
    private readonly batchSize = 5000;
    private readonly concurrencyLimit = 5;
    private readonly limit = pLimit(this.concurrencyLimit);
    private readonly logger = new Logger(DashboardService.name);
    private readonly MAX_PERCENTAGE = 9999999.99;
    private readonly MIN_PERCENTAGE = -9999999.99;

    constructor(private readonly dataSource: DataSource) { }


    async resolveBranchIds(employeeId: string): Promise<string[]> {
        const employee = await this.dataSource.getRepository(Employee).findOne({
            where: { id: employeeId },
            relations: ['branch'],
        });
        switch (employee.designation) {
            case Designation.regionalManager:
                const regionalBranches = await this.dataSource.getRepository(Branch).find({
                    where: { regionalManager: { id: employeeId }, model: BranchModels.BRANCH },
                    select: ['id'],
                });
                return regionalBranches.map(branch => branch.id);
            case Designation.branchManager:
                return [employee.branch.id];

            case Designation.superAdmin:
                const allBranches = await this.dataSource.getRepository(Branch).find({
                    where: { model: BranchModels.BRANCH },
                    select: ['id'],
                });
                return Array.from(new Set(allBranches.map(branch => branch.id)));
            default:
                this.logger.warn(`Unsupported designation: ${employee.designation}`);
                return [];
        }
    }

    async getValidTradeDates(startDate: Date, endDate: Date): Promise<Date[]> {
        try {
            const start = moment.utc(startDate).startOf('day');
            const end = moment.utc(endDate).endOf('day');
            this.logger.debug(`Fetching valid trade dates from ${start.toISOString()} to ${end.toISOString()}`);

            const records = await this.dataSource
                .getRepository(SegmentRevenue)
                .createQueryBuilder('segment_revenue')
                .select('DISTINCT DATE(segment_revenue.tradeDate)', 'tradeDate')
                .where('segment_revenue.tradeDate BETWEEN :start AND :end', {
                    start: start.toDate(),
                    end: end.toDate(),
                })
                .orderBy('tradeDate', 'ASC')
                .getRawMany();

            // Convert to IST dates for business logic
            const tradeDates = records.map(record =>
                moment.utc(record.tradeDate).tz('Asia/Kolkata').startOf('day').toDate()
            );

            this.logger.debug(`Valid trade dates: ${tradeDates.map(d => moment(d).format('YYYY-MM-DD')).join(', ')}`);

            return tradeDates;
        } catch (error) {
            this.logger.error(`Failed to fetch valid trade dates: ${error.message}`);
            throw new Error(`Failed to fetch valid trade dates: ${error.message}`);
        }
    }

    async generateDailyStatsForDate(statsDate: Date) {
        // Normalize date to start of day in IST
        const statsDateIst = moment(statsDate).tz('Asia/Kolkata');
        const statsDateOnly = statsDateIst.startOf('day');

        this.logger.debug(`Processing IST date: ${statsDateIst.format('YYYY-MM-DD')}`);

        // Use IST for all calculations
        const startOfDay = statsDateOnly.clone();
        const endOfDay = statsDateOnly.clone().endOf('day');
        const startOfMonth = statsDateOnly.clone().startOf('month');

        // Fetch all branches with relations
        const branchRepository = this.dataSource.getRepository(Branch);
        const branches = await branchRepository.find({
            where: { model: In([BranchModels.BRANCH, BranchModels.FRANCHISE, BranchModels.REFERRAL]) },
            relations: ['subBranches', 'controlBranch'],
        });
        this.logger.log(`Found ${branches.length} branches for processing`);

        if (!branches.length) {
            this.logger.warn(`No branches found for ${statsDateOnly.format('YYYY-MM-DD')}`);
            return;
        }

        // Build adjacency list and compute descendants
        const adjacencyList = new Map<string, string[]>();
        const parentMap = new Map<string, string | null>();
        const descendantsMap = new Map<string, string[]>();
        branches.forEach(branch => {
            adjacencyList.set(branch.id, branch.subBranches?.map(sb => sb.id) || []);
            parentMap.set(branch.id, branch.controlBranch?.id ?? null);
        });

        const getDescendants = (branchId: string, visited: Set<string> = new Set()): string[] => {
            if (visited.has(branchId)) return [];
            visited.add(branchId);
            const descendants: string[] = [branchId];
            const subBranchIds = adjacencyList.get(branchId) || [];
            for (const subBranchId of subBranchIds) {
                descendants.push(...getDescendants(subBranchId, visited));
            }
            return descendants;
        };
        branches.forEach(branch => {
            descendantsMap.set(branch.id, getDescendants(branch.id));
        });
        this.logger.log(`Computed descendants for ${branches.length} branches`);

        // Batch delete existing stats for all branches
        const allBranchIds = branches.map(b => b.id);
        await this.dataSource.getRepository(DailyBranchStats).delete({
            date: startOfDay.toDate(),
            branchId: In(allBranchIds),
        });
        this.logger.log(`Deleted existing stats for ${allBranchIds.length} branches on ${startOfDay.format('YYYY-MM-DD')}`);

        // Batch fetch branch targets for the month
        const monthKey = DateUtils.generateMonthKey(statsDateOnly.toDate());
        const branchTargets = await this.dataSource.getRepository(BranchTarget).find({
            where: { month: monthKey, branchId: In(allBranchIds) },
            select: ['branchId', 'totalTarget', 'noDays'],
        });
        const branchTargetMap = new Map(branchTargets.map(bt => [bt.branchId, bt]));
        this.logger.log(`Fetched ${branchTargets.length} branch targets for month ${monthKey}`);

        // Fetch total trading days for the month
        const tradingDays = await this.dataSource.getRepository(BranchTarget).findOne({
            where: { month: monthKey },
            select: ['noDays'],
        });
        const totalTradingDays = tradingDays?.noDays || 21;
        this.logger.log(`Total trading days for month ${monthKey}: ${totalTradingDays}`);

        // Calculate remaining trading days
        const tradingDaysUsedCountRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('COUNT(DISTINCT DATE(sr.tradeDate))', 'count')
            .where('sr.tradeDate >= :start AND sr.tradeDate < :end', {
                start: startOfMonth.format('YYYY-MM-DD'),
                end: statsDateOnly.format('YYYY-MM-DD'),
            })
            .getRawOne();

        const tradingDaysUsed = parseInt(tradingDaysUsedCountRaw?.count || '0', 10) + 1;
        const remainingDays = totalTradingDays - tradingDaysUsed;
        this.logger.log(`Trading days used till ${statsDateOnly.format('YYYY-MM-DD')}: ${tradingDaysUsed}, remaining: ${remainingDays}`);



        // Batch fetch total clients
        const totalClientsRaw = await this.dataSource
            .getRepository(Client)
            .createQueryBuilder('client')
            .select('client.branch_id AS branchId, COUNT(client.id) AS count')
            .where('client.branch_id IN (:...branchIds)', { branchIds: allBranchIds })
            .groupBy('client.branch_id')
            .getRawMany();
        const totalClientsMap = new Map<string, number>(totalClientsRaw.map(r => [r.branchId, parseInt(r.count, 10) || 0]));

        // Batch fetch traded clients for the day
        const tradedClientsRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, COUNT(DISTINCT sr.clientId) AS count')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfDay.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId')
            .getRawMany();
        const tradedClientsMap = new Map<string, number>(tradedClientsRaw.map(r => [r.branchId, parseInt(r.count, 10) || 0]));
        if (tradedClientsRaw.length === 0) {
            this.logger.warn(`No traded clients found for ${statsDateOnly.format('YYYY-MM-DD')}`);
        }

        // Batch fetch monthly traded clients
        const monthlyTradedClientsRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, COUNT(DISTINCT sr.clientId) AS count')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfMonth.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId')
            .getRawMany();
        const monthlyTradedClientsMap = new Map<string, number>(monthlyTradedClientsRaw.map(r => [r.branchId, parseInt(r.count, 10) || 0]));

        // Batch fetch added clients
        const addedClientsRaw = await this.dataSource
            .getRepository(Client)
            .createQueryBuilder('client')
            .select('client.branch_id AS branchId, COUNT(client.id) AS count')
            .where('client.branch_id IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('client.clientActivationDate >= :start AND client.clientActivationDate <= :end', {
                start: startOfMonth.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('client.branch_id')
            .getRawMany();
        const addedClientsMap = new Map<string, number>(addedClientsRaw.map(r => [r.branchId, parseInt(r.count, 10) || 0]));

        // Batch fetch traded franchisees
        const tradedFranchiseesRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .innerJoin(Branch, 'b', 'b.id = sr.branchId')
            .select('sr.branchId, COUNT(DISTINCT sr.branchId) AS count')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('b.model = :model', { model: BranchModels.FRANCHISE })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfDay.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId')
            .getRawMany();
        const tradedFranchiseesMap = new Map<string, number>(tradedFranchiseesRaw.map(r => [r.branchId, parseInt(r.count, 10) || 0]));

        // Batch fetch added franchisees
        const addedFranchiseesRaw = await this.dataSource
            .getRepository(Branch)
            .createQueryBuilder('branch')
            .select('COALESCE(branch.control_branch_id, branch.id) AS controlBranchId, COUNT(branch.id) AS count')
            .where('branch.id IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('branch.model = :model', { model: BranchModels.FRANCHISE })
            .andWhere('branch.activationDate >= :start AND branch.activationDate <= :end', {
                start: startOfMonth.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('COALESCE(branch.control_branch_id, branch.id)')
            .getRawMany();
        const addedFranchiseesMap = new Map(addedFranchiseesRaw.map(r => [r.controlBranchId, parseInt(r.count, 10) || 0]));

        // Batch fetch daily brokerage
        const dailyBrokerageRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, SUM(sr.netBrokerage) AS sum')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfDay.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId')
            .getRawMany();
        const dailyBrokerageMap = new Map<string, number>(dailyBrokerageRaw.map(r => [r.branchId, parseRevenueValue(r.sum)]));
        if (dailyBrokerageRaw.length === 0) {
            this.logger.warn(`No daily brokerage found for ${statsDateOnly.format('YYYY-MM-DD')}`);
        }

        // Batch fetch monthly brokerage
        const monthlyBrokerageRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, SUM(sr.netBrokerage) AS sum')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfMonth.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId')
            .getRawMany();
        const monthlyBrokerageMap = new Map<string, number>(monthlyBrokerageRaw.map(r => [r.branchId, parseRevenueValue(r.sum)]));

        // Batch fetch average revenue
        const avgRevenueRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, AVG(sr.netBrokerage) AS avg')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start', { start: startOfMonth.toDate() })
            .groupBy('sr.branchId')
            .getRawMany();
        const avgRevenueMap = new Map<string, number>(avgRevenueRaw.map(r => [r.branchId, parseRevenueValue(r.avg)]));

        // Batch fetch segment revenue
        const segmentRevenueRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, sr.cocd AS cocd, SUM(sr.netBrokerage) AS value')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfDay.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId, sr.cocd')
            .getRawMany();
        const segmentRevenueMap = new Map<string, { segment: string; value: number }[]>();
        segmentRevenueRaw.forEach(r => {
            const branchId = r.branchId;
            if (!segmentRevenueMap.has(branchId)) segmentRevenueMap.set(branchId, []);
            segmentRevenueMap.get(branchId)!.push({ segment: mapCocdToSegment(r.cocd), value: parseRevenueValue(r.value) });
        });

        // Batch fetch model revenue
        const modelRevenueRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, b.model AS model, SUM(sr.netBrokerage) AS value')
            .innerJoin(Branch, 'b', 'b.id = sr.branchId')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfDay.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId, b.model')
            .getRawMany();
        const modelRevenueMap = new Map<string, { model: string; value: number }[]>();
        modelRevenueRaw.forEach(r => {
            const branchId = r.branchId;
            if (!modelRevenueMap.has(branchId)) modelRevenueMap.set(branchId, []);
            modelRevenueMap.get(branchId)!.push({
                model: r.model === BranchModels.FRANCHISE ? 'FRANCHISE' : r.model === BranchModels.REFERRAL ? 'REFERRAL' : 'BRANCH',
                value: parseRevenueValue(r.value),
            });
        });

        // Batch fetch top 10 clients
        const top10ClientsRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, sr.clientId, SUM(sr.netBrokerage) AS value')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfDay.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId, sr.clientId')
            .orderBy('sr.branchId, value', 'DESC')
            .getRawMany();
        const top10ClientsMap = new Map<string, { clientId: string; value: number }[]>();
        top10ClientsRaw.reduce((map, r) => {
            const branchId = r.branchId;
            if (!map.has(branchId)) map.set(branchId, []);
            if (map.get(branchId)!.length < 10) {
                map.get(branchId)!.push({ clientId: r.clientId, value: parseRevenueValue(r.value) });
            }
            return map;
        }, top10ClientsMap);

        // Batch fetch top 10 franchisees
        const top10FranchiseesRaw = await this.dataSource
            .getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select('sr.branchId, SUM(sr.netBrokerage) AS value')
            .where('sr.branchId IN (:...branchIds)', { branchIds: allBranchIds })
            .andWhere('sr.tradeDate >= :start AND sr.tradeDate <= :end', {
                start: startOfDay.toDate(),
                end: endOfDay.toDate(),
            })
            .groupBy('sr.branchId')
            .orderBy('sr.branchId, value', 'DESC')
            .getRawMany();
        const top10FranchiseesMap = new Map<string, { branchId: string; value: number }[]>();
        top10FranchiseesRaw.reduce((map, r) => {
            const branchId = r.branchId;
            if (!map.has(branchId)) map.set(branchId, []);
            if (map.get(branchId)!.length < 10) {
                map.get(branchId)!.push({ branchId: r.branchId, value: parseRevenueValue(r.value) });
            }
            return map;
        }, top10FranchiseesMap);

        // Bottom-up aggregation for all branches
        const dailyStatsArray: DailyBranchStats[] = await Promise.all(
            branches.map(async branch => {
                const branchId = branch.id;
                const directSubBranchIds = adjacencyList.get(branchId) || [];
                const descendantBranchIds = descendantsMap.get(branchId) || [branchId];

                // Aggregate stats for the branch and its descendants
                const tradingDaysPassed = tradingDaysUsed;
                const totalClients = descendantBranchIds.reduce((sum, id) => sum + (totalClientsMap.get(id) || 0), 0);
                const tradedClients = descendantBranchIds.reduce((sum, id) => sum + (tradedClientsMap.get(id) || 0), 0);
                const monthlyTradedClients = descendantBranchIds.reduce((sum, id) => sum + (monthlyTradedClientsMap.get(id) || 0), 0);
                const addedClients = descendantBranchIds.reduce((sum, id) => sum + (addedClientsMap.get(id) || 0), 0);
                const tradedFranchisees = directSubBranchIds.reduce((sum, id) => sum + (tradedFranchiseesMap.get(id) || 0), 0);
                const addedFranchisees = addedFranchiseesMap.get(branch.controlBranch?.id ?? branch.id) || 0;
                const totalBrokerage = descendantBranchIds.reduce((sum, id) => sum + (dailyBrokerageMap.get(id) || 0), 0);
                const totalBrokerageThisMonth = descendantBranchIds.reduce((sum, id) => sum + (monthlyBrokerageMap.get(id) || 0), 0);
                const avgRevenue = descendantBranchIds.reduce((sum, id, _, arr) => sum + (avgRevenueMap.get(id) || 0) / arr.length, 0);
                const segmentRevenue = combineItems(
                    descendantBranchIds.flatMap(id => segmentRevenueMap.get(id) || []),
                    'segment',
                    'value'
                );
                const modelRevenue = descendantBranchIds
                    .flatMap(id => modelRevenueMap.get(id) || [])
                    .reduce((acc, item) => {
                        const existing = acc.find(i => i.model === item.model);
                        if (existing) {
                            existing.value += item.value;
                        } else {
                            acc.push({ ...item });
                        }
                        return acc;
                    }, [] as { model: string; value: number }[]);
                const top10Clients = descendantBranchIds
                    .flatMap(id => top10ClientsMap.get(id) || [])
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);
                const top10Franchisees = directSubBranchIds.length > 0
                    ? directSubBranchIds
                        .flatMap(id => top10FranchiseesMap.get(id) || [])
                        .sort((a, b) => b.value - a.value)
                        .slice(0, 10)
                    : [];

                // Fetch online brokerage for the branch
                const onlineBrokerageRaw = await this.dataSource
                    .getRepository(TouchTurnover)
                    .createQueryBuilder('tt')
                    .select('SUM(tt.netBrokerage)', 'onlineBrokerage')
                    .where('tt.regionBranchId = :branchId', { branchId: branch.id })
                    .andWhere('tt.tradeDate >= :start AND tt.tradeDate <= :end', {
                        start: startOfDay.toDate(),
                        end: endOfDay.toDate(),
                    })
                    .getRawOne();
                const onlineBrokerage = parseRevenueValue(onlineBrokerageRaw?.onlineBrokerage) || 0;
                // if (!onlineBrokerageRaw || onlineBrokerage === 0) {
                //     this.logger.warn(`No online brokerage found for branch ${branchId} on ${statsDateOnly.format('YYYY-MM-DD')}`);
                // }

                const branchTarget = branchTargetMap.get(branchId);
                const monthlyAvgBrokerage = tradingDaysPassed > 0 ? totalBrokerageThisMonth / tradingDaysPassed : 0;
                const projectedBrokerage = monthlyAvgBrokerage * totalTradingDays;
                const totalTarget = parseRevenueValue(branchTarget?.totalTarget) || 0;
                const totalFranchisees = directSubBranchIds.length;

                const dailyStats = new DailyBranchStats();
                dailyStats.branchId = branchId;
                dailyStats.date = startOfDay.toDate();
                dailyStats.totalBrokerage = totalBrokerage;
                dailyStats.projectedBrokerage = projectedBrokerage;
                dailyStats.monthlyBrokerage = totalBrokerageThisMonth;
                dailyStats.monthlyAvgBrokerage = monthlyAvgBrokerage;
                dailyStats.totalClients = totalClients;
                dailyStats.tradedClients = tradedClients;
                dailyStats.monthlyTradedClients = monthlyTradedClients;
                dailyStats.addedClients = addedClients;
                dailyStats.totalFranchisees = totalFranchisees;
                dailyStats.tradedFranchisees = tradedFranchisees;
                dailyStats.addedFranchisees = addedFranchisees;
                dailyStats.remainingDays = remainingDays;
                dailyStats.avgRevenue = avgRevenue;
                dailyStats.segmentRevenue = segmentRevenue;
                dailyStats.modelRevenue = modelRevenue;
                dailyStats.top10Clients = top10Clients;
                dailyStats.top10Franchisees = top10Franchisees;
                dailyStats.totalTradingDays = totalTradingDays;
                dailyStats.totalTarget = totalTarget;
                dailyStats.onlineBrokerage = onlineBrokerage;

                return dailyStats;
            })
        );

        if (dailyStatsArray.length > 0) {
            this.logger.log(`Saving ${dailyStatsArray.length} daily stats records for ${statsDateOnly.format('YYYY-MM-DD')}`);
            try {
                await this.dataSource.transaction(async (manager) => {
                    await manager
                        .getRepository(DailyBranchStats)
                        .createQueryBuilder()
                        .insert()
                        .into(DailyBranchStats)
                        .values(dailyStatsArray)
                        .orUpdate(
                            [
                                'totalBrokerage',
                                'projectedBrokerage',
                                'monthlyBrokerage',
                                'monthlyAvgBrokerage',
                                'totalClients',
                                'tradedClients',
                                'monthlyTradedClients',
                                'addedClients',
                                'totalFranchisees',
                                'tradedFranchisees',
                                'addedFranchisees',
                                'remainingDays',
                                'avgRevenue',
                                'segmentRevenue',
                                'modelRevenue',
                                'top10Clients',
                                'top10Franchisees',
                                'totalTradingDays',
                                'totalTarget',
                                'onlineBrokerage',
                            ],
                            ['branch_id', 'date']
                        )
                        .execute();
                });
                this.logger.log(`Successfully saved stats for ${dailyStatsArray.length} branches on ${statsDateOnly.format('YYYY-MM-DD')}`);
            } catch (error) {
                this.logger.error(`Failed to save daily stats for ${statsDateOnly.format('YYYY-MM-DD')}: ${error.message}`, error.stack);
                throw error;
            }
        } else {
            this.logger.warn(`No daily stats generated for ${statsDateOnly.format('YYYY-MM-DD')}`);
        }
    }

    async getDailyStats(branchIds: string[], date: string): Promise<any> {
        if (!branchIds.length) {
            this.logger.error('No branch IDs provided for daily stats');
            throw new Error('No branch IDs provided');
        }

        const repo = this.dataSource.getRepository(DailyBranchStats);
        Logger.log(`Fetching daily stats for ${branchIds.length} :  ${branchIds}`);

        // Fetch most recent 2 available trade dates for any branch (global dates)
        const recentDates = await repo
            .createQueryBuilder('stats')
            .select('DISTINCT stats.date', 'date')
            .where('stats.branchId IN (:...branchIds)', { branchIds })
            .orderBy('stats.date', 'DESC')
            .limit(2)
            .getRawMany();

        if (recentDates.length === 0) {
            this.logger.warn('No recent trade data found');
            return { status: 'skipped', message: 'No trading data available for processing' };
        }

        const latestDate = moment(recentDates[0]?.date); // Convert to moment
        const previousDate = recentDates[1]?.date ? moment(recentDates[1].date) : null; // Convert to moment or null

        // Fetch stats for T-1 (latest)
        const latestStats = await repo
            .createQueryBuilder('stats')
            .where('stats.branchId IN (:...branchIds)', { branchIds })
            .andWhere('stats.date = :latestDate', { latestDate: latestDate.toDate() }) // Use .toDate()
            .getMany();

        const startOfMonth = moment.tz(recentDates[0]?.date, 'Asia/Kolkata').startOf('day').clone().startOf('month');
        const cumulativeOnlineBrokerageRaw = await repo
            .createQueryBuilder('stats')
            .select('SUM(stats.onlineBrokerage)', 'cumulativeOnlineBrokerage')
            .where('stats.branchId IN (:...branchIds)', { branchIds })
            .andWhere('stats.date >= :startOfMonth', {
                startOfMonth: startOfMonth.toDate(),
            })
            .getRawOne();

        const cumulativeOnlineBrokerage = parseRevenueValue(cumulativeOnlineBrokerageRaw?.cumulativeOnlineBrokerage) || 0;
        if (cumulativeOnlineBrokerage === 0) {
            this.logger.warn(`No cumulative online brokerage found for ${latestDate.format('YYYY-MM-DD')} in month ${startOfMonth.format('YYYY-MM')}`);
        }

        const aggregatedStats = this.aggregateStats(latestStats);

        // Fetch stats for T-2 (previous)
        let aggregatedTMinus = {
            totalBrokerage: 0,
            tradedClients: 0,
            tradedFranchisees: 0,
        };

        if (previousDate) {
            const previousStats = await repo
                .createQueryBuilder('stats')
                .where('stats.branchId IN (:...branchIds)', { branchIds })
                .andWhere('stats.date = :previousDate', { previousDate: previousDate.toDate() }) // Use .toDate()
                .getMany();

            aggregatedTMinus = {
                totalBrokerage: previousStats.reduce((sum, s) => sum + parseRevenueValue(s.totalBrokerage), 0),
                tradedClients: previousStats.reduce((sum, s) => sum + (s.tradedClients || 0), 0),
                tradedFranchisees: previousStats.reduce((sum, s) => sum + (s.tradedFranchisees || 0), 0),
            };
        }

        // Previous month's end-day brokerage
        const statsDate = new Date(latestDate.toDate()); // Convert moment to Date
        const lastOfPrevMonth = new Date(statsDate.getFullYear(), statsDate.getMonth(), 0);

        const prevMonthStats = await repo
            .createQueryBuilder('stats')
            .innerJoin(
                qb => qb
                    .select('branchId, MAX(date) as maxDate')
                    .from(DailyBranchStats, 'sub')
                    .where('sub.branchId IN (:...branchIds)', { branchIds })
                    .andWhere('sub.date <= :lastOfPrevMonth', { lastOfPrevMonth })
                    .groupBy('branchId'),
                'latest',
                'stats.branchId = latest.branchId AND stats.date = latest.maxDate'
            )
            .getMany();

        const prevMonthBrokerage = prevMonthStats.reduce((sum, s) => sum + parseRevenueValue(s.monthlyBrokerage), 0);

        // Daily analysis for chart
        const { dailyAnalysis } = await this.getDailyAnalysis(branchIds, date, 'Daily');

        return {
            totalBrokerage: aggregatedStats.totalBrokerage ?? 0,
            projectedBrokerage: aggregatedStats.projectedBrokerage ?? 0,
            segmentRevenue: aggregatedStats.segmentRevenue ?? [],
            top10Clients: aggregatedStats.top10Clients ?? [],
            top10Franchisees: aggregatedStats.top10Franchisees ?? [],
            totalClients: aggregatedStats.totalClients ?? 0,
            tradedClients: aggregatedStats.tradedClients ?? 0,
            monthlyTradedClients: aggregatedStats.monthlyTradedClients ?? 0,
            totalFranchisees: aggregatedStats.totalFranchisees ?? 0,
            onlineBrokerage: cumulativeOnlineBrokerage ?? 0,
            tradedFranchisees: aggregatedStats.tradedFranchisees ?? 0,
            totalTradingDays: aggregatedStats.totalTradingDays ?? 0,
            remainingDays: aggregatedStats.remainingDays ?? 0,
            monthlyAvgBrokerage: aggregatedStats.monthlyAvgBrokerage ?? 0,
            monthlyBrokerage: aggregatedStats.monthlyBrokerage ?? 0,
            avgRevenue: aggregatedStats.avgRevenue ?? 0,
            addedClients: aggregatedStats.addedClients ?? 0,
            addedFranchisees: aggregatedStats.addedFranchisees ?? 0,
            modelRevenue: aggregatedStats.modelRevenue ?? [],
            totalTarget: aggregatedStats.totalTarget ?? 0,
            tMinusOneBrokerage: aggregatedTMinus.totalBrokerage,
            tMinusOneTradedClients: aggregatedTMinus.tradedClients,
            tMinusOneTradedFranchisees: aggregatedTMinus.tradedFranchisees,
            previousBrokerage: prevMonthBrokerage,
            dailyAnalysis,
        };
    }

    private aggregateStats(stats: DailyBranchStats[]): Partial<DailyBranchStats> {
        if (!stats.length) return {};
        Logger.log('traded clients', stats.reduce((sum, s) => sum + (s.monthlyTradedClients || 0), 0));
        return {
            totalBrokerage: stats.reduce((sum, s) => sum + parseRevenueValue(s.totalBrokerage), 0),
            projectedBrokerage: stats.reduce((sum, s) => sum + parseRevenueValue(s.projectedBrokerage), 0),
            monthlyBrokerage: stats.reduce((sum, s) => sum + parseRevenueValue(s.monthlyBrokerage), 0),
            monthlyAvgBrokerage:
                stats.reduce((sum, s) => sum + parseRevenueValue(s.monthlyAvgBrokerage), 0) / stats.length || 0,
            totalClients: stats.reduce((sum, s) => sum + (s.totalClients || 0), 0),
            tradedClients: stats.reduce((sum, s) => sum + (s.tradedClients || 0), 0),
            monthlyTradedClients: stats.reduce((sum, s) => sum + (s.monthlyTradedClients || 0), 0),

            addedClients: stats.reduce((sum, s) => sum + (s.addedClients || 0), 0),
            totalFranchisees: stats.reduce((sum, s) => sum + (s.totalFranchisees || 0), 0),
            tradedFranchisees: stats.reduce((sum, s) => sum + (s.tradedFranchisees || 0), 0),
            addedFranchisees: stats.reduce((sum, s) => sum + (s.addedFranchisees || 0), 0),
            remainingDays: stats[0].remainingDays || 0,
            avgRevenue: stats.reduce((sum, s) => sum + parseRevenueValue(s.avgRevenue), 0) / stats.length || 0,
            totalTradingDays: stats[0].totalTradingDays,
            totalTarget: stats.reduce((sum, s) => sum + parseRevenueValue(s.totalTarget), 0),
            segmentRevenue: combineItems(
                stats.flatMap((s) => s.segmentRevenue || []),
                'segment',
                'value'
            ),
            modelRevenue: combineItems(
                stats.flatMap((s) => s.modelRevenue || []),
                'model',
                'value'
            ),
            top10Clients: combineItems(
                stats.flatMap((s) => s.top10Clients || []),
                'clientId',
                'value',
                { sort: 'DESC', limit: 10 }
            ),
            top10Franchisees: combineItems(
                stats.flatMap((s) => s.top10Franchisees || []),
                'branchId',
                'value',
                { sort: 'DESC', limit: 10 }
            ),
        };
    }

    async computeDailyStats(date: Date): Promise<{ status: string; message: string }> {
        try {
            // Compute stats for the specified date (assumed valid)
            await this.generateDailyStatsForDate(date);
            return { status: 'success', message: `Daily stats computed successfully for ${date.toISOString().split('T')[0]}` };
        } catch (error) {
            this.logger.error(`Failed to compute daily stats for ${date.toISOString().split('T')[0]}: ${error.message}`);
            throw new Error(`Failed to compute daily stats: ${error.message}`);
        }
    }

    async backfillStats(startDate: Date, endDate: Date) {
        const start = DateUtils.normalizeDate(startDate);
        const end = DateUtils.normalizeDate(endDate);
        for (let date = new Date(start); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
            try {
                await this.generateDailyStatsForDate(new Date(date));
            } catch (error) {
                this.logger.error(`Failed to generate stats for ${date.toISOString().split('T')[0]}: ${error.message}`);
            }
        }
    }

    async generateClientDashboardStats(clientId: string): Promise<ClientDashboardStats> {
        const clientDashboardStatsRepo = this.dataSource.getRepository(ClientDashboardStats);
        const existingStats = await clientDashboardStatsRepo.findOne({ where: { clientId } });

        const holdings = await this.dataSource.getRepository(HoldingsStatement).find({ where: { clientId } });
        const riskReport = await this.dataSource.getRepository(RiskReport).findOne({ where: { clientId } });

        const equities = holdings.reduce((sum, holding) => {
            const value = holding.value ? parseFloat(holding.value.toString()) : 0;
            return holding.isinCode.startsWith('INE') ? sum + value : sum;
        }, 0);

        const mutualFunds = holdings.reduce((sum, holding) => {
            const value = holding.value ? parseFloat(holding.value.toString()) : 0;
            return !holding.isinCode.startsWith('INE') ? sum + value : sum;
        }, 0);

        const totalHolding = equities + mutualFunds;
        const portfolioValue = totalHolding;

        const financial = riskReport?.financial ? parseFloat(riskReport.financial.toString()) : 0;
        const margin = riskReport?.margin ? parseFloat(riskReport.margin.toString()) : 0;

        const ledgerBalance = financial;
        const spanMargin = margin;
        const totalBalance = margin + ledgerBalance;
        const finalPortfolioValue = totalBalance + totalHolding;

        const calculatePercentageChange = (newValue: number, oldValue: number): number => {
            if (oldValue === 0 || !isFinite(newValue) || !isFinite(oldValue) || isNaN(newValue) || isNaN(oldValue)) {
                return 0;
            }
            const percentage = ((newValue - oldValue) / oldValue) * 100;
            return isFinite(percentage) ? Number(percentage.toFixed(2)) : 0;
        };

        const portfolioValueChange = existingStats
            ? calculatePercentageChange(finalPortfolioValue, existingStats.portfolioValue)
            : 0;
        const totalHoldingChange = existingStats
            ? calculatePercentageChange(totalHolding, existingStats.totalHolding)
            : 0;
        const equitiesChange = existingStats ? calculatePercentageChange(equities, existingStats.equities) : 0;
        const mutualFundsChange = existingStats ? calculatePercentageChange(mutualFunds, existingStats.mutualFunds) : 0;
        const totalBalanceChange = existingStats
            ? calculatePercentageChange(totalBalance, existingStats.totalBalance)
            : 0;
        const spanMarginChange = existingStats ? calculatePercentageChange(spanMargin, existingStats.spanMargin) : 0;
        const ledgerBalanceChange = existingStats
            ? calculatePercentageChange(ledgerBalance, existingStats.ledgerBalance)
            : 0;

        const stats = existingStats || new ClientDashboardStats();
        stats.clientId = clientId;
        stats.portfolioValue = isFinite(finalPortfolioValue) ? finalPortfolioValue : 0;
        stats.totalHolding = isFinite(totalHolding) ? totalHolding : 0;
        stats.equities = isFinite(equities) ? equities : 0;
        stats.mutualFunds = isFinite(mutualFunds) ? mutualFunds : 0;
        stats.totalBalance = isFinite(totalBalance) ? totalBalance : 0;
        stats.spanMargin = isFinite(spanMargin) ? spanMargin : 0;
        stats.ledgerBalance = isFinite(ledgerBalance) ? ledgerBalance : 0;
        stats.portfolioValueChange = isFinite(portfolioValueChange) ? portfolioValueChange : 0;
        stats.totalHoldingChange = isFinite(totalHoldingChange) ? totalHoldingChange : 0;
        stats.equitiesChange = isFinite(equitiesChange) ? equitiesChange : 0;
        stats.mutualFundsChange = isFinite(mutualFundsChange) ? mutualFundsChange : 0;
        stats.totalBalanceChange = isFinite(totalBalanceChange) ? totalBalanceChange : 0;
        stats.spanMarginChange = isFinite(spanMarginChange) ? spanMarginChange : 0;
        stats.ledgerBalanceChange = isFinite(ledgerBalanceChange) ? ledgerBalanceChange : 0;

        return clientDashboardStatsRepo.save(stats);
    }

    async getClientDashboardStats(clientId: string): Promise<ClientDashboardStats> {
        try {
            const clientDashboardStatsRepo = this.dataSource.getRepository(ClientDashboardStats);
            const stats = await clientDashboardStatsRepo
                .createQueryBuilder('stats')
                .where('stats.clientId = :clientId', { clientId })
                .andWhere(
                    '(stats.clientId, stats.date) IN (' +
                    'SELECT clientId, MAX(date) ' +
                    'FROM client_dashboard_stats ' +
                    'WHERE clientId = :clientId ' +
                    'GROUP BY clientId)',
                    { clientId }
                )
                .getOne();

            if (!stats) {
                this.logger.error(`No dashboard stats found for client ${clientId}`);
                throw new Error(`No dashboard stats found for client ${clientId}`);
            }

            return stats;
        } catch (error) {
            this.logger.error(`Failed to fetch dashboard stats for client ${clientId}: ${error.message}`);
            throw new Error(`Failed to fetch dashboard stats for client ${clientId}: ${error.message}`);
        }
    }

    async checkTodayStats(): Promise<boolean> {
        try {
            const yesterday = new Date();
            // yesterday.setDate(yesterday.getDate() - 1);
            // yesterday.setHours(0, 0, 0, 0); // Strip time

            const clientDashboardStatsRepo = this.dataSource.getRepository(ClientDashboardStats);

            const latestStat = await clientDashboardStatsRepo
                .createQueryBuilder('stats')
                .orderBy('stats.date', 'DESC')
                .limit(1)
                .getOne();

            if (!latestStat) return false;

            const latestDate = new Date(latestStat.date);
            latestDate.setHours(0, 0, 0, 0); // Normalize time for comparison

            return latestDate.getDate() === yesterday.getDate();
        } catch (error) {
            this.logger.error(`Failed to check if latest stats are for yesterday: ${error.message}`);
            throw new Error(`Failed to check if latest stats are for yesterday: ${error.message}`);
        }
    }

    async generateClientDashboardStatsForAll(): Promise<void> {
        try {
            const clientIds = await this.getAllClientIds();
            if (clientIds.length === 0) {
                this.logger.warn('No client IDs found for stats generation');
                return;
            }

            const batches = this.chunkArray(clientIds, this.batchSize);
            await Promise.all(
                batches.map((batch) =>
                    this.limit(() => this.processBatch(batch))
                )
            );
        } catch (error) {
            this.logger.error(`Failed to generate dashboard stats for all clients: ${error.message}`);
            throw new Error(`Failed to generate stats: ${error.message}`);
        }
    }

    private async getAllClientIds(): Promise<string[]> {
        try {
            const clientIds = await this.dataSource
                .getRepository(HoldingsStatement)
                .createQueryBuilder('hs')
                .select('DISTINCT hs.clientId')
                .getRawMany();
            return clientIds.map((row) => row.clientId);
        } catch (error) {
            this.logger.error(`Failed to fetch client IDs: ${error.message}`);
            throw new Error(`Failed to fetch client IDs: ${error.message}`);
        }
    }

    private chunkArray<T>(array: T[], size: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }

    private async processBatch(clientIds: string[]): Promise<void> {
        try {
            const existingStatsMap = await this.getExistingStats(clientIds);
            const aggregatedData = await this.getAggregatedData(clientIds);

            if (aggregatedData.length === 0) {
                this.logger.warn(`No aggregated data found for ${clientIds.length} client IDs`);
                return;
            }

            const statsToSave = aggregatedData.map((data) => {
                const existing = existingStatsMap.get(data.clientId);
                const finalPortfolioValue = data.totalBalance + data.totalHolding;

                const calculatePercentageChange = (newValue: number, oldValue: number): number => {
                    if (!isFinite(newValue) || !isFinite(oldValue) || oldValue === 0) {
                        return 0;
                    }
                    const percentage = ((newValue - oldValue) / oldValue) * 100;
                    const result = isFinite(percentage) ? Number(percentage.toFixed(2)) : 0;
                    
                    return result;
                };

                const result = {
                    clientId: data.clientId,
                    date: new Date(),
                    portfolioValue: isFinite(finalPortfolioValue) ? finalPortfolioValue : 0,
                    totalHolding: isFinite(data.totalHolding) ? data.totalHolding : 0,
                    equities: isFinite(data.equities) ? data.equities : 0,
                    mutualFunds: isFinite(data.mutualFunds) ? data.mutualFunds : 0,
                    totalBalance: isFinite(data.totalBalance) ? data.totalBalance : 0,
                    spanMargin: isFinite(data.spanMargin) ? data.spanMargin : 0,
                    ledgerBalance: isFinite(data.ledgerBalance) ? data.ledgerBalance : 0,
                    portfolioValueChange: existing
                        ? calculatePercentageChange(finalPortfolioValue, existing.portfolioValue)
                        : 0,
                    totalHoldingChange: existing ? calculatePercentageChange(data.totalHolding, existing.totalHolding) : 0,
                    equitiesChange: existing ? calculatePercentageChange(data.equities, existing.equities) : 0,
                    mutualFundsChange: existing ? calculatePercentageChange(data.mutualFunds, existing.mutualFunds) : 0,
                    totalBalanceChange: existing ? calculatePercentageChange(data.totalBalance, existing.totalBalance) : 0,
                    spanMarginChange: existing ? calculatePercentageChange(data.spanMargin, existing.spanMargin) : 0,
                    ledgerBalanceChange: existing ? calculatePercentageChange(data.ledgerBalance, existing.ledgerBalance) : 0,
                    updatedAt: new Date(),
                } as ClientDashboardStats;

                return result;
            });

            if (statsToSave.length === 0) {
                this.logger.warn(`No stats to save for batch of ${clientIds.length} clients`);
                return;
            }

            await this.bulkSaveStats(statsToSave);
        } catch (error) {
            this.logger.error(`Failed to process batch for ${clientIds.length} clients: ${error.message}`);
            throw new Error(`Batch processing failed: ${error.message}`);
        }
    }

    private async getExistingStats(clientIds: string[]): Promise<Map<string, ExistingStats>> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const stats = await this.dataSource
                .getRepository(ClientDashboardStats)
                .createQueryBuilder('stats')
                .where('stats.clientId IN (:...clientIds)', { clientIds })
                .andWhere('stats.date < :today', { today })
                .andWhere(
                    '(stats.clientId, stats.date) IN (' +
                    'SELECT clientId, MAX(date) ' +
                    'FROM client_dashboard_stats ' +
                    'WHERE clientId IN (:...clientIds) AND date < :today ' +
                    'GROUP BY clientId)',
                    { clientIds, today }
                )
                .getMany();

            return new Map<string, ExistingStats>(
                stats.map(stat => [stat.clientId, stat])
            );
        } catch (error) {
            this.logger.error(`Failed to fetch existing stats for ${clientIds.length} clients: ${error.message}`);
            throw new Error(`Failed to fetch existing stats: ${error.message}`);
        }
    }

    private async getAggregatedData(clientIds: string[]): Promise<ClientAggregatedData[]> {
        try {
            const query = this.dataSource
                .createQueryBuilder()
                .select('hs.clientId', 'clientId')
                .addSelect('SUM(CASE WHEN hs.isinCode LIKE \'INE%\' THEN hs.value ELSE 0 END)', 'equities')
                .addSelect('SUM(CASE WHEN hs.isinCode NOT LIKE \'INE%\' THEN hs.value ELSE 0 END)', 'mutualFunds')
                .addSelect('SUM(hs.value)', 'totalHolding')
                .addSelect('COALESCE(rr.financial, 0)', 'ledgerBalance')
                .addSelect('COALESCE(rr.margin, 0)', 'spanMargin')
                .from(HoldingsStatement, 'hs')
                .leftJoin(RiskReport, 'rr', 'rr.clientId = hs.clientId')
                .where('hs.clientId IN (:...clientIds)', { clientIds })
                .groupBy('hs.clientId, rr.financial, rr.margin');

            const results = await query.getRawMany();

            const aggregatedData = results.map((row) => {
                if (!row.clientId) {
                    this.logger.error(`Missing clientId in query result`);
                    throw new Error('Missing clientId in aggregated data');
                }
                return {
                    clientId: row.clientId,
                    equities: Number(parseFloat(row.equities || 0).toFixed(2)),
                    mutualFunds: Number(parseFloat(row.mutualFunds || 0).toFixed(2)),
                    totalHolding: Number(parseFloat(row.totalHolding || 0).toFixed(2)),
                    ledgerBalance: Number(parseFloat(row.ledgerBalance || 0).toFixed(2)),
                    spanMargin: Number(parseFloat(row.spanMargin || 0).toFixed(2)),
                    totalBalance: Number(((parseFloat(row.ledgerBalance || 0) + parseFloat(row.spanMargin || 0)).toFixed(2))),
                };
            });

            return aggregatedData;
        } catch (error) {
            this.logger.error(`Failed to fetch aggregated data for ${clientIds.length} clients: ${error.message}`);
            throw new Error(`Failed to fetch aggregated data: ${error.message}`);
        }
    }

    private async bulkSaveStats(stats: ClientDashboardStats[]): Promise<void> {
        try {
            if (stats.some(s => !s.clientId)) {
                this.logger.error(`Invalid clientId in stats data`);
                throw new Error('Invalid clientId in stats data');
            }

            const cleanedStats = stats.map((stat, index) => {
                const cleanedStat = { ...stat };
                const numericFields = [
                    'portfolioValue',
                    'totalHolding',
                    'equities',
                    'mutualFunds',
                    'totalBalance',
                    'spanMargin',
                    'ledgerBalance',
                ];
                const percentageFields = [
                    'portfolioValueChange',
                    'totalHoldingChange',
                    'equitiesChange',
                    'mutualFundsChange',
                    'totalBalanceChange',
                    'spanMarginChange',
                    'ledgerBalanceChange',
                ];

                numericFields.forEach(field => {
                    if (isNaN(cleanedStat[field]) || !isFinite(cleanedStat[field])) {
                        this.logger.warn(`Invalid value (NaN or Infinity) for ${field} in client ${stat.clientId}, setting to 0`);
                        cleanedStat[field] = 0;
                    }
                });

                percentageFields.forEach(field => {
                    if (isNaN(cleanedStat[field]) || !isFinite(cleanedStat[field])) {
                        this.logger.warn(`Invalid value (NaN or Infinity) for ${field} in client ${stat.clientId}, setting to 0`);
                        cleanedStat[field] = 0;
                    } else if (cleanedStat[field] > this.MAX_PERCENTAGE) {
                        this.logger.warn(
                            `Out-of-range value for ${field} in client ${stat.clientId}: ${cleanedStat[field]}%, setting to ${this.MAX_PERCENTAGE}`
                        );
                        cleanedStat[field] = this.MAX_PERCENTAGE;
                    } else if (cleanedStat[field] < this.MIN_PERCENTAGE) {
                        this.logger.warn(
                            `Out-of-range value for ${field} in client ${stat.clientId}: ${cleanedStat[field]}%, setting to ${this.MIN_PERCENTAGE}`
                        );
                        cleanedStat[field] = this.MIN_PERCENTAGE;
                    }
                });

                return {
                    ...cleanedStat,
                    date: new Date(),
                    updatedAt: new Date(),
                };
            });

            await this.dataSource.transaction(async (transactionalEntityManager) => {
                // Keep stats for 1 month instead of 2 days
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                oneMonthAgo.setHours(0, 0, 0, 0);
                await transactionalEntityManager
                    .createQueryBuilder()
                    .delete()
                    .from(ClientDashboardStats)
                    .where('date < :oneMonthAgo', { oneMonthAgo })
                    .execute();

                // Use TypeORM's save method which handles upserts properly for MySQL
                // This ensures percentage changes are properly stored
                const repository = transactionalEntityManager.getRepository(ClientDashboardStats);
                
                // Log a sample to verify percentage changes are being calculated
                if (cleanedStats.length > 0) {
                    const sample = cleanedStats[0];
                    this.logger.log(`Sample stat for client ${sample.clientId}: portfolioValueChange=${sample.portfolioValueChange}%, totalHoldingChange=${sample.totalHoldingChange}%`);
                }
                
                await repository.save(cleanedStats, { chunk: 1000 });
            });
        } catch (error) {
            this.logger.error(`Failed to save stats for ${stats.length} clients: ${error.message}`);
            throw new Error(`Failed to save stats: ${error.message}`);
        }
    }

    async getDailyAnalysis(
        branchIds: string[],
        date: string,
        period: 'Daily' | 'Monthly' | 'Yearly',
    ): Promise<{ period: string; dailyAnalysis: { date: Date; brokerage: number }[] }> {
        if (!branchIds.length) {
            this.logger.error('No branch IDs provided for daily analysis');
            throw new Error('No branch IDs provided');
        }

        const statsDate = DateUtils.normalizeDate(new Date(date));
        let startDate: Date;

        // Determine start date based on new period definitions
        switch (period) {
            case 'Daily':
                startDate = new Date(statsDate);
                startDate.setUTCDate(startDate.getUTCDate() - 29); // Past 30 days
                break;
            case 'Monthly':
                startDate = new Date(Date.UTC(statsDate.getUTCFullYear(), statsDate.getUTCMonth() - 11, 1)); // 12 months
                break;
            case 'Yearly':
                startDate = new Date(Date.UTC(statsDate.getUTCFullYear() - 3, 0, 1)); // 4 years
                break;
            default:
                throw new Error(`Invalid period: ${period}`);
        }

        const stats = await this.dataSource
            .getRepository(DailyBranchStats)
            .createQueryBuilder('stats')
            .select(['stats.date', 'stats.totalBrokerage'])
            .where('stats.branchId IN (:...branchIds)', { branchIds })
            .andWhere('stats.date BETWEEN :startDate AND :statsDate', { startDate, statsDate })
            .orderBy('stats.date', 'ASC')
            .getMany();

        const statMap = new Map<string, number>();

        for (const stat of stats) {
            const dateObj = new Date(stat.date);
            if (isNaN(dateObj.getTime())) {
                this.logger.warn(`Invalid date for branch stats: ${stat.date}`);
                continue;
            }

            let key: string;

            if (period === 'Daily') {
                key = dateObj.toISOString().split('T')[0]; // 'YYYY-MM-DD'
            } else if (period === 'Monthly') {
                const month = dateObj.getUTCMonth() + 1;
                key = `${dateObj.getUTCFullYear()}-${month.toString().padStart(2, '0')}`; // 'YYYY-MM'
            } else {
                key = `${dateObj.getUTCFullYear()}`; // 'YYYY'
            }

            const prev = statMap.get(key) || 0;
            statMap.set(key, prev + parseRevenueValue(stat.totalBrokerage));
        }

        // Build output date buckets
        let dateBuckets: string[] = [];

        if (period === 'Daily') {
            dateBuckets = DateUtils.getDateRange(startDate, statsDate); // 'YYYY-MM-DD'
        } else if (period === 'Monthly') {
            dateBuckets = DateUtils.getMonthRange(startDate, statsDate); // 'YYYY-MM'
        } else {
            dateBuckets = DateUtils.getYearRange(startDate, statsDate); // 'YYYY'
        }

        const dailyAnalysis = dateBuckets.map(bucket => ({
            date: period === 'Daily' ? new Date(bucket) : new Date(bucket + '-01'), // Use 1st of month/year as representative
            brokerage: statMap.get(bucket) || 0,
        }));

        return {
            period,
            dailyAnalysis,
        };
    }

    async generateDailyDealerStatsForDate(statsDate: Date) {
        const statsDateIst = moment(statsDate).tz('Asia/Kolkata');
        const statsDateOnly = statsDateIst.startOf('day');
        const startOfDay = statsDateOnly.toDate();
        const endOfDay = statsDateOnly.clone().endOf('day').toDate();
        const startOfMonth = statsDateOnly.clone().startOf('month').toDate();

        // Fetch dealers in batches
        const BATCH_SIZE = 100;
        const dealerRepository = this.dataSource.getRepository(Dealer);
        const totalDealers = await dealerRepository.count({
            where: { employee: { status: EmployeeStatus.ACTIVE } }
        });

        // Get trading days info (optimized)
        const { monthKey, totalTradingDays, tradingDaysUsed } = await this.getTradingDaysInfo(statsDateOnly, startOfMonth);
        const remainingDays = totalTradingDays - tradingDaysUsed;

        for (let offset = 0; offset < totalDealers; offset += BATCH_SIZE) {
            const dealers = await dealerRepository.find({
                where: { employee: { status: EmployeeStatus.ACTIVE } },
                relations: ['employee'],
                skip: offset,
                take: BATCH_SIZE
            });

            const statsBatch = [];

            for (const dealer of dealers) {
                try {
                    const stats = await this.processDealerStats(
                        dealer,
                        startOfDay,
                        endOfDay,
                        startOfMonth,
                        statsDateOnly.toDate(),
                        totalTradingDays,
                        tradingDaysUsed,
                        remainingDays,
                        monthKey
                    );
                    statsBatch.push(stats);
                } catch (error) {
                    this.logger.error(`Error processing dealer ${dealer.employee.id}: ${error.message}`);
                }
            }

            if (statsBatch.length > 0) {
                await this.dataSource.getRepository(DailyDealerStats).save(statsBatch);
                this.logger.log(`Saved batch ${offset / BATCH_SIZE + 1}/${Math.ceil(totalDealers / BATCH_SIZE)}`);
            }
        }
    }

    private async processDealerStats(
        dealer: Dealer,
        startOfDay: Date,
        endOfDay: Date,
        startOfMonth: Date,
        statsDate: Date,
        totalTradingDays: number,
        tradingDaysUsed: number,
        remainingDays: number,
        monthKey: string
    ) {
        // Get client IDs through direct query (more efficient)
        const clientIds = await this.getDealerClientIds(dealer.employee.id);

        if (clientIds.length === 0) {
            this.logger.debug(`No clients found for dealer ${dealer.employee.id}`);
            return this.createEmptyStats(dealer, statsDate);
        }

        // Aggregate metrics through optimized queries
        const [dailyMetrics, monthlyMetrics] = await Promise.all([
            this.getDailyMetrics(clientIds, startOfDay, endOfDay),
            this.getMonthlyMetrics(clientIds, startOfMonth, endOfDay)
        ]);

        // Calculate derived metrics
        const monthlyAvgBrokerage = tradingDaysUsed > 0
            ? monthlyMetrics.totalBrokerage / tradingDaysUsed
            : 0;

        const stats = new DailyDealerStats();
        stats.employeeId = dealer.employee.id;
        stats.date = statsDate;
        stats.totalBrokerage = dailyMetrics.totalBrokerage;
        stats.onlineBrokerage = 0; // Implement separately
        stats.projectedBrokerage = monthlyAvgBrokerage * remainingDays;
        stats.monthlyBrokerage = monthlyMetrics.totalBrokerage;
        stats.monthlyAvgBrokerage = monthlyAvgBrokerage;
        stats.totalClients = clientIds.length;
        stats.monthlyTradedClients = monthlyMetrics.tradedClients;
        stats.tradedClients = dailyMetrics.tradedClients;
        stats.addedClients = 0; // Implement client activation logic
        stats.totalFranchisees = 0;
        stats.tradedFranchisees = 0;
        stats.addedFranchisees = 0;
        stats.totalTradingDays = totalTradingDays;
        stats.remainingDays = remainingDays;
        stats.avgRevenue = monthlyMetrics.tradedClients > 0
            ? monthlyMetrics.totalBrokerage / monthlyMetrics.tradedClients
            : 0;
        stats.segmentRevenue = dailyMetrics.segmentRevenue;
        stats.modelRevenue = [];
        stats.top10Clients = dailyMetrics.topClients;
        stats.totalTarget = dealer.target;

        return stats;
    }

    private async getDealerClientIds(employeeId: string): Promise<string[]> {
        const result = await this.dataSource.getRepository(Client)
            .createQueryBuilder('client')
            .select('client.id', 'id')
            .where(`
            client.equity_dealer = :id OR 
            client.commodity_dealer1 = :id OR 
            client.commodity_dealer2 = :id
        `, { id: employeeId })
            .getRawMany();

        return result.map(r => r.id);
    }

    private async getDailyMetrics(clientIds: string[], start: Date, end: Date) {
        const revenueQuery = this.dataSource.getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select([
                'SUM(sr.netBrokerage) AS totalBrokerage',
                'COUNT(DISTINCT sr.clientId) AS tradedClients'
            ])
            .where('sr.clientId IN (:...clientIds)', { clientIds })
            .andWhere('sr.tradeDate BETWEEN :start AND :end', { start, end });

        const topClientsQuery = this.dataSource.getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select([
                'sr.clientId AS clientId',
                'SUM(sr.netBrokerage) AS value'
            ])
            .where('sr.clientId IN (:...clientIds)', { clientIds })
            .andWhere('sr.tradeDate BETWEEN :start AND :end', { start, end })
            .groupBy('sr.clientId')
            .orderBy('value', 'DESC')
            .limit(10)
            .getRawMany();

        const segmentRevenueQuery = this.dataSource.getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select([
                'sr.cocd AS segment',
                'SUM(sr.netBrokerage) AS value'
            ])
            .where('sr.clientId IN (:...clientIds)', { clientIds })
            .andWhere('sr.tradeDate BETWEEN :start AND :end', { start, end })
            .groupBy('sr.cocd')
            .getRawMany();

        const [revenueResult, topClients, segmentRevenue] = await Promise.all([
            revenueQuery.getRawOne(),
            topClientsQuery,
            segmentRevenueQuery
        ]);

        return {
            totalBrokerage: parseRevenueValue(revenueResult?.totalBrokerage),
            tradedClients: parseInt(revenueResult?.tradedClients || '0', 10),
            topClients: topClients.map(c => ({
                clientId: c.clientId,
                value: parseRevenueValue(c.value)
            })),
            segmentRevenue: segmentRevenue.map(s => ({
                segment: mapCocdToSegment(s.segment),
                value: parseRevenueValue(s.value)
            }))
        };
    }

    private async getMonthlyMetrics(clientIds: string[], start: Date, end: Date) {
        const result = await this.dataSource.getRepository(SegmentRevenue)
            .createQueryBuilder('sr')
            .select([
                'SUM(sr.netBrokerage) AS totalBrokerage',
                'COUNT(DISTINCT sr.clientId) AS tradedClients'
            ])
            .where('sr.clientId IN (:...clientIds)', { clientIds })
            .andWhere('sr.tradeDate BETWEEN :start AND :end', { start, end })
            .getRawOne();

        return {
            totalBrokerage: parseRevenueValue(result?.totalBrokerage),
            tradedClients: parseInt(result?.tradedClients || '0', 10)
        };
    }

    private createEmptyStats(dealer: Dealer, date: Date): DailyDealerStats {
        const stats = new DailyDealerStats();
        stats.employeeId = dealer.employee.id;
        stats.date = date;
        // Set all numeric values to 0
        Object.keys(stats).forEach(key => {
            if (typeof stats[key] === 'number') stats[key] = 0;
        });
        // Initialize empty arrays
        stats.segmentRevenue = [];
        stats.modelRevenue = [];
        stats.top10Clients = [];
        stats.totalTarget = dealer.target;
        return stats;
    }

    private async getTradingDaysInfo(statsDateOnly: moment.Moment, startOfMonth: Date): Promise<{ monthKey: string, totalTradingDays: number, tradingDaysUsed: number }> {
        const monthKey = DateUtils.generateMonthKey(statsDateOnly.toDate());

        const [tradingDays, tradingDaysUsedCount] = await Promise.all([
            this.dataSource.getRepository(BranchTarget).findOne({
                where: { month: monthKey },
                select: ['noDays'],
            }),
            this.dataSource.getRepository(SegmentRevenue)
                .createQueryBuilder('sr')
                .select('COUNT(DISTINCT DATE(sr.tradeDate))', 'count')
                .where('sr.tradeDate >= :start AND sr.tradeDate < :end', {
                    start: startOfMonth,
                    end: statsDateOnly.toDate(),
                })
                .getRawOne()
        ]);

        const totalTradingDays = Number(tradingDays?.noDays) || 21;
        const tradingDaysUsed = Number(tradingDaysUsedCount?.count || '0') + 1;

        return { monthKey, totalTradingDays, tradingDaysUsed };
    }
}