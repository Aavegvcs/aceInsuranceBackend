import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, EntityManager, Equal, In, IsNull, Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { BranchRevenue } from './entities/branch-revenue.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchModels, Designation, generateUUID, mapCocdToSegment, roleIds, Roles } from 'src/utils/app.utils';
import { orderByKey, orderByValue } from 'src/utils/app.utils';
import { State } from '@modules/states/entities/state.entity';
import { Employee, EmployeeStatus } from '@modules/employee/entities/employee.entity';
import { BulkInsertResult } from 'src/config/report.config';
import { DateUtils } from 'src/utils/date.utils';
import { DailyBranchStats } from '@modules/dashboard/entities/daily-branch-stats.entity';
import { BranchTarget } from './entities/branch-target.entity';
import { SegmentRevenue } from '@modules/report/entities/segment-revenue.entity';
import { CreateEmployeeDto } from '@modules/employee/dto/create-employee.dto';
import { EmployeeService } from '@modules/employee/employee.service';
import { Dealer, DealerType } from '@modules/employee/entities/dealer.entity';
import { BranchClientStats } from './entities/branch-client-stats.entity';
import { Client } from '@modules/client/entities/client.entity';
import { parseRevenueValue } from 'src/utils/string.utils';
import * as moment from 'moment';
import 'moment-timezone';
import { ClientSummary } from '@modules/client/entities/client-summary.entity';
import { AnnualBranchStats } from './entities/annual-branch-stats.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { chunk } from 'lodash';
import pLimit from 'p-limit';
import { start } from 'repl';

interface CreateBranchDtoWithRowNumber extends CreateBranchDto {
    originalRowNumber: number;
}

export interface IChurn {
    particulars: string;
    activeClientsAvg: number;
    target: number;
    achieved: number;
}

@Injectable()
export class BranchService {
    private readonly logger = new Logger(BranchService.name);

    constructor(
        @InjectRepository(Branch)
        private readonly branchRepository: Repository<Branch>,
        @InjectRepository(BranchRevenue)
        private readonly branchRevenueRepository: Repository<BranchRevenue>,
        @InjectRepository(Employee)
        private readonly employeeRepository: Repository<Employee>,
        @Inject(forwardRef(() => EmployeeService))
        private readonly employeeService: EmployeeService,
        private readonly dataSource: DataSource,
    ) { }

    async create(createBranchDto: CreateBranchDto): Promise<any> {
        return this.branchRepository.manager
            .transaction(async (transactionalEntityManager) => {
                if (!createBranchDto.id || typeof createBranchDto.id !== 'string') {
                    throw new BadRequestException('Branch id is required and must be a valid string');
                }

                const existingBranch = await transactionalEntityManager.findOne(Branch, {
                    where: { id: Equal(createBranchDto.id) },
                });
                if (existingBranch) {
                    throw new BadRequestException(`Branch with id ${createBranchDto.id} already exists`);
                }

                const branchId = createBranchDto.id || generateUUID('BR');

                let state: State | null = null;
                if (createBranchDto.stateId) {
                    state = await transactionalEntityManager.findOne(State, {
                        where: { id: createBranchDto.stateId },
                    });
                    if (!state) {
                        throw new NotFoundException(`State with ID ${createBranchDto.stateId} not found`);
                    }
                }

                let regionalManager: Employee | null = null;
                if (createBranchDto.regionalManagerId) {
                    regionalManager = await transactionalEntityManager.findOne(Employee, {
                        where: { id: createBranchDto.regionalManagerId },
                    });
                    if (!regionalManager) {
                        const employeeDto: CreateEmployeeDto = {
                            employeeId: createBranchDto.regionalManagerId,
                            branchId: branchId,
                            companyId: createBranchDto.companyId,
                            designation: Designation.regionalManager,
                            status: EmployeeStatus.ACTIVE,
                            firstName: createBranchDto.regionalManagerId,
                            email: `dummy.rm.${createBranchDto.regionalManagerId}@company.com`,
                            roleId: roleIds.admin,
                        };
                        const result = await this.employeeService.bulkCreate([employeeDto]);
                        if (result.data.created === 0) {
                            throw new BadRequestException(
                                `Failed to create regional manager: ${result.data.errors[0]?.error}`,
                            );
                        }
                        regionalManager = result.data.createdEntities[0];
                    }
                }

                let controlBranch: Branch | null = null;
                const controlBranchId = createBranchDto.controlBranchId?.toUpperCase();
                const isSelfControlBranch = controlBranchId === branchId.toUpperCase();

                if (controlBranchId && !isSelfControlBranch) {
                    controlBranch = await transactionalEntityManager.findOne(Branch, {
                        where: { id: controlBranchId },
                    });
                    if (!controlBranch) {
                        throw new NotFoundException(`Control Branch with ID ${controlBranchId} not found`);
                    }
                }

                const newBranch = transactionalEntityManager.create(Branch, {
                    id: branchId,
                    name: createBranchDto.name,
                    model: createBranchDto.model,
                    state: state || undefined,
                    city: createBranchDto.city,
                    pincode: createBranchDto.pincode,
                    address: createBranchDto.address,
                    active: createBranchDto.active ?? true,
                    segments: createBranchDto.segments || [],
                    email: createBranchDto.email,
                    phone: createBranchDto.phone,
                    contactPerson: createBranchDto.contactPerson,
                    panNumber: createBranchDto.panNumber,
                    activationDate: createBranchDto.activationDate,
                    regionalManager: regionalManager || undefined,
                    controlBranch: controlBranch || undefined,
                    mappingStatus: createBranchDto.mappingStatus ?? false,
                    sharing: createBranchDto.sharing,
                    terminals: createBranchDto.terminals || [],
                });

                let savedBranch = await transactionalEntityManager.save(Branch, newBranch);

                // If self-control, assign after save to avoid FK violation
                if (isSelfControlBranch) {
                    savedBranch.controlBranch = savedBranch;
                    savedBranch = await transactionalEntityManager.save(Branch, savedBranch);
                }

                // Return clean JSON without circular refs
                const response = {
                    ...savedBranch,
                    controlBranch: isSelfControlBranch
                        ? savedBranch.id
                        : savedBranch.controlBranch?.id ?? null,
                    regionalManager: savedBranch.regionalManager?.id ?? null,
                    state: savedBranch.state ? {
                        id: savedBranch.state.id,
                        name: savedBranch.state.name
                    } : null,
                };

                return response;
            })
            .catch((error) => {
                this.logger.error(`Failed to create branch: ${error.message}`);
                if (error instanceof BadRequestException || error instanceof NotFoundException) {
                    throw error;
                }
                throw new BadRequestException(`Failed to create branch: ${error.message}`);
            });
    }

    async bulkCreate(dtos: CreateBranchDto[]): Promise<BulkInsertResult<Branch>> {
        const result: BulkInsertResult<Branch> = {
            statusCode: 201,
            message: 'success',
            data: {
                total: dtos.length,
                created: 0,
                failed: 0,
                errors: [],
                createdEntities: [],
            },
        };

        if (dtos.length === 0) {
            this.logger.warn('No branch DTOs provided for bulk creation');
            return {
                statusCode: 400,
                message: 'No branches provided',
                data: { total: 0, created: 0, failed: 0, errors: [], createdEntities: [] },
            };
        }

        const dtosWithRowNumber: CreateBranchDtoWithRowNumber[] = dtos.map((dto, index) => ({
            ...dto,
            originalRowNumber: index + 2,
        }));

        const graph = new Map<string, string[]>();
        const branchMap = new Map<string, CreateBranchDtoWithRowNumber>();
        const controlBranchIds: Set<string> = new Set();

        dtosWithRowNumber.forEach((dto) => {
            branchMap.set(dto.id, dto);
            if (dto.controlBranchId) {
                controlBranchIds.add(dto.controlBranchId);
                if (!graph.has(dto.controlBranchId)) {
                    graph.set(dto.controlBranchId, []);
                }
                graph.get(dto.controlBranchId)!.push(dto.id);
            }
        });

        const controlBranches = await this.branchRepository.find({
            where: { id: In(Array.from(controlBranchIds)) },
        });
        const controlBranchMap = new Map(controlBranches.map((branch) => [branch.id, branch]));

        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const cycles = new Set<string>();

        const detectCycles = (node: string) => {
            visited.add(node);
            recursionStack.add(node);
            const neighbors = graph.get(node) || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    detectCycles(neighbor);
                } else if (recursionStack.has(neighbor)) {
                    cycles.add(neighbor);
                }
            }
            recursionStack.delete(node);
        };

        dtosWithRowNumber.forEach((dto) => {
            if (!visited.has(dto.id)) {
                detectCycles(dto.id);
            }
        });

        const dtosToInsert = dtosWithRowNumber.map((dto) => {
            if (cycles.has(dto.id) && dto.controlBranchId) {
                return { ...dto, controlBranchId: null };
            }
            return dto;
        });

        const sortedDtos: CreateBranchDtoWithRowNumber[] = [];
        const tempVisited = new Set<string>();

        const topologicalSort = (node: string) => {
            if (tempVisited.has(node)) return;
            tempVisited.add(node);
            const neighbors = graph.get(node) || [];
            for (const neighbor of neighbors) {
                topologicalSort(neighbor);
            }
            const dto = dtosToInsert.find((d) => d.id === node);
            if (dto) sortedDtos.push(dto);
        };

        dtosToInsert.forEach((dto) => {
            if (!tempVisited.has(dto.id)) {
                topologicalSort(dto.id);
            }
        });

        const branchesToCreate = sortedDtos
            .map((dto) => {
                let controlBranch: Branch | null = null;
                if (dto.controlBranchId && !cycles.has(dto.id)) {
                    controlBranch = controlBranchMap.get(dto.controlBranchId.toUpperCase());
                    if (!controlBranch) {
                        result.data.errors.push({
                            row: dto.originalRowNumber,
                            entityName: 'Branch',
                            error: `Control branch with ID ${dto.controlBranchId} not found`,
                        });
                        result.data.failed++;
                        return null;
                    }
                }

                return this.branchRepository.create({
                    ...dto,
                    state: dto.stateId ? { id: dto.stateId } : null,
                    regionalManager: null,
                    controlBranch: controlBranch,
                });
            })
            .filter((branch) => branch !== null) as Branch[];

        let createdBranches: Branch[] = [];
        try {
            createdBranches = await this.branchRepository.save(branchesToCreate);
        } catch (error) {
            this.logger.error(`Failed to batch insert branches: ${error.message}`);
            result.data.errors.push({
                row: 1,
                entityName: 'Branch',
                error: `Failed to batch insert branches: ${error.message}`,
            });
            result.data.failed += branchesToCreate.length;
            return result;
        }

        const regionalManagerIds = new Set<string>();
        sortedDtos.forEach((dto) => {
            if (dto.regionalManagerId) regionalManagerIds.add(dto.regionalManagerId);
        });

        const existingEmployees = await this.employeeRepository.find({
            where: { id: In(Array.from(regionalManagerIds)) },
        });
        const existingRmIds = new Set(existingEmployees.map((emp) => emp.id));
        const missingRmIds = Array.from(regionalManagerIds).filter((id) => !existingRmIds.has(id));

        const rmToBranchMap = new Map<string, Branch>();
        for (const dto of sortedDtos) {
            if (dto.regionalManagerId && missingRmIds.includes(dto.regionalManagerId)) {
                if (!rmToBranchMap.has(dto.regionalManagerId)) {
                    const branch = createdBranches.find((b) => b.id === dto.id);
                    if (branch) rmToBranchMap.set(dto.regionalManagerId, branch);
                }
            }
        }

        const dummyEmployeeDtos: CreateEmployeeDto[] = Array.from(rmToBranchMap).map(([rmId, branch]) => ({
            employeeId: rmId,
            branchId: branch.id,
            companyId: sortedDtos.find((dto) => dto.regionalManagerId === rmId)?.companyId || 1,
            designation: Designation.regionalManager,
            status: EmployeeStatus.ACTIVE,
            firstName: rmId,
            email: `dummy.rm.${rmId}@company.com`,
            roleId: roleIds.admin,
            salary: 0,
            probation: false,
            password: '12345678',
        }));

        if (dummyEmployeeDtos.length > 0) {
            const employeeResult = await this.employeeService.bulkCreate(dummyEmployeeDtos);
            if (employeeResult.data.created !== dummyEmployeeDtos.length) {
                employeeResult.data.errors.forEach((err) => {
                    result.data.errors.push({
                        row: err.row,
                        entityName: 'Employee',
                        error: `Failed to create regional manager: ${err.error}`,
                    });
                    result.data.failed++;
                });
            }
        }

        const branchesToUpdate = [];
        for (const dto of sortedDtos) {
            if (dto.regionalManagerId) {
                const branch = createdBranches.find((b) => b.id === dto.id);
                if (branch) {
                    const employee = await this.employeeRepository.findOne({ where: { id: dto.regionalManagerId } });
                    if (employee) {
                        branch.regionalManager = employee;
                        branchesToUpdate.push(branch);
                    } else {
                        result.data.errors.push({
                            row: dto.originalRowNumber,
                            entityName: 'Branch',
                            error: `Regional manager with ID ${dto.regionalManagerId} not found after creation`,
                        });
                        result.data.failed++;
                    }
                }
            }
        }

        if (branchesToUpdate.length > 0) {
            await this.branchRepository.save(branchesToUpdate);
        }

        const updatedControlBranches = [];
        for (const dto of dtosWithRowNumber) {
            if (cycles.has(dto.id) && dto.controlBranchId) {
                const branch = createdBranches.find((b) => b.id === dto.id);
                if (branch) {
                    const controlBranch =
                        controlBranchMap.get(dto.controlBranchId) ||
                        createdBranches.find((b) => b.id === dto.controlBranchId);
                    if (controlBranch) {
                        branch.controlBranch = controlBranch;
                        updatedControlBranches.push(branch);
                    } else {
                        result.data.errors.push({
                            row: dto.originalRowNumber,
                            entityName: 'Branch',
                            error: `Control branch with ID ${dto.controlBranchId} not found for cycle restoration`,
                        });
                        result.data.failed++;
                    }
                }
            }
        }

        if (updatedControlBranches.length > 0) {
            await this.branchRepository.save(updatedControlBranches);
        }

        result.data.created = createdBranches.length - result.data.failed;
        result.data.createdEntities = createdBranches;
        if (result.data.failed > 0) {
            result.statusCode = 400;
            result.message = `Success: ${result.data.created} records inserted out of ${result.data.total}, with ${result.data.failed} errors`;
        } else {
            result.message = `Success: ${result.data.created} records inserted out of ${result.data.total}`;
        }

        return result;
    }

    async findAll(req: any): Promise<any> {
        Logger.log('QUERY_String', req?.QUERY_STRING);
        // Single query for data and counts
        const branches = await this.branchRepository
            .createQueryBuilder('branch')
            .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
            .leftJoinAndSelect('branch.regionalManager', 'regionalManager')
            .where('branch.deletedAt IS NULL')
            // .andWhere('branch.model = :model', { model: BranchModels.BRANCH })
            .andWhere(req?.QUERY_STRING?.where || '1=1')
            .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'branch' }), orderByValue({ req }))
            .offset(req?.QUERY_STRING?.skip || 0)
            .limit(req?.QUERY_STRING?.limit || 10)
            .getMany();

        // Transform results
        const items = branches.map((branch: any) => ({
            id: branch.id,
            name: branch.name,
            city: branch.city,
            email: branch.email,
            phone: branch.phone,
            model: branch.model,
            controlBranch: branch.controlBranch ? { id: branch.controlBranch.id, name: branch.controlBranch.name } : null,
            regionalManager: branch.regionalManager ? { id: branch.regionalManager.id, name: branch.regionalManager.name } : null,
            active: branch.active,
            createdAt: branch.createdAt,
            updatedAt: branch.updatedAt,
            deletedAt: branch.deletedAt,
        }));

        // Create query builder for additional queries
        const qb = this.branchRepository
            .createQueryBuilder('branch')
            // .where('branch.model = :model', { model: BranchModels.BRANCH })
            .andWhere('branch.deletedAt IS NULL')
            .andWhere(req.where || '1=1'); // Safe default for where clause

        return { qb, items };
    }

    async findById(id: string, manager?: EntityManager): Promise<Branch> {
        const repo = manager ? manager.getRepository(Branch) : this.branchRepository;
        const branch = await repo.findOne({
            where: { id },
            relations: {
                controlBranch: true,
                regionalManager: true,
                state: true,
            }
        });
        if (!branch) throw new Error(`Branch with ID ${id} not found`);
        return branch;
    }

    async update(id: string, updateBranchDto: UpdateBranchDto): Promise<Branch> {
        return this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
            const branch = await this.findById(id, transactionalEntityManager);

            Object.assign(branch, {
                ...updateBranchDto,
                activationDate: updateBranchDto.activationDate,
                state: updateBranchDto.stateId ? { id: updateBranchDto.stateId } : branch.state,
                regionalManager: updateBranchDto.regionalManagerId
                    ? { id: updateBranchDto.regionalManagerId }
                    : branch.regionalManager,
                controlBranch: updateBranchDto.controlBranchId
                    ? { id: updateBranchDto.controlBranchId }
                    : branch.controlBranch,
            });

            return await transactionalEntityManager.save(Branch, branch);
        });
    }

    async toggleStatus(id: string): Promise<Branch> {
        const branch = await this.branchRepository.findOne({ where: { id } });

        if (!branch) {
            throw new Error(`Branch with id ${id} not found`);
        }
        Logger.log('status', branch.isActive);
        branch.isActive = !branch.isActive;
        Logger.log('status 2', branch.isActive);

        return this.branchRepository.save(branch);
    }

    async remove(id: string): Promise<void> {
        await this.branchRepository.manager.transaction(async (transactionalEntityManager) => {
            const branch = await this.findById(id, transactionalEntityManager);

            // await transactionalEntityManager.softDelete(BranchRevenue, { branchId: id });
            await transactionalEntityManager.softDelete(Branch, id);
        });
    }

    async getFranchiseeMis(req: any): Promise<any> {
        const { branchId, startDate, endDate } = req.body;
        try {
            const query = this.branchRepository
                .createQueryBuilder('branch')
                .leftJoinAndSelect('branch.clients', 'clients')
                .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
                .leftJoin('branch_revenue', 'revenue', 'revenue.branchId = branch.id')
                .select([
                    'branch.id AS id',
                    'branch.name AS name',
                    'SUM(revenue.noOfTraded) AS noOfTraded',
                    'SUM(revenue.equityBrokerage) AS equityBrokerage',
                    'SUM(revenue.commodityBrokerage) AS commodityBrokerage',
                    'SUM(revenue.kycEquity) AS kycEquity',
                    'SUM(revenue.kycCommodity) AS kycCommodity',
                    'branch.active AS isActive',
                    'COUNT(DISTINCT clients.id) AS clientCount',
                ])
                .where('controlBranch.id = :branchId', { branchId })
                .groupBy('branch.id');

            if (startDate && endDate) {
                query.andWhere('revenue.createdAt BETWEEN :startDate AND :endDate', {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                });
            }
            query.andWhere(req?.QUERY_STRING?.where || '1=1')
                .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'branch' }), orderByValue({ req }))
                .offset(req?.QUERY_STRING?.skip || 0)
                .limit(req?.QUERY_STRING?.limit || 10)

            const franchiseeData = await query.getRawMany();
            const data = franchiseeData.map((fd) => ({
                id: fd.id,
                name: fd.name,
                noOfTraded: Number(fd.noOfTraded) || 0,
                equityBrokerage: Number(fd.equityBrokerage) || 0,
                commodityBrokerage: Number(fd.commodityBrokerage) || 0,
                kycEquity: Number(fd.kycEquity) || 0,
                kycCommodity: Number(fd.kycCommodity) || 0,
                isActive: fd.isActive ? 'Y' : 'N',
                clientCount: Number(fd.clientCount) || 0,
                totalBrokerage: (Number(fd.equityBrokerage) || 0) + (Number(fd.commodityBrokerage) || 0),
            }));

            const qb = this.branchRepository
                .createQueryBuilder('branch')
                .leftJoin('branch.controlBranch', 'controlBranch')
                .where('controlBranch.id = :branchId', { branchId })
                .andWhere('revenue.createdAt BETWEEN :startDate AND :endDate', {
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                }).andWhere(req?.QUERY_STRING?.where || '1=1').select([])
                ;

            return {
                items: data,
                qb,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch franchisee data for branchId ${branchId}: ${error.message}`);
            throw new InternalServerErrorException('Failed to retrieve data');
        }
    }

    async getFranchisees(req: any): Promise<any> {
        const { branchId } = req.body;

        try {
            if (!branchId || typeof branchId !== 'string' || branchId.trim() === '') {
                throw new BadRequestException('branchId is required');
            }

            const franchiseeData = await this.branchRepository
                .createQueryBuilder('branch')
                .leftJoin('branch.rm', 'rm')
                .leftJoin('rm.user', 'rmUser', 'rmUser.deletedAt IS NULL')
                .leftJoin(
                    (subQuery) => {
                        return subQuery
                            .select([
                                'bd.branchId AS branchId',
                                `CONCAT_WS(' ', dealerUser.firstName, dealerUser.lastName) AS dealerName`,
                                'ROW_NUMBER() OVER (PARTITION BY bd.branchId ORDER BY dealer.dealerId) AS dealerRank',
                            ])
                            .from('branch_dealer', 'bd')
                            .leftJoin('dealer', 'dealer', 'dealer.dealerId = bd.dealerId AND dealer.deletedAt IS NULL')
                            .leftJoin('employee', 'dealerEmp', 'dealerEmp.id = dealer.employeeId AND dealerEmp.deletedAt IS NULL')
                            .leftJoin('user', 'dealerUser', 'dealerUser.id = dealerEmp.userId AND dealerUser.deletedAt IS NULL')
                            .where('bd.branchId IN (SELECT id FROM branch WHERE control_branch_id = :branchId AND model = :model AND deletedAt IS NULL)')
                            .setParameters({ branchId, model: BranchModels.FRANCHISE });
                    },
                    'rankedDealers',
                    'rankedDealers.branchId = branch.id',
                )
                .select([
                    'branch.id AS id',
                    'branch.name AS name',
                    'branch.mappingStatus AS mappingStatus',
                    `CONCAT_WS(' ', rmUser.firstName, rmUser.lastName) AS rmName`,
                    `MAX(CASE WHEN rankedDealers.dealerRank = 1 THEN rankedDealers.dealerName ELSE NULL END) AS equityDealerName`,
                    `MAX(CASE WHEN rankedDealers.dealerRank = 2 THEN rankedDealers.dealerName ELSE NULL END) AS commodityDealer1Name`,
                    `MAX(CASE WHEN rankedDealers.dealerRank = 3 THEN rankedDealers.dealerName ELSE NULL END) AS commodityDealer2Name`,
                ])
                .where('branch.control_branch_id = :branchId AND branch.model = :model', {
                    branchId,
                    model: BranchModels.FRANCHISE,
                })
                .andWhere('branch.deletedAt IS NULL')
                .groupBy('branch.id, branch.name, branch.mappingStatus, rmUser.firstName, rmUser.lastName')
                .andWhere(req?.QUERY_STRING?.where || '1=1')
                .orderBy(orderByKey({ key: req?.QUERY_STRING?.orderBy?.key, repoAlias: 'branch' }), orderByValue({ req }))
                .offset(req?.QUERY_STRING?.skip || 0)
                .limit(req?.QUERY_STRING?.limit || 10)
                .getRawMany();

            const items = franchiseeData.map((fd) => ({
                id: fd.id,
                name: fd.name,
                mappingStatus: fd.mappingStatus ? 'Y' : null,
                rm: fd.rmName || null,
                equityDealer: fd.equityDealerName || null,
                commodityDealer1: fd.commodityDealer1Name || null,
                commodityDealer2: fd.commodityDealer2Name || null,
            }));

            const qb = this.branchRepository
                .createQueryBuilder('branch')
                .where('branch.control_branch_id = :branchId AND branch.model = :model', {
                    branchId,
                    model: BranchModels.FRANCHISE,
                })
                .andWhere('branch.deletedAt IS NULL')
                .andWhere(req?.QUERY_STRING?.where || '1=1')
                .select([]);

            return {
                items,
                qb,
            };
        } catch (error) {
            this.logger.error(`Failed to fetch franchisee mapping for branchId ${branchId}: ${error.message}`);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve mapping data');
        }
    }

    async updateFranchiseeMapping(req: any): Promise<any> {
        const { id: branchId, rm, equityDealer, commodityDealer1, commodityDealer2 } = req.body;
        const dealerIds = [equityDealer, commodityDealer1, commodityDealer2].filter((id): id is string => !!id);

        try {
            if (!branchId || typeof branchId !== 'string' || branchId.trim() === '') {
                throw new BadRequestException('Valid Branch ID is required');
            }

            return this.branchRepository.manager.transaction(async (transactionalEntityManager: EntityManager) => {
                const branch = await transactionalEntityManager.findOne(Branch, {
                    where: { id: branchId },
                    relations: ['dealers', 'rm'],
                });

                if (!branch) {
                    throw new NotFoundException(`Branch with ID ${branchId} not found`);
                }

                let rmEmployee = null;
                if (rm && typeof rm === 'string' && rm.trim() !== '') {
                    rmEmployee = await transactionalEntityManager.findOne(Employee, {
                        where: { id: rm, deletedAt: null },
                    });
                    if (!rmEmployee) {
                        this.logger.warn(`RM Employee with ID ${rm} not found for branch ${branchId}`);
                    }
                }

                const validDealerIds = dealerIds.filter((id: any) => typeof id === 'string' && id.trim() !== '');
                if (validDealerIds.length === 0 && dealerIds.length > 0) {
                    throw new BadRequestException('All provided dealer IDs are invalid');
                }

                const dealers = validDealerIds.length
                    ? await transactionalEntityManager.find(Dealer, {
                        where: { dealerId: In(validDealerIds), deletedAt: null },
                    })
                    : [];
                const foundDealerIds = new Set(dealers.map((row) => row.dealerId));

                for (const id of validDealerIds) {
                    if (!foundDealerIds.has(id)) {
                        this.logger.warn(`Dealer with ID ${id} not found for branch ${branchId}`);
                    }
                }

                branch.rm = rmEmployee;
                branch.dealers = dealers;
                branch.mappingStatus = !!rmEmployee || dealers.length > 0;
                await transactionalEntityManager.save(Branch, branch);

                return { success: true, message: 'Branch RM and dealer mapping updated successfully' };
            });
        } catch (error) {
            this.logger.error(`Failed to update branch mapping for branchId ${branchId}: ${error.message}`);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to update branch RM and dealer mapping');
        }
    }

    async getFranchiseeMapping(req: any): Promise<any> {
        const { id: branchId } = req.body;

        try {
            if (!branchId || typeof branchId !== 'string' || branchId.trim() === '') {
                throw new BadRequestException('Valid Branch ID is required');
            }

            const branch = await this.branchRepository.findOne({
                where: { id: branchId, deletedAt: null },
                relations: ['dealers', 'rm', 'rm.user'],
            });

            if (!branch) {
                throw new NotFoundException(`Branch with ID ${branchId} not found`);
            }

            const data = {
                branchId,
                rm: null,
                equityDealer: null,
                commodityDealer1: null,
                commodityDealer2: null,
            };

            if (branch.rm && branch.rm.user) {
                data.rm = `${branch.rm.user.firstName} ${branch.rm.user.lastName}`.trim();
            }

            branch.dealers.forEach((dealer) => {
                const dealerId = dealer.dealerId;
                switch (dealer.dealerType) {
                    case DealerType.EQUITY:
                        data.equityDealer = dealerId;
                        break;
                    case DealerType.COMMODITY1:
                        data.commodityDealer1 = dealerId;
                        break;
                    case DealerType.COMMODITY2:
                        data.commodityDealer2 = dealerId;
                        break;
                }
            });

            return data;
        } catch (error) {
            this.logger.error(`Failed to fetch branch mapping for branchId ${branchId}: ${error.message}`);
            if (error instanceof BadRequestException || error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to retrieve branch mapping');
        }
    }

    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
    async aggregateMonthlyToAnnualStats() {
        this.logger.log('Starting monthly aggregation to annual stats...');
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            // Calculate previous month and financial year
            const prevMonthDate = moment().subtract(1, 'month').startOf('month');
            const prevMonthKey = prevMonthDate.format('YYYY-MM');
            const prevYearSameMonthKey = prevMonthDate.clone().subtract(1, 'year').format('YYYY-MM');

            // Determine financial year (April to March)
            const fyStartMonth = 3; // April

            // Get financial year starting year as string (e.g., '2024')
            const financialYear = prevMonthDate.month() >= fyStartMonth
                ? `${prevMonthDate.year()}`
                : `${prevMonthDate.year() - 1}`;

            this.logger.log(`Processing month: ${prevMonthKey}, FY: ${financialYear}`);


            // Get all branches with revenue data for previous month
            const monthlyRevenues = await queryRunner.manager.find(BranchRevenue, {
                where: { month: prevMonthKey }
            });

            const branchIds = monthlyRevenues.map(r => r.branchId);
            if (!branchIds.length) {
                this.logger.warn('No branch revenue data found for aggregation');
                return;
            }

            // Get existing annual stats for these branches
            const existingAnnualStats = await queryRunner.manager.find(AnnualBranchStats, {
                where: {
                    branchId: In(branchIds),
                    financialYear
                }
            });
            const annualStatsMap = new Map(
                existingAnnualStats.map(stats => [stats.branchId, stats])
            );

            // Prepare batch operations
            const toCreate: AnnualBranchStats[] = [];
            const toUpdate: AnnualBranchStats[] = [];

            for (const revenue of monthlyRevenues) {
                let annualStats = annualStatsMap.get(revenue.branchId);

                if (!annualStats) {
                    annualStats = new AnnualBranchStats();
                    annualStats.branchId = revenue.branchId;
                    annualStats.financialYear = financialYear;
                    this.initializeAnnualStats(annualStats);
                    toCreate.push(annualStats);
                }

                // Aggregate revenue data
                this.aggregateRevenueFields(annualStats, revenue);
                toUpdate.push(annualStats);
            }

            // Execute batch operations
            if (toCreate.length) {
                await queryRunner.manager.save(AnnualBranchStats, toCreate);
            }
            if (toUpdate.length) {
                await queryRunner.manager.save(AnnualBranchStats, toUpdate);
            }

            // Delete previous year's same month data
            const deleteResult = await queryRunner.manager.delete(BranchRevenue, {
                month: prevYearSameMonthKey
            });

            this.logger.log(`Aggregated ${monthlyRevenues.length} branches. Deleted ${deleteResult.affected} old records.`);

            await queryRunner.commitTransaction();
            this.logger.log('Monthly aggregation completed successfully');
        } catch (error) {
            this.logger.error('Error during monthly aggregation', error.stack);
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }

    private initializeAnnualStats(stats: AnnualBranchStats): void {
        stats.equityBrokerage = 0;
        stats.fnoBrokerage = 0;
        stats.commodityBrokerage = 0;
        stats.slbmBrokerage = 0;
        stats.mfBrokerage = 0;
        stats.insuranceBrokerage = 0;
        stats.bondsBrokerage = 0;
        stats.othersBrokerage = 0;
        stats.totalBrokerage = 0;
        stats.average = 0;
        stats.tradedClients = 0;
    }

    private aggregateRevenueFields(annualStats: AnnualBranchStats, revenue: BranchRevenue): void {
        annualStats.equityBrokerage = (annualStats.equityBrokerage || 0) + (revenue.equityBrokerage || 0);
        annualStats.fnoBrokerage = (annualStats.fnoBrokerage || 0) + (revenue.fnoBrokerage || 0);
        annualStats.commodityBrokerage = (annualStats.commodityBrokerage || 0) + (revenue.commodityBrokerage || 0);
        annualStats.slbmBrokerage = (annualStats.slbmBrokerage || 0) + (revenue.slbmBrokerage || 0);
        annualStats.mfBrokerage = (annualStats.mfBrokerage || 0) + (revenue.mfBrokerage || 0);
        annualStats.insuranceBrokerage = (annualStats.insuranceBrokerage || 0) + (revenue.insuranceBrokerage || 0);
        annualStats.bondsBrokerage = (annualStats.bondsBrokerage || 0) + (revenue.bondsBrokerage || 0);
        annualStats.othersBrokerage = (annualStats.othersBrokerage || 0) + (revenue.othersBrokerage || 0);

        // Calculate total brokerage
        annualStats.totalBrokerage =
            (annualStats.equityBrokerage || 0) +
            (annualStats.fnoBrokerage || 0) +
            (annualStats.commodityBrokerage || 0) +
            (annualStats.slbmBrokerage || 0) +
            (annualStats.mfBrokerage || 0) +
            (annualStats.insuranceBrokerage || 0) +
            (annualStats.bondsBrokerage || 0) +
            (annualStats.othersBrokerage || 0);
    }

    async calculateAndStoreBranchStats(statsDate: Date) {
        try {
            // Validate and normalize date
            const momentDate = moment.tz(statsDate, 'Asia/Kolkata');
            if (!momentDate.isValid()) {
                throw new Error(`Invalid statsDate: ${statsDate}`);
            }

            const monthKey = momentDate.format('YYYY-MM');
            const startOfMonth = momentDate.clone().startOf('month').toDate();
            const endOfMonth = momentDate.clone().endOf('month').toDate();

            this.logger.log(`Calculating branch stats for ${monthKey}`);

            // Fetch branches and build hierarchy
            const branchRepository = this.dataSource.getRepository(Branch);
            const branches = await branchRepository.find({
                relations: ['subBranches', 'controlBranch'],
                select: ['id', 'model', 'controlBranch']
            });

            if (!branches.length) {
                this.logger.warn('No branches found');
                return;
            }

            // Build adjacency list and parent map
            const adjacencyList = new Map<string, string[]>();
            const parentMap = new Map<string, string | null>();
            branches.forEach(branch => {
                adjacencyList.set(
                    branch.id,
                    branch.subBranches?.map(sb => sb.id).filter(id => id) || []
                );
                parentMap.set(branch.id, branch.controlBranch?.id || null);
            });

            // Compute full subtrees for each branch using iterative BFS
            const subTreeMap = new Map<string, string[]>();
            const computeSubtree = (startId: string): string[] => {
                const subtreeIds: string[] = [];
                const queue = [startId];
                const visited = new Set<string>();

                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    if (visited.has(currentId)) continue;
                    visited.add(currentId);
                    subtreeIds.push(currentId);

                    const children = adjacencyList.get(currentId) || [];
                    for (const childId of children) {
                        if (!visited.has(childId)) {
                            queue.push(childId);
                        }
                    }
                }
                return subtreeIds;
            };

            branches.forEach(branch => {
                subTreeMap.set(branch.id, computeSubtree(branch.id));
            });

            // Execute combined queries
            const [revenueRaw, clientActivityRaw] = await Promise.all([
                // Revenue and segment-wise client counts
                this.dataSource.query(`
                SELECT 
                    branchId,
                    SUM(CASE WHEN cocd IN ('NSE_CASH', 'NSE_DLY') THEN netBrokerage ELSE 0 END) AS equityBrokerage,
                    COUNT(DISTINCT CASE WHEN cocd IN ('NSE_CASH', 'NSE_DLY') THEN clientId END) AS equityTradedClients,
                    SUM(CASE WHEN cocd = 'NSE_FNO' THEN netBrokerage ELSE 0 END) AS fnoBrokerage,
                    COUNT(DISTINCT CASE WHEN cocd = 'NSE_FNO' THEN clientId END) AS fnoTradedClients,
                    SUM(CASE WHEN cocd IN ('MCX', 'NCDEX') THEN netBrokerage ELSE 0 END) AS commodityBrokerage,
                    COUNT(DISTINCT CASE WHEN cocd IN ('MCX', 'NCDEX') THEN clientId END) AS commodityTradedClients,
                    SUM(CASE WHEN cocd = 'NSE_SLBM' THEN netBrokerage ELSE 0 END) AS slbmBrokerage,
                    COUNT(DISTINCT CASE WHEN cocd = 'NSE_SLBM' THEN clientId END) AS slbmTradedClients,
                    SUM(CASE WHEN cocd NOT IN ('NSE_CASH', 'NSE_DLY', 'NSE_FNO', 'MCX', 'NCDEX', 'NSE_SLBM') THEN netBrokerage ELSE 0 END) AS othersBrokerage
                FROM segment_revenue
                WHERE tradeDate BETWEEN ? AND ?
                GROUP BY branchId
            `, [startOfMonth, endOfMonth]),

                // Client activity stats using client's assigned branch
                this.dataSource.query(`
                SELECT 
                    c.branch_id AS branchId,
                    COUNT(DISTINCT CASE WHEN c.clientActivationDate BETWEEN ? AND ? THEN c.id END) AS newClients,
                    COUNT(DISTINCT CASE WHEN c.clientReactivationDate BETWEEN ? AND ? THEN c.id END) AS reactivatedClients,
                    COUNT(DISTINCT sr.clientId) AS totalTradedClients
                FROM segment_revenue sr
                JOIN client c ON sr.clientId = c.id
                WHERE sr.tradeDate BETWEEN ? AND ?
                GROUP BY c.branch_id
            `, [
                    startOfMonth, endOfMonth,  // New client date range
                    startOfMonth, endOfMonth,  // Reactivated client date range
                    startOfMonth, endOfMonth   // Trade date range
                ])
            ]);

            // Calculate 6-month date range for historical average
            const sixMonthsAgo = moment.utc(statsDate).subtract(6, 'months').toDate();
            const sixMonthStart = moment.utc(sixMonthsAgo).startOf('month').toDate();

            // Additional queries for client stats
            const [expectedClientsRaw, lostClientsRaw, historicalStatsRaw] = await Promise.all([
                // Expected clients (all-time up to month end)
                this.dataSource.query(`
                SELECT c.branch_id AS branchId, COUNT(DISTINCT sr.clientId) AS expectedClients
                FROM segment_revenue sr
                JOIN client c ON sr.clientId = c.id
                WHERE sr.tradeDate <= ?
                GROUP BY c.branch_id
            `, [endOfMonth]),

                // Lost clients (traded before but not in current month)
                this.dataSource.query(`
                SELECT pre.branchId, COUNT(DISTINCT pre.clientId) AS lostClients
                FROM (
                    SELECT c.branch_id AS branchId, sr.clientId
                    FROM segment_revenue sr
                    JOIN client c ON sr.clientId = c.id
                    WHERE sr.tradeDate < ?
                    GROUP BY c.branch_id, sr.clientId
                ) pre
                LEFT JOIN (
                    SELECT c.branch_id AS branchId, sr.clientId
                    FROM segment_revenue sr
                    JOIN client c ON sr.clientId = c.id
                    WHERE sr.tradeDate BETWEEN ? AND ?
                    GROUP BY c.branch_id, sr.clientId
                ) cur ON pre.branchId = cur.branchId AND pre.clientId = cur.clientId
                WHERE cur.clientId IS NULL
                GROUP BY pre.branchId
            `, [startOfMonth, startOfMonth, endOfMonth]),

                // Historical 6-month average for traded clients
                this.dataSource.query(`
                SELECT bcs.branchId, AVG(bcs.totalTradedClients) AS avgTradedClients
                FROM branch_client_stats bcs
                WHERE bcs.month >= ? AND bcs.month < ?
                GROUP BY bcs.branchId
            `, [BranchClientStats.generateMonthKey(sixMonthStart), monthKey])
            ]);

            // Create lookup maps for efficient aggregation
            const revenueMap = new Map(revenueRaw.map(r => [r.branchId, r]));
            const clientActivityMap = new Map(clientActivityRaw.map(r => [r.branchId, r]));
            const expectedClientsMap = new Map(expectedClientsRaw.map(r => [r.branchId, Number(r.expectedClients) || 0]));
            const lostClientsMap = new Map(lostClientsRaw.map(r => [r.branchId, Number(r.lostClients) || 0]));
            const historicalAvgMap = new Map(historicalStatsRaw.map(r => [r.branchId, Number(r.avgTradedClients) || 0]));

            // Prepare results arrays
            const branchRevenueArray: BranchRevenue[] = [];
            const branchClientStatsArray: BranchClientStats[] = [];

            // Process each branch
            for (const branch of branches) {
                const subtreeIds = subTreeMap.get(branch.id) || [];

                // Initialize records
                const revenueRecord = new BranchRevenue();
                revenueRecord.branchId = branch.id;
                revenueRecord.month = monthKey;
                revenueRecord.createdAt = new Date();

                const clientStats = new BranchClientStats();
                clientStats.branchId = branch.id;
                clientStats.month = monthKey;
                clientStats.createdAt = startOfMonth;

                // Initialize aggregation variables
                let totalNew = 0;
                let totalReactivated = 0;
                let totalTraded = 0;
                let totalExpected = 0;
                let totalLost = 0;
                let sixMonthAvgTraded = 0;

                // Sum values across all branches in subtree
                for (const branchId of subtreeIds) {
                    // Revenue aggregation
                    const revData: BranchRevenue = revenueMap.get(branchId) as BranchRevenue;
                    if (revData) {
                        revenueRecord.equityBrokerage = (revenueRecord.equityBrokerage || 0) + Number(revData.equityBrokerage);
                        revenueRecord.fnoBrokerage = (revenueRecord.fnoBrokerage || 0) + Number(revData.fnoBrokerage);
                        revenueRecord.commodityBrokerage = (revenueRecord.commodityBrokerage || 0) + Number(revData.commodityBrokerage);
                        revenueRecord.slbmBrokerage = (revenueRecord.slbmBrokerage || 0) + Number(revData.slbmBrokerage);
                        revenueRecord.othersBrokerage = (revenueRecord.othersBrokerage || 0) + Number(revData.othersBrokerage);

                        revenueRecord.equityTradedClients = (revenueRecord.equityTradedClients || 0) + Number(revData.equityTradedClients);
                        revenueRecord.fnoTradedClients = (revenueRecord.fnoTradedClients || 0) + Number(revData.fnoTradedClients);
                        revenueRecord.commodityTradedClients = (revenueRecord.commodityTradedClients || 0) + Number(revData.commodityTradedClients);
                        revenueRecord.slbmTradedClients = (revenueRecord.slbmTradedClients || 0) + Number(revData.slbmTradedClients);
                    }

                    // Client stats aggregation
                    const activity: { newClients: number; reactivatedClients: number; totalTradedClients: number } = clientActivityMap.get(branchId) as { newClients: number; reactivatedClients: number; totalTradedClients: number };
                    if (activity) {
                        totalNew += Number(activity.newClients) || 0;
                        totalReactivated += Number(activity.reactivatedClients) || 0;
                        totalTraded += Number(activity.totalTradedClients) || 0;
                    }

                    totalExpected += Number(expectedClientsMap.get(branchId)) || 0;
                    totalLost += Number(lostClientsMap.get(branchId)) || 0;
                    sixMonthAvgTraded += Number(historicalAvgMap.get(branchId)) || 0;
                }

                // Calculate churn using new formula
                const gainedClients = totalNew + totalReactivated;
                const expectedWithoutChurn = sixMonthAvgTraded + gainedClients;
                const lostClients = totalTraded - expectedWithoutChurn;
                const churnRate = expectedWithoutChurn > 0
                    ? Number((lostClients / sixMonthAvgTraded * 100).toFixed(2))
                    : 0;

                // Set client stats values
                clientStats.newClientsTraded = totalNew;
                clientStats.reactivatedClientsTraded = totalReactivated;
                clientStats.gainedClients = gainedClients;
                clientStats.expectedClientsWithoutChurn = expectedWithoutChurn;
                clientStats.lostClients = lostClients;
                clientStats.churnRate = churnRate;
                clientStats.totalTradedClients = totalTraded;

                branchRevenueArray.push(revenueRecord);
                branchClientStatsArray.push(clientStats);
            }

            // Save results in transaction
            await this.dataSource.transaction(async manager => {
                if (branchRevenueArray.length > 0) {
                    await manager.getRepository(BranchRevenue).upsert(branchRevenueArray, ['branchId', 'month']);
                    this.logger.log(`Upserted ${branchRevenueArray.length} BranchRevenue records`);
                }

                if (branchClientStatsArray.length > 0) {
                    await manager.getRepository(BranchClientStats).upsert(branchClientStatsArray, ['branchId', 'month']);
                    this.logger.log(`Upserted ${branchClientStatsArray.length} BranchClientStats records`);
                }
            });

            this.logger.log(`Completed branch stats for ${monthKey}`);
        } catch (error) {
            this.logger.error(`Failed to calculate branch stats: ${error.message}`, error.stack);
            throw error;
        }
    }

    async computeDailyBranchStats(date: Date, isLastDate: boolean = true) {
        try {
            if (isLastDate) {
                await Promise.all([
                    this.calculateAndStoreBranchStats(date),
                    // this.calculateAndStoreBranchRevenue(date),
                ]);
                this.logger.log(`Successfully updated BranchRevenue and BranchClientStats for ${date.toISOString().split('T')[0]}`);
            } else {
                this.logger.log(`Skipped BranchRevenue and BranchClientStats for ${date.toISOString().split('T')[0]} as it is not the last date`);
            }
        } catch (error) {
            this.logger.error(`Failed to update branch stats for ${date.toISOString().split('T')[0]}: ${error.message}`);
            throw error;
        }
    }

    async resolveBranchIds(employee: Employee): Promise<string[]> {

        switch (employee.designation) {
            case Designation.regionalManager:
                const regionalBranches = await this.dataSource.getRepository(Branch).find({
                    where: { regionalManager: { id: employee.id }, model: BranchModels.BRANCH },
                    select: ['id'],
                });
                return regionalBranches.map(branch => branch.id);
            case Designation.branchManager:
                const subBranches = await this.dataSource.getRepository(Branch).find({
                    where: { id: employee.branch.id },
                    relations: ['subBranches'],
                });

                const subBranchIds = subBranches.flatMap(branch => branch.subBranches.map(sub => sub.id));
                return subBranchIds;

            case Designation.superAdmin:
                const allBranches = await this.dataSource.getRepository(Branch).find({
                    where: { model: BranchModels.BRANCH },
                    select: ['id'],
                });
                return allBranches.map(branch => branch.id);
            default:
                this.logger.warn(`Unsupported designation: ${employee.designation}`);
                return [];
        }
    }

    async getRevenueStats({ branchIds, date }: { branchIds: string[]; date: Date }): Promise<any> {
        if (!branchIds?.length) {
            this.logger.warn('No branch IDs provided for revenue stats');
            return { segments: [], products: [] };
        }

        const momentDate = moment.utc(date).startOf('day');
        const currentMonthKey = momentDate.format('YYYY-MM');
        const previousMonthKey = momentDate.clone().subtract(1, 'month').format('YYYY-MM');

        // Financial year (FY) starts in April (month index 3)
        const fyStartMonth = 3;

        const currentFYStart = momentDate.month() >= fyStartMonth
            ? moment.utc([momentDate.year(), fyStartMonth])
            : moment.utc([momentDate.year() - 1, fyStartMonth]);

        const currentFYEnd = currentFYStart.clone().add(1, 'year').subtract(1, 'day');

        const lastFYStart = currentFYStart.clone().subtract(1, 'year');

        // Instead of '2023-24', just '2023'
        const lastFinancialYear = `${lastFYStart.year()}`;


        // Generate all months in current FY for target query
        const currentFYMonths: string[] = [];
        let tempDate = currentFYStart.clone();
        while (tempDate.isBefore(currentFYEnd)) {
            currentFYMonths.push(tempDate.format('YYYY-MM'));
            tempDate.add(1, 'month');
        }

        const repositories = {
            revenue: this.dataSource.getRepository(BranchRevenue),
            target: this.dataSource.getRepository(BranchTarget),
            annualStats: this.dataSource.getRepository(AnnualBranchStats),
        };

        // Fetch data in parallel
        const [
            currentRevenues,
            previousRevenues,
            currentFYRevenues,
            lastFYStats,
            currentMonthTargets,
            currentFYTargets,
        ] = await Promise.all([
            repositories.revenue.find({ where: { branchId: In(branchIds), month: currentMonthKey } }),
            repositories.revenue.find({ where: { branchId: In(branchIds), month: previousMonthKey } }),
            repositories.revenue.find({
                where: {
                    branchId: In(branchIds),
                    month: Between(currentFYStart.format('YYYY-MM'), currentFYEnd.format('YYYY-MM')),
                },
            }),
            repositories.annualStats.find({ where: { branchId: In(branchIds), financialYear: lastFinancialYear } }),
            repositories.target.find({ where: { branchId: In(branchIds), month: currentMonthKey } }),
            repositories.target.find({
                where: {
                    branchId: In(branchIds),
                    month: In(currentFYMonths),
                },
            }),
        ]);

        // Define segments and products with their database mappings
        const segments = [
            { name: 'Equity', field: 'equityBrokerage', targetField: 'equityTarget' },
            { name: 'FNO', field: 'fnoBrokerage', targetField: 'fnoTarget' },
            { name: 'Commodity', field: 'commodityBrokerage', targetField: 'commodityTarget' },
            { name: 'SLBM', field: 'slbmBrokerage', targetField: 'slbmTarget' },
        ];

        const products = [
            { name: 'Mutual Fund', field: 'mfBrokerage', targetField: 'mfTarget' },
            { name: 'Insurance', field: 'insuranceBrokerage', targetField: 'insuranceTarget' },
            // { name: 'Bonds', field: 'bondsBrokerage', targetField: 'bondsTarget' },
            // { name: 'Others', field: 'otherBrokerage', targetField: 'otherTarget' },
        ];

        // Helper functions
        const sumReducer = (field: keyof BranchRevenue | keyof AnnualBranchStats) => (
            sum: number, item: BranchRevenue | AnnualBranchStats
        ) => Math.round(sum + (Number(item?.[field]) || 0));

        const sumTargetReducer = (field: keyof BranchTarget) => (sum: number, target: BranchTarget) =>
            Math.round(sum + (Number(target?.[field]) || 0));

        const formatPercentage = (value: number, base: number) =>
            base > 0 ? (value / base) * 100 : 0;

        // Type for revenue results
        type RevenueResult = {
            name: string;
            lastYearCumulative: number;
            lastYearAverage: number;
            previousMonthAchieved: number;
            currentMonthTarget: number;
            currentMonthAchieved: number;
            monthlyAchievement: number;
            monthlyGrowth: number;
            yearlyTarget: number;
            yearlyAchieved: number;
            yearlyAchievement: number;
            yearlyGrowth: number;
        };

        // Calculate statistics for a category (segments or products)
        const calculateStats = (
            category: { name: string; field: string; targetField: string }[]
        ): RevenueResult[] => {
            return category.map(({ name, field, targetField }) => {
                const current = currentRevenues.reduce(sumReducer(field as keyof BranchRevenue), 0);
                const previous = previousRevenues.reduce(sumReducer(field as keyof BranchRevenue), 0);
                const yearlyAchieved = currentFYRevenues.reduce(sumReducer(field as keyof BranchRevenue), 0);
                const lastYearCumulative = lastFYStats.reduce(sumReducer(field as keyof AnnualBranchStats), 0);
                // const lastYearAverage = lastFYStats.reduce(sumReducer('average' as keyof AnnualBranchStats), 0);
                const lastYearAverage = Math.round(lastYearCumulative / 12);

                // Calculate monthly and yearly targets
                const monthlyTarget = currentMonthTargets.reduce(sumTargetReducer(targetField as keyof BranchTarget), 0);
                const yearlyTarget = currentFYTargets.reduce(sumTargetReducer(targetField as keyof BranchTarget), 0);

                return {
                    name,
                    lastYearCumulative,
                    lastYearAverage,
                    previousMonthAchieved: previous,
                    currentMonthTarget: monthlyTarget,
                    currentMonthAchieved: current,
                    monthlyAchievement: formatPercentage(current, monthlyTarget),
                    monthlyGrowth: formatPercentage(current - previous, previous),
                    yearlyTarget,
                    yearlyAchieved,
                    yearlyAchievement: formatPercentage(yearlyAchieved, yearlyTarget),
                    yearlyGrowth: formatPercentage(yearlyAchieved - lastYearCumulative, lastYearCumulative),
                };
            });
        };

        // Calculate segment and product results
        const segmentResults = calculateStats(segments);
        const productResults = calculateStats(products);

        // Calculate separate totals for segments and products
        const calculateTotal = (results: RevenueResult[]): RevenueResult => {
            const total: RevenueResult = {
                name: 'Total',
                lastYearCumulative: 0,
                lastYearAverage: 0,
                previousMonthAchieved: 0,
                currentMonthTarget: 0,
                currentMonthAchieved: 0,
                monthlyAchievement: 0,
                monthlyGrowth: 0,
                yearlyTarget: 0,
                yearlyAchieved: 0,
                yearlyAchievement: 0,
                yearlyGrowth: 0,
            };

            // Sum all values from individual items
            results.forEach(item => {
                total.lastYearCumulative += item.lastYearCumulative;
                total.previousMonthAchieved += item.previousMonthAchieved;
                total.currentMonthTarget += item.currentMonthTarget;
                total.currentMonthAchieved += item.currentMonthAchieved;
                total.yearlyTarget += item.yearlyTarget;
                total.yearlyAchieved += item.yearlyAchieved;
            });

            // Calculate derived values
            total.lastYearAverage = total.lastYearCumulative / 12;
            total.monthlyAchievement = formatPercentage(total.currentMonthAchieved, total.currentMonthTarget);
            total.monthlyGrowth = formatPercentage(
                total.currentMonthAchieved - total.previousMonthAchieved,
                total.previousMonthAchieved
            );
            total.yearlyAchievement = formatPercentage(total.yearlyAchieved, total.yearlyTarget);
            total.yearlyGrowth = formatPercentage(
                total.yearlyAchieved - total.lastYearCumulative,
                total.lastYearCumulative
            );

            return total;
        };

        // Create separate totals
        const segmentTotal = calculateTotal(segmentResults);
        const productTotal = calculateTotal(productResults);

        return {
            segments: [...segmentResults, segmentTotal],
            products: [...productResults, productTotal],
        };
    }

    async getSubbranchRevenue({
        branchIds,
        date,
        isDashboard,
        req,
        employee
    }: {
        branchIds: string[];
        date: Date;
        isDashboard: boolean;
        req: any;
        employee: Employee;
    }): Promise<any> {
        try {
            if (!branchIds.length) {
                this.logger.error('No branch IDs provided');
                throw new BadRequestException('No branches found');
            }

            // Fetch the latest 2 available distinct trade dates
            const recentDates = await this.dataSource.getRepository(DailyBranchStats)
                .createQueryBuilder('stats')
                .select('DISTINCT stats.date', 'date')
                .where('stats.branchId IN (:...branchIds)', { branchIds })
                .orderBy('stats.date', 'DESC')
                .limit(2)
                .getRawMany();

            if (!recentDates.length) {
                this.logger.warn('No recent trade dates found');
                return isDashboard ? [] : { items: [], total: 0 };
            }

            const latestStatsDate = recentDates[0]?.date;
            const previousStatsDate = recentDates[1]?.date ?? null;

            const latestMoment = moment.utc(latestStatsDate);
            const latestMonthKey = latestMoment.format('YYYY-MM');

            const prevMonth = latestMoment.clone().subtract(1, 'month');
            const previousMonthKey = prevMonth.format('YYYY-MM');


            // Fetch branches with aggregated totalTargetAchieved
            let qb = this.branchRepository
                .createQueryBuilder('branch')
                .leftJoinAndSelect('branch.state', 'state')
                .leftJoinAndSelect('branch.controlBranch', 'controlBranch')
                .leftJoin('DailyBranchStats', 'stats', 'stats.branchId = branch.id AND stats.date = :latestStatsDate', { latestStatsDate })
                .where('branch.id IN (:...branchIds)', { branchIds })
                .andWhere('branch.deletedAt IS NULL');

            if (req?.QUERY_STRING?.where) {
                qb.andWhere(req.QUERY_STRING.where);
            }

            const isSuperAdmin = employee.designation === Designation.superAdmin;
            const isBranchManager = employee.designation === Designation.branchManager;

            // For non-SuperAdmin, apply custom orderBy if provided, else order by totalTargetAchieved
            if (!isSuperAdmin) {
                if (req?.QUERY_STRING?.orderBy?.key) {
                    qb.orderBy(
                        orderByKey({
                            key: req?.QUERY_STRING?.orderBy?.key,
                            repoAlias: 'branch',
                        }),
                        orderByValue({ req }),
                    );
                } else {
                    // Join with sub-branches to aggregate totalTargetAchieved
                    qb.leftJoin('Branch', 'subBranch', 'subBranch.controlBranch.id = branch.id AND subBranch.deletedAt IS NULL')
                        .leftJoin('DailyBranchStats', 'subStats', 'subStats.branchId = subBranch.id AND subStats.date = :latestStatsDate', { latestStatsDate })
                        .groupBy('branch.id')
                        .addSelect('COALESCE(SUM(stats.monthlyBrokerage) + SUM(subStats.monthlyBrokerage), 0)', 'totalTargetAchieved')
                        .orderBy('totalTargetAchieved', 'DESC')
                        .addOrderBy('branch.id', 'ASC'); // Secondary sort for consistency
                }
                qb.skip(req?.QUERY_STRING?.skip || 0)
                    .take(!isDashboard ? req?.QUERY_STRING?.limit : 10);
            }

            const branches = await qb.getMany();

            if (!branches.length) {
                this.logger.warn('No branches found for provided branch IDs');
                return isDashboard ? [] : { items: [], total: 0, qb };
            }

            const branchIdsToFetch = [...new Set(branches.map((b) => b.id))];
            const [allStats, allTargets, allRevenues, allPreviousRevenues] = await Promise.all([
                this.dataSource.getRepository(DailyBranchStats).find({
                    where: { branchId: In(branchIdsToFetch), date: latestStatsDate },
                }),
                this.dataSource.getRepository(BranchTarget).find({
                    where: { branchId: In(branchIdsToFetch), month: latestMonthKey },
                }),
                this.dataSource.getRepository(BranchRevenue).find({
                    where: { branchId: In(branchIdsToFetch), month: latestMonthKey },
                }),
                this.dataSource.getRepository(BranchRevenue).find({
                    where: { branchId: In(branchIdsToFetch), month: previousMonthKey },
                }),
            ]);
            const statsMap = new Map(allStats.map((s) => [s.branchId, s]));
            const targetMap = new Map(allTargets.map((t) => [t.branchId, t]));
            const revenueMap = new Map(allRevenues.map((r) => [r.branchId, r]));
            const prevRevenueMap = new Map(allPreviousRevenues.map((r) => [r.branchId, r]));

            const stateIdToNameMap = new Map<number, string>();
            const states = await this.dataSource.getRepository(State).find();
            states.forEach((state) => stateIdToNameMap.set(state.id, state.name.toLowerCase()));

            const computeBranchStats = (branch: Branch) => {
                const stats = statsMap.get(branch.id);
                const branchTarget = targetMap.get(branch.id);
                const branchRevenue = revenueMap.get(branch.id);
                const previousMonthRevenue = prevRevenueMap.get(branch.id);

                // Log warnings for missing data
                if (!stats) {
                    this.logger.warn(`No DailyBranchStats for branch ${branch.id} on ${latestStatsDate.toISOString()}`);
                }
                if (!branchTarget) {
                    this.logger.warn(`No BranchTarget for branch ${branch.id}`);
                }
                if (!branchRevenue) {
                    this.logger.warn(`No BranchRevenue for branch ${branch.id} in month ${latestMonthKey}`);
                }

                // Initialize default values to avoid undefined errors
                const equityTarget = Number(branchTarget?.equityTarget) || 0;
                const fnoTarget = Number(branchTarget?.fnoTarget) || 0;
                const commodityTarget = Number(branchTarget?.commodityTarget) || 0;
                const slbmTarget = Number(branchTarget?.slbmTarget) || 0;
                const mfTarget = Number(branchTarget?.mfTarget) || 0;
                const insuranceTarget = Number(branchTarget?.insuranceTarget) || 0;

                const equityAchieved = Number(branchRevenue?.equityBrokerage) || 0;
                const fnoAchieved = Number(branchRevenue?.fnoBrokerage) || 0;
                const commodityAchieved = Number(branchRevenue?.commodityBrokerage) || 0;
                const slbmAchieved = Number(branchRevenue?.slbmBrokerage) || 0;
                const mfAchieved = Number(branchRevenue?.mfBrokerage) || 0;
                const insuranceAchieved = Number(branchRevenue?.insuranceBrokerage) || 0;

                const totalTargetAchieved = Number(stats?.monthlyBrokerage) || 0;
                const totalTarget = Number(stats?.totalTarget) || 0;
                const shortage = totalTarget - totalTargetAchieved;

                const totalNoOfTradedClients =
                    (branchRevenue?.equityTradedClients || 0) +
                    (branchRevenue?.fnoTradedClients || 0) +
                    (branchRevenue?.commodityTradedClients || 0) +
                    (branchRevenue?.slbmTradedClients || 0);

                const noOfTradingDays = stats?.totalTradingDays && !isNaN(stats.totalTradingDays) ? stats.totalTradingDays : 21;
                const remainingDays = stats?.remainingDays && stats.remainingDays > 0 ? stats.remainingDays : 21;

                const dailyAverageRequired = remainingDays > 0 ? shortage / remainingDays : 0;
                const currentAverage = noOfTradingDays > 0 ? totalTargetAchieved / noOfTradingDays : 0;
                const daysPassed = noOfTradingDays - remainingDays;
                const equityProjection = (equityAchieved / daysPassed) * noOfTradingDays;
                const fnoProjection = (fnoAchieved / daysPassed) * noOfTradingDays;
                const commodityProjection = (commodityAchieved / daysPassed) * noOfTradingDays;
                const slbmProjection = (slbmAchieved / daysPassed) * noOfTradingDays;
                const totalProjection = (totalTargetAchieved / daysPassed) * noOfTradingDays;

                const yesterdaysRevenue =
                    Number(previousMonthRevenue?.equityBrokerage || 0) +
                    Number(previousMonthRevenue?.fnoBrokerage || 0) +
                    Number(previousMonthRevenue?.commodityBrokerage || 0) +
                    Number(previousMonthRevenue?.slbmBrokerage || 0);

                const stateName = branch.state?.id
                    ? stateIdToNameMap.get(branch.state.id) || 'N/A'
                    : 'N/A';

                return {
                    branchName: branch.name,
                    branchId: branch.id,
                    state: stateName,
                    equityTarget,
                    equityAchieved,
                    equityProjection,
                    fnoTarget,
                    fnoAchieved,
                    fnoProjection,
                    commodityTarget,
                    commodityAchieved,
                    commodityProjection,
                    slbmTarget,
                    slbmAchieved,
                    slbmProjection,
                    totalTarget,
                    totalTargetAchieved,
                    shortage,
                    projection: totalProjection,
                    dailyAverageRequired,
                    currentAverage,
                    yesterdaysRevenue,
                    totalActiveClientsGoal: branchTarget?.activeClientsGoal || 0,
                    totalNoOfTradedClients,
                    mfTarget,
                    mfAchieved,
                    insuranceTarget,
                    insuranceAchieved,
                    noOfTradingDays,
                    remainingTradeDays: remainingDays,
                };
            };

            const branchStatsMap = new Map<string, any>();

            if (isSuperAdmin) {
                // Initialize total stats with the employee's branch ID
                const totalStats = {
                    branchName: 'Total',
                    branchId: employee.branch?.id || 'cumulative',
                    state: 'N/A',
                    equityTarget: 0,
                    equityAchieved: 0,
                    equityProjection: 0,
                    fnoTarget: 0,
                    fnoAchieved: 0,
                    fnoProjection: 0,
                    commodityTarget: 0,
                    commodityAchieved: 0,
                    commodityProjection: 0,
                    slbmTarget: 0,
                    slbmAchieved: 0,
                    slbmProjection: 0,
                    totalTarget: 0,
                    totalTargetAchieved: 0,
                    shortage: 0,
                    projection: 0,
                    dailyAverageRequired: 0,
                    currentAverage: 0,
                    yesterdaysRevenue: 0,
                    totalActiveClientsGoal: 0,
                    totalNoOfTradedClients: 0,
                    mfTarget: 0,
                    mfAchieved: 0,
                    insuranceTarget: 0,
                    insuranceAchieved: 0,
                    noOfTradingDays: 0,
                    remainingTradeDays: 0,
                };

                // Process main branches
                const mainBranches = branches.filter((b) => b.id === b.controlBranch?.id || !b.controlBranch);
                for (const mainBranch of mainBranches) {
                    const branchStats = computeBranchStats(mainBranch);
                    branchStatsMap.set(mainBranch.id, branchStats);
                }

                // Aggregate sub-branch data into main branches
                const subBranches = branches.filter((b) => b.controlBranch && b.id !== b.controlBranch.id);
                for (const subBranch of subBranches) {
                    const parentBranchId = subBranch.controlBranch.id;
                    if (!branchStatsMap.has(parentBranchId)) {
                        branchStatsMap.set(parentBranchId, {
                            branchName: subBranch.controlBranch.name,
                            branchId: parentBranchId,
                            state: subBranch.state?.id ? stateIdToNameMap.get(subBranch.state.id) || 'N/A' : 'N/A',
                            equityTarget: 0,
                            equityAchieved: 0,
                            equityProjection: 0,
                            fnoTarget: 0,
                            fnoAchieved: 0,
                            fnoProjection: 0,
                            commodityTarget: 0,
                            commodityAchieved: 0,
                            commodityProjection: 0,
                            slbmTarget: 0,
                            slbmAchieved: 0,
                            slbmProjection: 0,
                            totalTarget: 0,
                            totalTargetAchieved: 0,
                            shortage: 0,
                            projection: 0,
                            dailyAverageRequired: 0,
                            currentAverage: 0,
                            yesterdaysRevenue: 0,
                            totalActiveClientsGoal: 0,
                            totalNoOfTradedClients: 0,
                            mfTarget: 0,
                            mfAchieved: 0,
                            insuranceTarget: 0,
                            insuranceAchieved: 0,
                            noOfTradingDays: 0,
                            remainingTradeDays: 0,
                        });
                    }

                    const branchStats = computeBranchStats(subBranch);
                    const parentStats = branchStatsMap.get(parentBranchId);

                    parentStats.equityTarget += branchStats.equityTarget;
                    parentStats.equityAchieved += branchStats.equityAchieved;
                    parentStats.equityProjection += branchStats.equityProjection;
                    parentStats.fnoTarget += branchStats.fnoTarget;
                    parentStats.fnoAchieved += branchStats.fnoAchieved;
                    parentStats.fnoProjection += branchStats.fnoProjection;
                    parentStats.commodityTarget += branchStats.commodityTarget;
                    parentStats.commodityAchieved += branchStats.commodityAchieved;
                    parentStats.commodityProjection += branchStats.commodityProjection;
                    parentStats.slbmTarget += branchStats.slbmTarget;
                    parentStats.slbmAchieved += branchStats.slbmAchieved;
                    parentStats.slbmProjection += branchStats.slbmProjection;
                    parentStats.totalTarget += branchStats.totalTarget;
                    parentStats.totalTargetAchieved += branchStats.totalTargetAchieved;
                    parentStats.shortage += branchStats.shortage;
                    parentStats.projection += branchStats.projection;
                    parentStats.dailyAverageRequired = Math.max(
                        parentStats.dailyAverageRequired,
                        branchStats.dailyAverageRequired,
                    );
                    parentStats.currentAverage += branchStats.currentAverage;
                    parentStats.yesterdaysRevenue += branchStats.yesterdaysRevenue;
                    parentStats.totalActiveClientsGoal += branchStats.totalActiveClientsGoal;
                    parentStats.totalNoOfTradedClients += branchStats.totalNoOfTradedClients;
                    parentStats.mfTarget += branchStats.mfTarget;
                    parentStats.mfAchieved += branchStats.mfAchieved;
                    parentStats.insuranceTarget += branchStats.insuranceTarget;
                    parentStats.insuranceAchieved += branchStats.insuranceAchieved;
                    parentStats.noOfTradingDays = Math.max(
                        parentStats.noOfTradingDays,
                        branchStats.noOfTradingDays,
                    );
                    parentStats.remainingTradeDays = Math.max(
                        parentStats.remainingTradeDays,
                        branchStats.remainingTradeDays,
                    );
                }

                // Calculate total stats by aggregating all main branch stats
                for (const stats of branchStatsMap.values()) {
                    totalStats.equityTarget += stats.equityTarget;
                    totalStats.equityAchieved += stats.equityAchieved;
                    totalStats.equityProjection += stats.equityProjection;
                    totalStats.fnoTarget += stats.fnoTarget;
                    totalStats.fnoAchieved += stats.fnoAchieved;
                    totalStats.fnoProjection += stats.fnoProjection;
                    totalStats.commodityTarget += stats.commodityTarget;
                    totalStats.commodityAchieved += stats.commodityAchieved;
                    totalStats.commodityProjection += stats.commodityProjection;
                    totalStats.slbmTarget += stats.slbmTarget;
                    totalStats.slbmAchieved += stats.slbmAchieved;
                    totalStats.slbmProjection += stats.slbmProjection;
                    totalStats.totalTarget += stats.totalTarget;
                    totalStats.totalTargetAchieved += stats.totalTargetAchieved;
                    totalStats.shortage += stats.shortage;
                    totalStats.projection += stats.projection;
                    totalStats.dailyAverageRequired = Math.max(
                        totalStats.dailyAverageRequired,
                        stats.dailyAverageRequired,
                    );
                    totalStats.currentAverage += stats.currentAverage;
                    totalStats.yesterdaysRevenue += stats.yesterdaysRevenue;
                    totalStats.totalActiveClientsGoal += stats.totalActiveClientsGoal;
                    totalStats.totalNoOfTradedClients += stats.totalNoOfTradedClients;
                    totalStats.mfTarget += stats.mfTarget;
                    totalStats.mfAchieved += stats.mfAchieved;
                    totalStats.insuranceTarget += stats.insuranceTarget;
                    totalStats.insuranceAchieved += stats.insuranceAchieved;
                    totalStats.noOfTradingDays = Math.max(
                        totalStats.noOfTradingDays,
                        stats.noOfTradingDays,
                    );
                    totalStats.remainingTradeDays = Math.max(
                        totalStats.remainingTradeDays,
                        stats.remainingTradeDays,
                    );
                }

                // Adjust currentAverage for total stats
                totalStats.currentAverage =
                    totalStats.noOfTradingDays > 0
                        ? totalStats.totalTargetAchieved / totalStats.noOfTradingDays
                        : 0;

                // Add total stats to the map
                branchStatsMap.set(totalStats.branchId, totalStats);

                // Return results without sorting (already sorted by query)
                const result = Array.from(branchStatsMap.values());

                return isDashboard
                    ? result
                    : {
                        items: result,
                        total: result.length,
                        qb,
                    };
            } else if (isBranchManager) {
                // For Branch Manager, return stats for each branch without aggregation
                for (const branch of branches) {
                    const branchStats = computeBranchStats(branch);
                    branchStatsMap.set(branch.id, branchStats);
                }
            } else {
                // Initialize main branches
                const mainBranches = branches.filter((b) => b.id === b.controlBranch?.id || !b.controlBranch);
                for (const mainBranch of mainBranches) {
                    branchStatsMap.set(mainBranch.id, {
                        branchName: mainBranch.name,
                        branchId: mainBranch.id,
                        state: mainBranch.state?.id ? stateIdToNameMap.get(mainBranch.state.id) || 'N/A' : 'N/A',
                        equityTarget: 0,
                        equityAchieved: 0,
                        equityProjection: 0,
                        fnoTarget: 0,
                        fnoAchieved: 0,
                        fnoProjection: 0,
                        commodityTarget: 0,
                        commodityAchieved: 0,
                        commodityProjection: 0,
                        slbmTarget: 0,
                        slbmAchieved: 0,
                        slbmProjection: 0,
                        totalTarget: 0,
                        totalTargetAchieved: 0,
                        shortage: 0,
                        projection: 0,
                        dailyAverageRequired: 0,
                        currentAverage: 0,
                        yesterdaysRevenue: 0,
                        totalActiveClientsGoal: 0,
                        totalNoOfTradedClients: 0,
                        mfTarget: 0,
                        mfAchieved: 0,
                        insuranceTarget: 0,
                        insuranceAchieved: 0,
                        noOfTradingDays: 0,
                        remainingTradeDays: 0,
                    });

                    const branchStats = computeBranchStats(mainBranch);
                    const parentStats = branchStatsMap.get(mainBranch.id);
                    Object.assign(parentStats, branchStats);
                }

                // Aggregate sub-branch data into main branches
                const subBranches = branches.filter((b) => b.controlBranch && b.id !== b.controlBranch.id);
                for (const subBranch of subBranches) {
                    const parentBranchId = subBranch.controlBranch.id;
                    if (!branchStatsMap.has(parentBranchId)) {
                        branchStatsMap.set(parentBranchId, {
                            branchName: subBranch.controlBranch.name,
                            branchId: parentBranchId,
                            state: subBranch.state?.id ? stateIdToNameMap.get(subBranch.state.id) || 'N/A' : 'N/A',
                            equityTarget: 0,
                            equityAchieved: 0,
                            equityProjection: 0,
                            fnoTarget: 0,
                            fnoAchieved: 0,
                            fnoProjection: 0,
                            commodityTarget: 0,
                            commodityAchieved: 0,
                            commodityProjection: 0,
                            slbmTarget: 0,
                            slbmAchieved: 0,
                            slbmProjection: 0,
                            totalTarget: 0,
                            totalTargetAchieved: 0,
                            shortage: 0,
                            projection: 0,
                            dailyAverageRequired: 0,
                            currentAverage: 0,
                            yesterdaysRevenue: 0,
                            totalActiveClientsGoal: 0,
                            totalNoOfTradedClients: 0,
                            mfTarget: 0,
                            mfAchieved: 0,
                            insuranceTarget: 0,
                            insuranceAchieved: 0,
                            noOfTradingDays: 0,
                            remainingTradeDays: 0,
                        });
                    }

                    const branchStats = computeBranchStats(subBranch);
                    const parentStats = branchStatsMap.get(parentBranchId);

                    parentStats.equityTarget += branchStats.equityTarget;
                    parentStats.equityAchieved += branchStats.equityAchieved;
                    parentStats.equityProjection += branchStats.equityProjection;
                    parentStats.fnoTarget += branchStats.fnoTarget;
                    parentStats.fnoAchieved += branchStats.fnoAchieved;
                    parentStats.fnoProjection += branchStats.fnoProjection;
                    parentStats.commodityTarget += branchStats.commodityTarget;
                    parentStats.commodityAchieved += branchStats.commodityAchieved;
                    parentStats.commodityProjection += branchStats.commodityProjection;
                    parentStats.slbmTarget += branchStats.slbmTarget;
                    parentStats.slbmAchieved += branchStats.slbmAchieved;
                    parentStats.slbmProjection += branchStats.slbmProjection;
                    parentStats.totalTarget += branchStats.totalTarget;
                    parentStats.totalTargetAchieved += branchStats.totalTargetAchieved;
                    parentStats.shortage += branchStats.shortage;
                    parentStats.projection += branchStats.projection;
                    parentStats.dailyAverageRequired = Math.max(
                        parentStats.dailyAverageRequired,
                        branchStats.dailyAverageRequired,
                    );
                    parentStats.currentAverage += branchStats.currentAverage;
                    parentStats.yesterdaysRevenue += branchStats.yesterdaysRevenue;
                    parentStats.totalActiveClientsGoal += branchStats.totalActiveClientsGoal;
                    parentStats.totalNoOfTradedClients += branchStats.totalNoOfTradedClients;
                    parentStats.mfTarget += branchStats.mfTarget;
                    parentStats.mfAchieved += branchStats.mfAchieved;
                    parentStats.insuranceTarget += branchStats.insuranceTarget;
                    parentStats.insuranceAchieved += branchStats.insuranceAchieved;
                    parentStats.noOfTradingDays = Math.max(
                        parentStats.noOfTradingDays,
                        branchStats.noOfTradingDays,
                    );
                    parentStats.remainingTradeDays = Math.max(
                        parentStats.remainingTradeDays,
                        branchStats.remainingTradeDays,
                    );
                }
            }

            // Return results without sorting (already sorted by query)
            const result = Array.from(branchStatsMap.values());

            if (!isDashboard) {
                result.forEach((stats) => {
                    stats.currentAverage = stats.noOfTradingDays > 0 ? stats.totalTargetAchieved / stats.noOfTradingDays : 0;
                });
            }
            result.sort((a, b) => b.totalTargetAchieved - a.totalTargetAchieved);
            return isDashboard
                ? result
                : {
                    items: result,
                    total: result.length,
                    qb,
                };
        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all sub-branch IDs including direct and indirect children for stats calculation
     */
    private async getAllSubBranchIdsForStats(branchId: string): Promise<string[]> {
        try {
            // Fetch all branches with their relationships
            const branches = await this.dataSource.getRepository(Branch).find({
                relations: ['controlBranch', 'subBranches'],
                where: { deletedAt: IsNull() }
            });

            if (!branches.length) {
                return [branchId]; // Return at least the original branch if no branches found
            }

            // Build adjacency list for efficient hierarchy traversal
            const adjacencyList = new Map<string, string[]>();
            branches.forEach(branch => {
                adjacencyList.set(
                    branch.id,
                    branch.subBranches?.map(sb => sb.id).filter(id => id) || []
                );
            });

            // Compute full subtree using BFS to include all direct and indirect sub-branches
            const computeSubtree = (startId: string): string[] => {
                const subtreeIds: string[] = [];
                const queue = [startId];
                const visited = new Set<string>();

                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    if (visited.has(currentId)) continue;
                    visited.add(currentId);
                    subtreeIds.push(currentId);

                    const children = adjacencyList.get(currentId) || [];
                    for (const childId of children) {
                        if (!visited.has(childId)) {
                            queue.push(childId);
                        }
                    }
                }
                return subtreeIds;
            };

            return computeSubtree(branchId);
        } catch (error) {
            this.logger.error(`Failed to calculate branch hierarchy for ${branchId}: ${error.message}`);
            return [branchId]; // Fallback to original branch only
        }
    }

    async getBranchClientStats({ branchIds, date }: { branchIds: string[]; date: Date }): Promise<IChurn[]> {
        const currentDate = DateUtils.normalizeDate(new Date(date));
        const currentMonthKey = BranchClientStats.generateMonthKey(currentDate);
        const sixMonthsAgo = new Date(currentDate.getTime());
        sixMonthsAgo.setUTCMonth(currentDate.getUTCMonth() - 6);
        const startMonthKey = BranchClientStats.generateMonthKey(sixMonthsAgo);

        try {
            // Calculate actual date ranges for queries
            const startOfMonth = moment.utc(currentDate).startOf('month').toDate();
            const endOfMonth = moment.utc(currentDate).endOf('month').toDate();

            // Get all sub-branch IDs for each branch (including self + all descendants)
            const branchHierarchyMap = new Map<string, string[]>();

            for (const branchId of branchIds) {
                // Use the getAllSubBranchIds logic to get complete hierarchy
                const allSubBranchIds = await this.getAllSubBranchIdsForStats(branchId);
                branchHierarchyMap.set(branchId, allSubBranchIds);
            }

            // Flatten all unique branch IDs for queries
            const allBranchIdsForQuery = [...new Set(Array.from(branchHierarchyMap.values()).flat())];

            const [actualCurrentStats, branchTargets, sixMonthHistoricalData] = await Promise.all([
                // Current month actual traded clients including full hierarchy
                this.dataSource.query(`
                    SELECT 
                        s.branchId,
                        COUNT(DISTINCT c.id) AS totalTradedClients,
                        COUNT(DISTINCT CASE WHEN c.clientActivationDate BETWEEN ? AND ? THEN c.id END) AS newClientsTraded,
                        COUNT(DISTINCT CASE WHEN c.clientReactivationDate BETWEEN ? AND ? THEN c.id END) AS reactivatedClientsTraded
                    FROM client c
                    JOIN segment_revenue s ON s.clientId = c.id
                    WHERE s.branchId IN (${allBranchIdsForQuery.map(() => '?').join(',')})
                      AND s.tradeDate BETWEEN ? AND ?
                    GROUP BY s.branchId
                `, [startOfMonth, endOfMonth, startOfMonth, endOfMonth, ...allBranchIdsForQuery, startOfMonth, endOfMonth]),

                this.dataSource.getRepository(BranchTarget).find({
                    where: { branchId: In(branchIds), month: currentMonthKey },
                }),

                // 6-month historical data - get monthly totals for proper averaging
                this.dataSource.query(`
                    SELECT 
                        s.branchId,
                        DATE_FORMAT(s.tradeDate, '%Y-%m') AS trade_month,
                        COUNT(DISTINCT c.id) AS totalTradedClients,
                        COUNT(DISTINCT CASE WHEN c.clientActivationDate BETWEEN DATE_FORMAT(s.tradeDate, '%Y-%m-01') 
                            AND LAST_DAY(s.tradeDate) THEN c.id END) AS newClientsTraded,
                        COUNT(DISTINCT CASE WHEN c.clientReactivationDate BETWEEN DATE_FORMAT(s.tradeDate, '%Y-%m-01') 
                            AND LAST_DAY(s.tradeDate) THEN c.id END) AS reactivatedClientsTraded
                    FROM client c
                    JOIN segment_revenue s ON s.clientId = c.id
                    WHERE s.branchId IN (${allBranchIdsForQuery.map(() => '?').join(',')})
                      AND s.tradeDate >= ?
                      AND s.tradeDate < ?
                    GROUP BY s.branchId, DATE_FORMAT(s.tradeDate, '%Y-%m')
                    ORDER BY trade_month DESC
                `, [...allBranchIdsForQuery, sixMonthsAgo, startOfMonth]),
            ]);

            // Process actual current stats - aggregate by hierarchy
            const currentStatsMap = new Map(actualCurrentStats.map((stat: any) => [stat.branchId, stat]));

            // Calculate totals from actual current stats including hierarchy
            let totalTradedClients = 0;
            let totalNewClients = 0;
            let totalReactivatedClients = 0;
            let gainedClientsAchieved = 0;

            // Aggregate stats for each branch including its hierarchy
            branchIds.forEach(branchId => {
                const hierarchyBranchIds = branchHierarchyMap.get(branchId) || [branchId];

                hierarchyBranchIds.forEach(subBranchId => {
                    const stats: any = currentStatsMap.get(subBranchId);
                    if (stats) {
                        totalTradedClients += Number(stats.totalTradedClients) || 0;
                        totalNewClients += Number(stats.newClientsTraded) || 0;
                        totalReactivatedClients += Number(stats.reactivatedClientsTraded) || 0;
                        gainedClientsAchieved += (Number(stats.newClientsTraded) || 0) + (Number(stats.reactivatedClientsTraded) || 0);
                    }
                });
            });

            // Process 6-month data: total of past 6 months / 6
            const historicalStatsMap = new Map<string, any[]>();
            sixMonthHistoricalData.forEach((stat: any) => {
                const branchId = stat.branchId;
                if (!historicalStatsMap.has(branchId)) {
                    historicalStatsMap.set(branchId, []);
                }
                historicalStatsMap.get(branchId)!.push(stat);
            });

            // Calculate 6-month averages: (sum of 6 months) / 6
            let sixMonthTotalTradedSum = 0;
            let sixMonthNewClientsSum = 0;
            let sixMonthReactivatedSum = 0;
            let sixMonthGainedSum = 0;
            let monthCount = 0;

            branchIds.forEach(branchId => {
                const hierarchyBranchIds = branchHierarchyMap.get(branchId) || [branchId];

                hierarchyBranchIds.forEach(subBranchId => {
                    const monthlyStats = historicalStatsMap.get(subBranchId) || [];
                    monthlyStats.forEach((monthStat: any) => {
                        sixMonthTotalTradedSum += Number(monthStat.totalTradedClients) || 0;
                        sixMonthNewClientsSum += Number(monthStat.newClientsTraded) || 0;
                        sixMonthReactivatedSum += Number(monthStat.reactivatedClientsTraded) || 0;
                        sixMonthGainedSum += (Number(monthStat.newClientsTraded) || 0) + (Number(monthStat.reactivatedClientsTraded) || 0);
                    });
                });
            });

            // Get unique months for proper averaging
            const uniqueMonths = new Set<string>();
            sixMonthHistoricalData.forEach((stat: any) => uniqueMonths.add(stat.trade_month));
            monthCount = Math.max(uniqueMonths.size, 1); // Avoid division by zero

            const sixMonthAverages = {
                avgTotalTradedClients: Math.round(sixMonthTotalTradedSum / monthCount),
                avgNewClientsTraded: Math.round(sixMonthNewClientsSum / monthCount),
                avgReactivatedClientsTraded: Math.round(sixMonthReactivatedSum / monthCount),
                avgGainedClients: Math.round(sixMonthGainedSum / monthCount),
            };

            const sumTargetReducer = (field: keyof BranchTarget) => (sum: number, target: BranchTarget) =>
                sum + (Number(target?.[field]) || 0);

            // Apply new churn calculation logic
            const expectedWithoutChurn = sixMonthAverages.avgTotalTradedClients + gainedClientsAchieved;
            const lostClientsCalculated = totalTradedClients - expectedWithoutChurn;
            const churnRateCalculated = expectedWithoutChurn > 0
                ? parseFloat((lostClientsCalculated / sixMonthAverages.avgTotalTradedClients * 100).toFixed(2))
                : 0;

            const newClientsTarget = branchTargets.reduce(sumTargetReducer('newClientsTarget'), 0);
            const reactivationClientsTarget = branchTargets.reduce(sumTargetReducer('reactivationClientsTarget'), 0);
            const gainedClientsTarget = newClientsTarget + reactivationClientsTarget;
            const totalTradedTarget = branchTargets.reduce(sumTargetReducer('activeClientsGoal'), 0);
            const sixMonthTotalTradedTarget = 0;

            const result: IChurn[] = [
                {
                    particulars: '6 Months Trd Clients',
                    activeClientsAvg: sixMonthAverages.avgTotalTradedClients,
                    target: sixMonthTotalTradedTarget,
                    achieved: Math.round(sixMonthAverages.avgTotalTradedClients * 6),
                },
                {
                    particulars: 'New Clients Traded',
                    activeClientsAvg: sixMonthAverages.avgNewClientsTraded,
                    target: newClientsTarget,
                    achieved: Math.round(totalNewClients),
                },
                {
                    particulars: 'Reactivation & Traded',
                    activeClientsAvg: sixMonthAverages.avgReactivatedClientsTraded,
                    target: reactivationClientsTarget,
                    achieved: Math.round(totalReactivatedClients),
                },
                {
                    particulars: 'Gained Clients (new + react)',
                    activeClientsAvg: sixMonthAverages.avgGainedClients,
                    target: gainedClientsTarget,
                    achieved: Math.round(gainedClientsAchieved),
                },
                {
                    particulars: 'No client should be (W/O Churn)',
                    activeClientsAvg: Math.round(sixMonthAverages.avgTotalTradedClients + sixMonthAverages.avgGainedClients),
                    target: Math.round(sixMonthAverages.avgTotalTradedClients + gainedClientsTarget),
                    achieved: Math.round(expectedWithoutChurn),
                },
                {
                    particulars: 'Total Traded',
                    activeClientsAvg: sixMonthAverages.avgTotalTradedClients,
                    target: totalTradedTarget,
                    achieved: Math.round(totalTradedClients),
                },
                {
                    particulars: 'Lost Clients',
                    activeClientsAvg: Math.round(sixMonthAverages.avgGainedClients),
                    target: 0,
                    achieved: Math.round(lostClientsCalculated),
                },
                {
                    particulars: 'Churn Rate',
                    activeClientsAvg: parseFloat(((sixMonthAverages.avgGainedClients) / (sixMonthAverages.avgTotalTradedClients + sixMonthAverages.avgGainedClients) * 100).toFixed(2)) || 0,
                    target: 0,
                    achieved: churnRateCalculated,
                },
            ];

            return result;
        } catch (error) {
            this.logger.error(`Failed to fetch client stats for branch ${branchIds[0]} and month ${currentMonthKey}: ${error.message}`);
            throw error;
        }
    }


    async getAllBranches(): Promise<any> {
        try {
            return await this.branchRepository.find({
                select: ['id'],
                where: {
                    // model: In([BranchModels.BRANCH, BranchModels.FRANCHISE])
                }
            })

        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }

    async getRegionalManagers(): Promise<any> {
        try {
            return await this.employeeRepository.find({
                select: ['id'],
                where: {
                    designation: Designation.regionalManager
                }
            })

        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }

     async getBranch(): Promise<any> {
        try {

            const query = 'CALL get_branch()'

            const result = await this.branchRepository.query(query);
            return {
                status:'success',
                message: 'success fully data fetch',
                result:result[0]

            }

        } catch (error) {
            this.logger.error(`Failed to fetch subbranch revenue: ${error.message}`);
            throw error;
        }
    }
}
