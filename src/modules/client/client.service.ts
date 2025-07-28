import {
    BadRequestException,
    ConflictException,
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UserService } from '@modules/user/user.service';
import { BranchService } from '@modules/branch/branch.service';
import { Branch } from '@modules/branch/entities/branch.entity';
import { User } from '@modules/user/user.entity';
import { TechexcelService } from '@modules/techexcel/techexcel.service';
import {
    BranchModels,
    COCD_TYPES,
    COCDTypeArr,
    Designation,
    generateUUID,
    orderByKey,
    orderByValue,
    roleIds,
    Roles,
    TRADE_TYPE,
    USER_STATUS
} from 'src/utils/app.utils';
import * as moment from 'moment-timezone';
import { ClientProfitLossEquity } from './entities/client-pl-equity.entity';
import { ClientProfitLossCommodity } from './entities/client-pl-commodity.entity';
import { BankAccount } from '@modules/bank-accounts/entities/bank-account.entity';
import { BulkInsertResult } from 'src/config/report.config';
import { ClientSummary } from './entities/client-summary.entity';
import { ReportService } from '@modules/report/report.service';
import { HoldingsStatement } from '@modules/report/entities/holdings-statement.entity';
import { bulkUpsert } from 'src/utils/sql.utils';
import { UserRole } from '@modules/user-role/entities/user-role.entity';
import { SegmentRevenue } from '@modules/report/entities/segment-revenue.entity';
import { Dealer } from '@modules/employee/entities/dealer.entity';
import { Employee } from '@modules/employee/entities/employee.entity';

interface PLItem {
    Scrip: string;
    ISIN: string;
    BuyQty: number;
    BuyRate: string;
    BuyAmount: string;
    BuyTradeDate?: string;
    TradeType?: TRADE_TYPE;
    SaleQty: number;
    SaleRate: string;
    SaleAmount: string;
    SaleTradeDate?: string;
    Trading: string;
    ShortTerm: string;
    LongTerm: string;
    ClQty: number; // For equity: BuyQty - SaleQty
    ClosingPrice: string;
    Unrealised: string;
    MarketValue: string;
    opQty?: number; // Commodity only
    opRate?: string; // Commodity only
    opAmount?: string; // Commodity only
    netQty?: number; // Commodity only: BuyQty - SaleQty + opQty
    netRate?: string; // Commodity only
    netAmount?: string; // Commodity only
    notional?: string; // Commodity only
}


export interface ClientMappingInput {
    clientId: string;
    equityDealer?: string | null;
    commodityDealer1?: string | null;
    commodityDealer2?: string | null;
    rm?: string | null;
    mappingStatus?: boolean;
    isOnlineClient?: boolean;
}

@Injectable()
export class ClientService {
    private readonly logger = new Logger(ClientService.name);

    constructor(
        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,

        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,

        private readonly dataSource: DataSource,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(Dealer)
        private readonly dealerRepo: Repository<Dealer>,

        @InjectRepository(Employee)
        private readonly employeeRepo: Repository<Employee>,

        @InjectRepository(Branch)
        private readonly branchRepo: Repository<Branch>,

        @InjectRepository(UserRole)
        private readonly userRoleRepo: Repository<UserRole>,

        @Inject(forwardRef(() => BranchService))
        private readonly branchService: BranchService,

        @Inject(forwardRef(() => ReportService))
        private readonly reportService: ReportService,

        @Inject(forwardRef(() => TechexcelService))
        private readonly techexcelService: TechexcelService,

        @InjectRepository(ClientProfitLossEquity)
        private readonly clientPLEquityRepository: Repository<ClientProfitLossEquity>,

        @InjectRepository(ClientProfitLossCommodity)
        private readonly clientPLCommodityRepository: Repository<ClientProfitLossCommodity>,

        @InjectRepository(ClientSummary)
        private readonly clientSummaryRepository: Repository<ClientSummary>
    ) { }

    async create(body: CreateClientDto): Promise<Client> {
        if (!body.branchId) {
            throw new BadRequestException('Branch ID is required');
        }

        const userData = {
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
            company: body.companyId,
            roleId: roleIds.client,
            clientId: null
        };

        const newUser = await this.userService.createUser(userData);
        if (!newUser) {
            throw new InternalServerErrorException('Failed to create user');
        }

        const branch = await this.branchService.findById(body.branchId);
        const clientId = generateUUID('CL', branch.id);

        const client = this.clientRepository.create({
            user: newUser,
            id: clientId,
            panNumber: body.panNumber,
            dpId: body.dpId,
            isOnlineClient: body.online,
            mappingStatus: body.mappingStatus ?? false,
            clientActivationDate: body.clientActivationDate,
            familyGroup: body.familyGroup,
            branch: branch
        });

        const savedClient = await this.clientRepository.save(client);

        // Update the user with the clientId and create UserRole
        newUser.clientId = savedClient.id;
        newUser.client = savedClient;
        await this.userRepo.save(newUser);

        const userRole = this.userRoleRepo.create({
            userId: newUser.id,
            roleId: roleIds.client
        });
        await this.userRoleRepo.upsert(userRole, ['userId']);

        return savedClient;
    }

    async bulkCreate(clientDtos: any[]): Promise<BulkInsertResult<Client>> {
        const total = clientDtos.length;
        const errors: { row: number; entityName: string; error: string }[] = [];
        const createdOrUpdatedClients: Client[] = [];
        const batchSize = 1000;

        Logger.debug(`Starting bulkCreate with ${total} DTOs`);
        if (total === 0) {
            Logger.warn('No clients provided for bulk creation');
            return {
                statusCode: 400,
                message: 'No clients provided',
                data: { total, created: 0, failed: 0, errors: [], createdEntities: [] }
            };
        }

        // Step 1: Validate all DTOs before processing
        // const validationErrors: { row: number; entityName: string; error: string }[] = [];
        // clientDtos.forEach((dto, idx) => {
        //     const row = idx + 1;
        //     if (!dto.clientId) {
        //         validationErrors.push({ row, entityName: 'Client', error: 'Missing clientId' });
        //     }
        //     if (!dto.email) {
        //         validationErrors.push({
        //             row,
        //             entityName: 'User',
        //             error: `Missing email for clientId ${dto.clientId || 'unknown'}`
        //         });
        //     }
        //     if (!dto.clientName) {
        //         validationErrors.push({
        //             row,
        //             entityName: 'User',
        //             error: `Missing clientName (firstName) for clientId ${dto.clientId || 'unknown'}`
        //         });
        //     }
        //     if (!dto.status) {
        //         validationErrors.push({
        //             row,
        //             entityName: 'User',
        //             error: `Missing status for clientId ${dto.clientId || 'unknown'}`
        //         });
        //     }
        // });

        // if (validationErrors.length > 0) {
        //     return {
        //         statusCode: 400,
        //         message: 'Validation failed for some rows',
        //         data: { total, created: 0, failed: total, errors: validationErrors, createdEntities: [] }
        //     };
        // }

        for (let start = 0; start < total; start += batchSize) {
            const batch = clientDtos.slice(start, start + batchSize);
            await this.clientRepository.manager.transaction(async (manager) => {
                const users: DeepPartial<User>[] = [];
                const rawClients: Partial<Client>[] = [];
                const bankAccounts: Partial<BankAccount>[] = [];
                const clientIdsInBatch: string[] = [];

                // Prepare data arrays
                batch.forEach((dto, idx) => {
                    const id = dto.clientId;

                    users.push({
                        email: dto.email,
                        firstName: dto.clientName,
                        phoneNumber: dto.phoneNumber || null,
                        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                        gender: dto.gender || null,
                        addresses: dto.addresses || [],
                        state: dto.stateId || null,
                        city: dto.cityName || null,
                        country: dto.countryId || null,
                        zip: dto.zip,
                        status: dto.status || USER_STATUS.ACTIVE,
                        company: dto.companyId || 1,
                        userType: Roles.client,
                        clientId: id,
                        password: dto.password
                    });

                    rawClients.push({
                        id,
                        regionBranch: { id: dto.regionBranchCode } as Branch,
                        panNumber: dto.panNumber || null,
                        dpId: dto.dpId || null,
                        isOnlineClient: dto.online || false,
                        mappingStatus: dto.mappingStatus || false,
                        clientActivationDate: dto.clientActivationDate ? new Date(dto.clientActivationDate) : null,
                        clientReactivationDate: dto.clientReactivationDate ? new Date(dto.clientReactivationDate) : null,
                        familyGroup: dto.familyGroup || null,
                        branch: { id: dto.branchId } as Branch,
                    });

                    clientIdsInBatch.push(id);

                    if (dto.bankAccountNumber) {
                        bankAccounts.push({
                            accountNumber: dto.bankAccountNumber,
                            client: { id } as Client,
                            accountType: dto.bankAccountType || 'Saving',
                            ifscCode: dto.bankIfscCode || null,
                            bankName: dto.bankName || 'Unknown',
                            active: dto.active !== undefined ? dto.active : true
                        });
                    }
                });

                // Step 2: Upsert users
                const { results: upUsers, errors: userErrs } = await this.bulkUpsertUsers(
                    users,
                    clientIdsInBatch,
                    manager
                );
                userErrs.forEach((e) => errors.push({ row: start + e.row, entityName: 'User', error: e.error }));

                // Step 3: Map user IDs to clients
                const userIdMap = new Map(upUsers.map((u) => [u.clientId, u.id]));
                const validClients: Partial<Client>[] = [];
                const validClientIds = new Set<string>();

                rawClients.forEach((c, idx) => {
                    const userId = userIdMap.get(c.id!);
                    if (userId) {
                        c.user = { id: userId } as User;
                        validClients.push(c);
                        validClientIds.add(c.id!);
                    } else {
                        errors.push({
                            row: start + idx + 1,
                            entityName: 'Client',
                            error: `No user ID found for clientId ${c.id}`
                        });
                    }
                });

                // Step 4: Upsert clients
                let createdClients: Client[] = [];
                if (validClients.length > 0) {
                    const {
                        affected,
                        clients: upsertedClients,
                        errors: clientErrs
                    } = await this.bulkUpsertClients(validClients, manager);
                    clientErrs.forEach((e) => errors.push({ row: -1, entityName: 'ClientBatch', error: e.error }));
                    createdClients = upsertedClients;
                } else {
                    errors.push({
                        row: start + 1,
                        entityName: 'ClientBatch',
                        error: 'No valid clients to upsert'
                    });
                }

                // Step 5: Update users to set the client reference (bidirectional relationship)
                let userUpdates: { id: number; clientId: string }[] = [];
                if (createdClients.length > 0) {
                    userUpdates = createdClients.map((client) => ({
                        id: client.user.id,
                        clientId: client.id
                    }));

                    await bulkUpsert('user', userUpdates, ['id', 'clientId'], ['clientId'], manager, 1000, true);
                } else {
                    Logger.warn('No clients created, skipping user updates');
                }

                // Step 6: Upsert user roles for successfully created clients
                const userRoles: Partial<UserRole>[] = userUpdates.map((update) => ({
                    userId: update.id,
                    roleId: roleIds.client
                }));
                if (userRoles.length > 0) {
                    const { affected, errors: roleErrs } = await this.bulkUpsertUserRoles(userRoles, manager);
                    Logger.debug(`Upserted ${affected} user roles`);
                    roleErrs.forEach((e) => errors.push({ row: -1, entityName: 'UserRoleBatch', error: e.error }));
                } else {
                    Logger.warn('No user roles to upsert in this batch');
                }

                // Step 7: Filter bank accounts by valid client IDs
                const filteredBanks = bankAccounts.filter((b) => validClientIds.has((b.client as Client).id));

                // Step 8: Upsert bank accounts
                if (filteredBanks.length > 0) {
                    const { errors: bankErrs } = await this.bulkUpsertBankAccounts(filteredBanks, manager);
                    bankErrs.forEach((e) => errors.push({ row: -1, entityName: 'BankBatch', error: e.error }));
                }

                // Step 9: Collect created/updated clients
                if (validClientIds.size > 0) {
                    const fetched = await manager
                        .createQueryBuilder(Client, 'c')
                        .select('c.id')
                        .where('c.id IN (:...ids)', { ids: Array.from(validClientIds) })
                        .getMany();
                    createdOrUpdatedClients.push(...fetched);
                }
            });
        }

        const processed = createdOrUpdatedClients.length;
        const failed = total - processed;

        if (processed === 0 && errors.length > 0) {
            return {
                statusCode: 400,
                message: 'All rows failed validation or processing',
                data: { total, created: 0, failed, errors, createdEntities: [] }
            };
        }

        return {
            statusCode: processed === total ? 201 : failed > 0 ? 207 : 400,
            message: `Bulk upsert completed: ${processed} of ${total}`,
            data: { total, created: processed, failed, errors, createdEntities: createdOrUpdatedClients }
        };
    }

    async getClient(body: any): Promise<any> {
        return await this.clientRepository
            .createQueryBuilder('client')
            .leftJoinAndSelect('client.user', 'user')
            .leftJoinAndSelect('user.state', 'state')
            .leftJoinAndSelect('client.bankAccounts', 'bankAccounts')
            .select(['client', 'user', 'state', 'bankAccounts'])
            .where('client.id = :clientId', { clientId: body.clientId })
            .getOne();
    }

    async getClientDetails(body: any): Promise<any> {
        const { clientId } = body;
        try {
            // Fetch bank details
            const bankDetailsResponse = await this.techexcelService.get(
                'ClientBankDetailMultiple/ClientBankDetailMultiple1',
                {
                    Client_id: clientId
                }
            );

            // Fetch client details
            const clientListResponse = await this.techexcelService.getClientMaster(clientId)

            // Validate responses
            if (!bankDetailsResponse?.DATA || !clientListResponse?.DATA) {
                throw new Error('Invalid or empty response from API');
            }

            // Process bank details
            const bankDetails = bankDetailsResponse.DATA.map((bank: any, index: number) => {
                const columns = bankDetailsResponse.COLUMNS;
                const bankData = bank.reduce((acc: any, value: any, i: number) => {
                    acc[columns[i]] = value;
                    return acc;
                }, {});

                return {
                    bankName: bankData.BANK_NAME,
                    accountNumber: bankData.BANK_ACNO,
                    ifscCode: bankData.IFSC_CODE?.trim(),
                    isPrimary: bankData.DEFAULT_AC === 'Yes' ? true : index === 0 // Assume first is primary if DEFAULT_AC is not set
                };
            });

            // Process client details (use the first record for personal info)
            const clientData = clientListResponse.DATA[0];
            const clientColumns = clientListResponse.COLUMNS;
            const client = clientData.reduce((acc: any, value: any, i: number) => {
                acc[clientColumns[i]] = value;
                return acc;
            }, {});

            // Mask sensitive data
            const maskPAN = (pan: string) => (pan ? '*****' + pan.slice(-4) : '');
            const maskPhone = (phone: string) => (phone ? phone.slice(0, 2) + '*****' + phone.slice(-3) : '');

            // Extract active segments
            const activeSegments = clientListResponse.DATA.map((record: any) => {
                const recordObj = record.reduce((acc: any, value: any, i: number) => {
                    acc[clientColumns[i]] = value;
                    return acc;
                }, {});
                return recordObj.COMPANY_CODE;
            }).filter((segment: string) => segment);

            // Format response
            const response = {
                personalInfo: {
                    name: client.FIRST_NAME + ' ' + client.MIDDLE_NAME + ' ' + client.LAST_NAME,
                    clientId: client.CLIENT_ID,
                    phoneNumber: maskPhone(client.MOBILE_NO),
                    emailId: client.CLIENT_ID_MAIL,
                    pan: maskPAN(client.PAN_NO),
                    nomineeName: client.NOMINEE_NAME || '',
                    address: {
                        currentAddress: client.RESI_ADDRESS,
                        permanentAddress: client.REG_ADDR || client.RESI_ADDRESS
                    }
                },
                bankDetails: bankDetails,
                dematDetails: {
                    dpId: client.DP_ID,
                    boId: client.CLIENT_DP_CODE?.slice(-8), // Extract last 8 digits for BO ID
                    dematId: client.CLIENT_DP_CODE,
                    depository: client.DEPOSITORY
                },
                activeSegments: activeSegments
            };

            return response;
        } catch (error) {
            Logger.error(`Error processing client details for ${clientId}`, error);
            throw new Error('Failed to fetch or process client details');
        }
    }

    async clientsPerBranch(req: any): Promise<any> {
        const { branchId, mappingStatus } = req.body;

        try {
            const subBranchIds = await this.getAllSubBranchIds(branchId);
            const clients = await this.clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect('client.user', 'user')
                .leftJoinAndSelect('client.branch', 'branch')
                .leftJoin('employee', 'rmEmp', 'rmEmp.id = client.rm')
                .leftJoin('dealer', 'eqDealer', 'eqDealer.dealerId = client.equity_dealer')
                .leftJoin('dealer', 'comDealer1', 'comDealer1.dealerId = client.commodity_dealer1')
                .leftJoin('dealer', 'comDealer2', 'comDealer2.dealerId = client.commodity_dealer2')
                .leftJoin('employee', 'eqEmp', 'eqEmp.id = eqDealer.employeeId')
                .leftJoin('employee', 'comEmp1', 'comEmp1.id = comDealer1.employeeId')
                .leftJoin('employee', 'comEmp2', 'comEmp2.id = comDealer2.employeeId')
                .leftJoin('user', 'rmUser', 'rmUser.employeeId = rmEmp.id')
                .leftJoin('user', 'eqUser', 'eqUser.employeeId = eqEmp.id')
                .leftJoin('user', 'comUser1', 'comUser1.employeeId = comEmp1.id')
                .leftJoin('user', 'comUser2', 'comUser2.employeeId = comEmp2.id')
                .select([
                    'client.id AS id',
                    'client.clientActivationDate AS activationDate',
                    'user.phoneNumber AS phoneNumber',
                    'user.email AS email',
                    `CONCAT_WS(' ', user.firstName, user.lastName) AS fullName`,
                    'branch.id AS branchId',
                    'client.rm AS rmId',
                    'client.equity_dealer AS equityDealerId',
                    'client.commodity_dealer1 AS commodityDealer1Id',
                    'client.commodity_dealer2 AS commodityDealer2Id',
                    `CONCAT_WS(' ', rmUser.firstName, rmUser.lastName) AS rmName`,
                    `CONCAT_WS(' ', eqUser.firstName, eqUser.lastName) AS equityDealerName`,
                    `CONCAT_WS(' ', comUser1.firstName, comUser1.lastName) AS commodityDealer1Name`,
                    `CONCAT_WS(' ', comUser2.firstName, comUser2.lastName) AS commodityDealer2Name`
                ])
                .where('client.branch_id IN (:...subBranchIds) AND client.mappingStatus = :mappingStatus', {
                    subBranchIds,
                    mappingStatus
                })
                .andWhere(req?.QUERY_STRING?.where || '1=1') // Fallback to avoid empty WHERE clause
                .orderBy(
                    orderByKey({
                        key: req?.QUERY_STRING?.orderBy?.key || 'client.id',
                        repoAlias: 'client'
                    }),
                    orderByValue({ req }) || 'ASC'
                )
                .offset(req?.QUERY_STRING?.skip || 0)
                .limit(req?.QUERY_STRING?.limit || 10)
                .getRawMany();

            const transformedClients = clients.map((client) => ({
                id: client.id,
                fullName: client.fullName,
                phoneNumber: client.phoneNumber,
                email: client.email,
                activationDate: client.activationDate || null,
                branchId: client.branchId || '',
                rm: { id: client.rmId, name: client.rmName || null },
                equityDealer: { id: client.equityDealerId, name: client.equityDealerName || null },
                commodityDealer1: { id: client.commodityDealer1Id, name: client.commodityDealer1Name || null },
                commodityDealer2: { id: client.commodityDealer2Id, name: client.commodityDealer2Name || null }
            }));

            const qb = this.clientRepository
                .createQueryBuilder('client')
                .where('client.branch_id IN (:...subBranchIds) AND client.mappingStatus = :mappingStatus', {
                    subBranchIds,
                    mappingStatus: mappingStatus
                })
                .andWhere(req?.QUERY_STRING?.where)
                .select([]);

            return {
                items: transformedClients,
                qb
            };
        } catch (error) {
            console.error('Error fetching client data:', error.message);
            throw new Error('Failed to retrieve client data');
        }
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

    async getAllClients(req: any): Promise<any> {
        const { branchId } = req.body;

        try {
            const subBranchIds = await this.getAllSubBranchIds(branchId);
            const clients = await this.clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect('client.user', 'user')
                .leftJoinAndSelect('client.branch', 'branch')
                .leftJoinAndSelect('client.bankAccounts', 'bankAccounts')
                .where('client.branch.id IN (:...subBranchIds)', { subBranchIds })
                .andWhere(req?.QUERY_STRING?.where || '1=1')
                .orderBy(
                    orderByKey({
                        key: req?.QUERY_STRING?.orderBy?.key,
                        repoAlias: 'client'
                    }),
                    orderByValue({ req })
                )
                .offset(req?.QUERY_STRING?.skip || 0)
                .limit(req?.QUERY_STRING?.limit || 10)
                .getMany();

            const transformedClients = clients.map((client) => ({
                id: client.user.id,
                client: { id: client.id },
                firstName: client?.user?.firstName,
                lastName: client?.user?.lastName,
                dpId: client?.dpId,
                bankName: client.bankAccounts[0]?.bankName
            }));

            const qb = this.clientRepository
                .createQueryBuilder('client')
                .where('client.branch = :branchId', { branchId })
                .andWhere(req?.QUERY_STRING?.where)
                .select([]);

            return {
                items: transformedClients,
                qb
            };
        } catch (error) {
            console.error('Error fetching client data:', error.message);
            throw new Error('Failed to retrieve client data');
        }
    }

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
                return allBranches.map(branch => branch.id);
            default:
                Logger.warn(`Unsupported designation: ${employee.designation}`);
                return [];
        }
    }

    async getSegmentBrokerage(req: any): Promise<any> {
        const { branchId } = req.body;
        const { genericId } = req.user;

        try {
            const branchRepository = this.dataSource.getRepository(Branch);
            let subBranchIds = [];
            const employee = await this.dataSource.getRepository(Employee).findOne({
                where: { id: genericId },
            });
            if (employee.designation === Designation.superAdmin) {
                const allBranches = await this.dataSource.getRepository(Branch).find({
                    select: ['id'],
                    where: { deletedAt: IsNull() }
                });
                subBranchIds = allBranches.map(branch => branch.id);
            } else {
                subBranchIds = await this.getAllSubBranchIds(branchId);
            }
            const items = await this.clientSummaryRepository
                .createQueryBuilder('clientSummary')
                .where('clientSummary.branchId IN (:...subBranchIds)', { subBranchIds })
                .andWhere(req?.QUERY_STRING?.where)
                .orderBy(
                    orderByKey({
                        key: req?.QUERY_STRING?.orderBy?.key,
                        repoAlias: 'client-summary'
                    }),
                    orderByValue({ req })
                )
                .skip(req?.QUERY_STRING?.skip || 0)
                .take(req?.QUERY_STRING?.limit || 10)
                .getMany();

            // Get control branch mapping in one efficient query
            const uniqueBranchIds = [...new Set(items.map(item => item.branchId))];
            const branchControlMap = await this.dataSource.getRepository(Branch)
                .createQueryBuilder('branch')
                .select(['branch.id', 'controlBranch.id'])
                .leftJoin('branch.controlBranch', 'controlBranch')
                .where('branch.id IN (:...branchIds)', { branchIds: uniqueBranchIds })
                .getRawMany()
                .then(results =>
                    results.reduce((map, row) => {
                        map[row.branch_id] = row.controlBranch_id;
                        return map;
                    }, {} as Record<string, string>)
                );

            // Add control branch ID and serial number to items
            const skip = req?.QUERY_STRING?.skip || 0;
            const enhancedItems = items.map((item, index) => ({
                ...item,
                srNo: skip + index + 1,
                controlBranchId: branchControlMap[item.branchId] || null
            }));

            const qb = this.clientSummaryRepository
                .createQueryBuilder('clientSummary')
                .where('clientSummary.branchId IN (:...subBranchIds)', { subBranchIds })
                .andWhere(req?.QUERY_STRING?.where)
                .select([]);

            return {
                items: enhancedItems,
                qb
            };
        } catch (error) {
            console.error('Error fetching clients summary data:', error.message);
            throw new Error('Failed to retrieve client summary data');
        }
    }

    /**
     * Get all sub-branch IDs including direct and indirect children using proper hierarchy calculation
     */
    private async getAllSubBranchIds(branchId: string): Promise<string[]> {
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

    async findOneByUser(id: number) {
        return await this.clientRepository
            .createQueryBuilder('client')
            .where('client.user = :userId', { userId: id })
            .getOne();
    }

    async updateProfile(body: any) {
        let user = await this.userService.findOneById(body?.id);
        Object.keys(body).forEach((key) => {
            if (![' RUSemail', 'password', 'accessToken', 'refreshToken'].includes(key)) {
                user[key] = body[key];
            }
        });

        await this.userRepo.save(user);

        let client = await this.findOneByUser(user.id);
        if (!client) {
            client = this.clientRepository.create({ user });
            client = await this.clientRepository.save(client);
            user.client = client;
            user.clientId = client.id;
            await this.userRepo.save(user);

            // Create UserRole for the new user
            const userRole = this.userRoleRepo.create({
                userId: user.id,
                roleId: roleIds.client
            });
            await this.userRoleRepo.upsert(userRole, ['userId']);
        }

        return await this.getClientById(client.id);
    }

    async findAll(): Promise<Client[]> {
        return this.clientRepository.find();
    }

    async getClientById(id: string): Promise<Client> {
        const client = await this.clientRepository.findOne({ where: { id } });
        if (!client) throw new NotFoundException('Client not found');
        return client;
    }

    async findOneByUserId(id: number): Promise<any> {
        return await this.clientRepository.createQueryBuilder('client').where('client.user = :id', { id }).getOne();
    }

    async update(id: string, updateClientDto: UpdateClientDto): Promise<Client> {
        const client = await this.clientRepository.findOne({ where: { id } });
        if (!client) {
            throw new Error(`Client with ID ${id} not found.`);
        }

        let branch: Branch | undefined;
        if (updateClientDto.branchId) {
            branch = await this.branchService.findById(updateClientDto.branchId);
            if (!branch) {
                throw new Error(`Branch with ID ${updateClientDto.branchId} not found.`);
            }
        }

        const updatedClient = this.clientRepository.create({
            ...client,
            ...updateClientDto,
            branch: branch ?? client.branch
        });

        return this.clientRepository.save(updatedClient);
    }

    async remove(id: string): Promise<void> {
        const client = await this.getClientById(id);
        await this.clientRepository.remove(client);
    }

    async getClientLedger(req: any): Promise<any> {
        const body = req.body;
        let { skip, limit } = this.validatePaginationParams(req?.QUERY_STRING?.skip, req?.QUERY_STRING?.limit);
        if (!body.id) {
            throw new Error(`Client ID is required.`);
        }

        try {
            const ledgerBody = {
                FromDate: moment(body.fromDate).format('DD/MM/YYYY'),
                ToDate: moment(body.toDate).format('DD/MM/YYYY'),
                Client_code: body.id,
                COCDLIST: COCDTypeArr.join(','),
                ShowMargin: 'Y'
            };

            const { DATA, COLUMNS } = await this.techexcelService.get('Ledger/Ledger1', ledgerBody);

            if (!DATA || DATA.length === 0) {
                return {
                    items: [],
                    qb: {
                        where: {
                            id: body.id,
                            voucherDate: {
                                start: body.fromDate,
                                end: body.toDate
                            },
                            apiParams: ledgerBody
                        },
                        getCount: async () => 0
                    }
                };
            }

            let ledgerEntries = [];
            let balance = 0;

            const indexes = {
                narration: COLUMNS.indexOf('NARRATION'),
                credit: COLUMNS.indexOf('CR_AMT'),
                debit: COLUMNS.indexOf('DR_AMT'),
                cocd: COLUMNS.indexOf('COCD'),
                voucherDate: COLUMNS.indexOf('VOUCHERDATE'),
                voucherType: COLUMNS.indexOf('TRANS_TYPE1'),
                chqNo: COLUMNS.indexOf('CHQNO'),
                billDate: COLUMNS.indexOf('BILL_DATE'),
            };

            for (const row of DATA) {
                const narration = (row[indexes.narration] || '').toString().toLowerCase();
                const creditRaw = row[indexes.credit];
                const debitRaw = row[indexes.debit];
                const credit = parseFloat(creditRaw || 0);
                const debit = parseFloat(debitRaw || 0);

                // Skip rows with empty DR_AMT and CR_AMT unless they are opening balance entries
                const isEmptyAmount = (creditRaw === '' || creditRaw === undefined) && (debitRaw === '' || debitRaw === undefined);
                const isOpeningBalance = narration.includes('opening balance');
                if (isEmptyAmount && !isOpeningBalance) {
                    continue;
                }

                // Check if this is an opening balance row and its own balance is zero
                const openingBalanceDifference = debit - credit;
                if (isOpeningBalance && openingBalanceDifference === 0) {
                    continue;
                }

                // Update cumulative balance
                balance += credit - debit;

                ledgerEntries.push({
                    COCD: row[COLUMNS.indexOf('COCD')],
                    voucherDate: row[COLUMNS.indexOf('VOUCHERDATE')],
                    narration: row[COLUMNS.indexOf('NARRATION')],
                    voucherType: row[COLUMNS.indexOf('TRANS_TYPE1')],
                    chqNo: row[COLUMNS.indexOf('CHQNO')],
                    credit,
                    debit,
                    balance,
                    tradeDate: row[COLUMNS.indexOf('BILL_DATE')],
                    client: { id: body.id }
                });
            }

            const totalCount = ledgerEntries.length;
            const totalPages = Math.ceil(totalCount / limit);
            const pageNumber = Math.floor(skip / limit) + 1;

            return {
                items: ledgerEntries.slice(skip, skip + limit),
                qb: {
                    where: {
                        id: body.id,
                        voucherDate: {
                            start: body.fromDate,
                            end: body.toDate
                        },
                        apiParams: ledgerBody
                    },
                    getCount: async () => totalCount
                },
                pageNumber,
                totalCount,
                totalPages
            };
        } catch (error) {
            console.error('Error fetching client ledger from Techexcel:', error.message);
            throw new Error('Failed to retrieve client ledger data');
        }
    }

    async getClientFASummary(req: any): Promise<any> {
        const { clientId } = req.body;
        if (!clientId) {
            throw new Error(`Client ID is required.`);
        }

        try {
            const client = await this.clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect('client.user', 'user')
                .where('client.id = :clientId', { clientId })
                .getOne();

            if (!client || !client.user) {
                throw new Error(`Client with ID ${clientId} or associated user not found.`);
            }

            const summaryData = await this.techexcelService.get('ClientFASummary/ClientFASummary', {
                ClientId: clientId
            });

            if (!summaryData.DATA || summaryData.DATA.length === 0) {
                throw new Error('No FA summary data found for the client.');
            }

            const { COLUMNS, DATA } = summaryData;

            const summary = {
                clientName: `${client.user.firstName} ${client.user.lastName || ''}`.trim(),
                ledgerBalance: 0,
                dpLedger: {},
                spanMargin: 0,
                collateral: 0,
                fixedDeposit: 0,
                equities: 0,
                portfolioValue: 0,
                marginShortfall: 0,
                totalLedgerBalance: 0,
                ledgerMarginCollateral: 0,
                unconciledCredit: 0,
                pendingReceipt: 0
            };

            for (const row of DATA) {
                const title = row[COLUMNS.indexOf('TITAL')];
                const amount = row[COLUMNS.indexOf('AMOUNT')];
                const value = amount !== '' ? parseFloat(amount) || 0 : 0;

                if (title === 'Ledger') {
                    summary.ledgerBalance = value;
                } else if (title.startsWith('DP Ledger-')) {
                    const dpId = title.split('-')[1];
                    summary.dpLedger[dpId] = value;
                } else if (title === 'Margin') {
                    summary.spanMargin = value;
                } else if (title === 'COLLETRAL') {
                    summary.collateral = value;
                } else if (title === 'FD') {
                    summary.fixedDeposit = value;
                } else if (title === 'Beneficiary') {
                    summary.equities = value;
                } else if (title === 'Net') {
                    summary.portfolioValue = value;
                } else if (title === 'Margin Short/Excess') {
                    summary.marginShortfall = value;
                } else if (title === 'Total Ledger') {
                    summary.totalLedgerBalance = value;
                } else if (title === 'Ledger+Mrg-Coll') {
                    summary.ledgerMarginCollateral = value;
                } else if (title === 'UnConcile Credit') {
                    summary.unconciledCredit = value;
                } else if (title === 'Pending Receipt') {
                    summary.pendingReceipt = value;
                }
            }

            return summary;
        } catch (error) {
            console.error('Error fetching client FA summary from Techexcel:', error.message);
            throw new Error('Failed to retrieve client FA summary data');
        }
    }

    private validatePaginationParams(skip: any, limit: any): { skip: number; limit: number } {
        const parsedSkip = parseInt(skip, 10);
        const parsedLimit = parseInt(limit, 10);
        return {
            skip: isNaN(parsedSkip) || parsedSkip < 0 ? 0 : parsedSkip,
            limit: isNaN(parsedLimit) || parsedLimit <= 0 ? 10 : parsedLimit
        };
    }

    async getClientPLEquity(req: any, isReport?: boolean): Promise<any> {
        const body = req.body;
        if (!body.id) throw new Error('Client ID is required.');

        let { skip, limit } = this.validatePaginationParams(req?.QUERY_STRING?.skip, req?.QUERY_STRING?.limit);
        const currentYear = new Date().getFullYear().toString();
        const isCurrentYear = body.financialYear === currentYear;
        if (isReport) {
            limit = Number.MAX_SAFE_INTEGER;
        }

        try {
            if (isCurrentYear) {
                const plBody = {
                    withExp: '',
                    ToDate: moment().subtract(1, 'days').format('DD/MM/YYYY'),
                    Client_code: body.id
                };

                const plData = await this.techexcelService.get('ANNUAL_PNL_SUMMARY/ANNUAL_PNL_SUMMARY1', plBody);
                if (!plData.DATA || plData.DATA.length === 0) {
                    return {
                        items: {
                            data: [],
                            expenses: [],
                            summary: { totalPL: 0, totalShortTerm: 0, totalLongTerm: 0, totalUnrealized: 0, totalEquity: 0 },
                        },
                        qb: { where: plBody, getCount: async () => 0 }
                    };
                }

                const { COLUMNS, DATA } = plData;
                const items: PLItem[] = [];
                const expenses: { Particulars: string; Total: string }[] = [];

                DATA.forEach((row) => {
                    const trType = row[COLUMNS.indexOf('TR_TYPE')] || '';
                    if (trType === TRADE_TYPE.EXPENSES) {
                        expenses.push({
                            Particulars: (row[COLUMNS.indexOf('SCRIP_SYMBOL1')] || '-').toUpperCase(),
                            Total: Number(row[COLUMNS.indexOf('NET_AMOUNT')] || 0).toFixed(2)
                        });
                        return;
                    }

                    const buyQty = Number(row[COLUMNS.indexOf('BUY_QTY')] || 0);
                    const buyAmount = Number(row[COLUMNS.indexOf('BUY_AMT')] || 0);
                    const saleQty = Number(row[COLUMNS.indexOf('SALE_QTY')] || 0);
                    const saleAmount = Number(row[COLUMNS.indexOf('SALE_AMT')] || 0);
                    const clQty = buyQty - saleQty;
                    const closingPrice = Number(row[COLUMNS.indexOf('CLOSING_PRICE')] || 0);
                    const unrealised = Number(row[COLUMNS.indexOf('PL_AMT')] || 0).toFixed(2);

                    items.push({
                        Scrip: row[COLUMNS.indexOf('SCRIP_NAME')] || '-',
                        ISIN: row[COLUMNS.indexOf('ISIN')] || '-',
                        BuyQty: buyQty,
                        TradeType: trType,
                        BuyRate: Number(row[COLUMNS.indexOf('BUY_RATE')] || 0).toFixed(2),
                        BuyAmount: buyAmount.toFixed(2),
                        BuyTradeDate: '-',
                        SaleTradeDate: '-',
                        SaleQty: saleQty,
                        SaleRate: Number(row[COLUMNS.indexOf('SALE_RATE')] || 0).toFixed(2),
                        SaleAmount: saleAmount.toFixed(2),
                        Trading: Number(row[COLUMNS.indexOf('SPECULATION')] || 0).toFixed(2),
                        ShortTerm: Number(row[COLUMNS.indexOf('SHORT_TERM')] || 0).toFixed(2),
                        LongTerm: Number(row[COLUMNS.indexOf('LONG_TERM')] || 0).toFixed(2),
                        ClQty: clQty,
                        ClosingPrice: closingPrice.toFixed(2),
                        Unrealised: unrealised,
                        MarketValue: (clQty * closingPrice).toFixed(2)
                    });
                });

                const summary = items.reduce(
                    (acc, item) => {
                        acc.totalPL += Number(item.Trading);
                        acc.totalShortTerm += Number(item.ShortTerm);
                        acc.totalLongTerm += Number(item.LongTerm);
                        acc.totalUnrealized += Number(item.Unrealised);
                        acc.totalEquity += Number(item.MarketValue || 0);
                        return acc;
                    },
                    { totalPL: 0, totalShortTerm: 0, totalLongTerm: 0, totalUnrealized: 0, totalEquity: 0 }
                );

                return {
                    items: { data: items.slice(skip, skip + limit), expenses, summary },
                    qb: {
                        where: { id: body.id, financialYear: body.financialYear, apiParams: plBody },
                        getCount: async () => items.length
                    }
                };
            } else {
                const items = await this.clientPLEquityRepository
                    .createQueryBuilder('PL')
                    .where('PL.clientId = :id', { id: body.id })
                    .andWhere(req?.QUERY_STRING?.where || '1=1')
                    .andWhere('PL.financialYear = :financialYear', { financialYear: body.financialYear })
                    .orderBy('PL.scripName', 'ASC')
                    .skip(skip)
                    .take(limit)
                    .getMany();

                const allItems = await this.clientPLEquityRepository
                    .createQueryBuilder('PL')
                    .where('PL.clientId = :id', { id: body.id })
                    .andWhere(req?.QUERY_STRING?.where || '1=1')
                    .andWhere('PL.financialYear = :financialYear', { financialYear: body.financialYear })
                    .getMany();

                const expenses = allItems
                    .filter((pl) => pl.tradeType === 'EXPENSES')
                    .map((pl) => ({
                        Particulars: (pl.scripName || '-').toUpperCase(),
                        Total: Number(-pl.buyAmount || 0).toFixed(2)
                    }));

                const data = items
                    .filter((pl) => pl.tradeType !== 'EXPENSES')
                    .map((pl) => {
                        const buyQty = Number(pl.buyQuantity) || 0;
                        const buyAmount = Number(pl.buyAmount) || 0;
                        const saleQty = Number(pl.saleQuantity) || 0;
                        const saleAmount = Number(pl.saleAmount) || 0;
                        const clQty = buyQty - saleQty;
                        const closingPrice = Number(pl.closingPrice) || 0;
                        const unrealised = Number(pl.plAmount || 0).toFixed(2);

                        return {
                            Scrip: pl.scripName || '-',
                            ISIN: pl.isin || '-',
                            BuyQty: buyQty,
                            BuyRate: Number(pl.buyRate || 0).toFixed(2),
                            TradeType: pl.tradeType,
                            BuyAmount: buyAmount.toFixed(2),
                            BuyTradeDate: pl.buyTradeDate,
                            SaleQty: saleQty,
                            SaleRate: Number(pl.saleRate || 0).toFixed(2),
                            SaleAmount: saleAmount.toFixed(2),
                            SaleTradeDate: pl.saleTradeDate,
                            Trading: Number(pl.trading || 0).toFixed(2),
                            ShortTerm: Number(pl.shortTerm || 0).toFixed(2),
                            LongTerm: Number(pl.longTerm || 0).toFixed(2),
                            ClQty: clQty,
                            ClosingPrice: closingPrice.toFixed(2),
                            Unrealised: unrealised,
                            MarketValue: (clQty * closingPrice).toFixed(2)
                        };
                    });

                const summary = allItems
                    .filter((pl) => pl.tradeType !== 'EXPENSES')
                    .reduce(
                        (acc, pl) => {
                            const clQty = Number(pl.buyQuantity - pl.saleQuantity) || 0;
                            const closingPrice = Number(pl.closingPrice) || 0;
                            acc.totalPL += Number(pl.trading) || 0;
                            acc.totalShortTerm += Number(pl.shortTerm) || 0;
                            acc.totalLongTerm += Number(pl.longTerm) || 0;
                            acc.totalUnrealized += Number(pl.plAmount);
                            acc.totalEquity += clQty > 0 ? closingPrice * clQty : 0;
                            return acc;
                        },
                        { totalPL: 0, totalShortTerm: 0, totalLongTerm: 0, totalUnrealized: 0, totalEquity: 0 }
                    );

                return {
                    items: { data, expenses, summary },
                    qb: this.clientPLEquityRepository
                        .createQueryBuilder('PL')
                        .where('PL.clientId = :id', { id: body.id })
                        .andWhere(req?.QUERY_STRING?.where || '1=1')
                        .andWhere('PL.financialYear = :financialYear', { financialYear: body.financialYear })
                        .select([])
                };
            }
        } catch (error) {
            console.error('Error fetching client equity PL:', error.message);
            throw new Error('Failed to retrieve client equity PL data');
        }
    }

    async getClientPLCommodity(req: any, isReport?: boolean): Promise<any> {
        const body = req.body;
        const financialYear = body.financialYear;
        let { skip, limit } = this.validatePaginationParams(req?.QUERY_STRING?.skip, req?.QUERY_STRING?.limit);
        const currentYear = new Date().getFullYear().toString();

        if (!body.id) throw new Error('Client ID is required.');
        if (isReport) {
            limit = Number.MAX_SAFE_INTEGER;
        }

        try {
            if (financialYear === currentYear) {
                const plBody = {
                    FROM_DATE: moment().startOf('year').format('DD/MM/YYYY'),
                    TO_DATE: moment().subtract(1, 'days').format('DD/MM/YYYY'),
                    client_code: body.id,
                    COMPANY_CODE: 'MCX',
                };

                const plData = await this.techexcelService.get('Reports2/R44', plBody);
                if (!plData.DATA || plData.DATA.length === 0) {
                    return {
                        items: {
                            data: [],
                            expenses: [],
                            summary: {
                                totalPL: 0,
                                totalShortTerm: 0,
                                totalLongTerm: 0,
                                totalUnrealized: 0,
                                totalEquity: 0,
                                totalCurrentValue: 0,
                                totalNetAmount: 0,
                                totalNotional: 0,
                            },
                        },
                        qb: { where: plBody, getCount: async () => 0 },
                    };
                }

                const { COLUMNS, DATA } = plData;
                const derivatives: PLItem[] = [];
                const expenseMap: { [key: string]: number } = {}; // Map to aggregate expenses

                DATA.forEach((row) => {
                    const scripSymbol = row[COLUMNS.indexOf('SCRIP_SYMBOL')] || '';
                    if (scripSymbol.startsWith('*')) {
                        const particular = scripSymbol.replace(/^\*|\*$/g, '').trim().toUpperCase();
                        const amount = Number(row[COLUMNS.indexOf('NETAMT')] || 0);
                        expenseMap[particular] = (expenseMap[particular] || 0) + amount; // Aggregate by particular
                        return;
                    }

                    const buyQty = Number(row[COLUMNS.indexOf('BUYQTY')] || 0);
                    const buyRate = row[COLUMNS.indexOf('BUYRATE')];
                    const saleRate = row[COLUMNS.indexOf('SALERATE')];
                    const netRate = row[COLUMNS.indexOf('NETRATE')];
                    const opRate = row[COLUMNS.indexOf('OPRATE')];
                    const buyAmount = Number(row[COLUMNS.indexOf('BUYAMT')] || 0);
                    const saleQty = Number(row[COLUMNS.indexOf('SALEQTY')] || 0);
                    const saleAmount = Number(row[COLUMNS.indexOf('SALEAMT')] || 0);
                    const opQty = Number(row[COLUMNS.indexOf('OPQTY')] || 0);
                    const opAmount = Number(row[COLUMNS.indexOf('OPAMT')] || 0);
                    const netQty = Number(row[COLUMNS.indexOf('NETQTY')] || 0);
                    const closingPrice = Number(row[COLUMNS.indexOf('CL_PRICE')] || 0);
                    const clAmt = Number(row[COLUMNS.indexOf('CL_AMT')] || 0);
                    const unrealised = Number(row[COLUMNS.indexOf('NOTIONAL_NET')] || 0);
                    const netAmount = Number(row[COLUMNS.indexOf('NETAMT')] || 0);

                    derivatives.push({
                        Scrip: row[COLUMNS.indexOf('FULL_SCRIP_SYMBOL')] || '-',
                        ISIN: '-',
                        BuyQty: buyQty,
                        BuyRate: buyRate,
                        BuyAmount: buyAmount.toFixed(2),
                        SaleQty: saleQty,
                        SaleRate: saleRate,
                        SaleAmount: saleAmount.toFixed(2),
                        Trading: Number(row[COLUMNS.indexOf('PL_AMT')] || 0).toFixed(2),
                        ShortTerm: '0.00',
                        LongTerm: '0.00',
                        ClQty: netQty,
                        ClosingPrice: closingPrice.toFixed(2),
                        Unrealised: unrealised.toFixed(2),
                        MarketValue: (netQty * closingPrice).toFixed(2),
                        opQty: opQty,
                        opRate: opRate,
                        opAmount: opAmount.toFixed(2),
                        netQty: netQty,
                        netRate: netRate,
                        netAmount: netAmount.toFixed(2),
                        notional: unrealised.toFixed(2),
                    });
                });

                // Convert expenseMap to expenses array
                const expenses = Object.entries(expenseMap).map(([particular, total]) => ({
                    Particulars: particular,
                    Total: total.toFixed(2),
                }));

                const summary = derivatives.reduce(
                    (acc, item) => {
                        const trading = Number(item.Trading) || 0;
                        const unrealised = Number(item.Unrealised) || 0;
                        const marketValue = Number(item.MarketValue) || 0;
                        const netAmount = Number(item.netAmount) || 0;

                        acc.totalPL += trading;
                        acc.totalUnrealized += unrealised;
                        acc.totalEquity += marketValue;
                        acc.totalCurrentValue += marketValue; // Current value of open positions
                        acc.totalNetAmount += netAmount; // Total net amount of transactions
                        acc.totalNotional += Number(item.notional) || 0; // Notional value from unrealized

                        return acc;
                    },
                    {
                        totalPL: 0,
                        totalShortTerm: 0,
                        totalLongTerm: 0,
                        totalUnrealized: 0,
                        totalEquity: 0,
                        totalCurrentValue: 0,
                        totalNetAmount: 0,
                        totalNotional: 0,
                    }
                );

                return {
                    items: {
                        data: derivatives.slice(skip, skip + limit),
                        expenses,
                        summary,
                    },
                    qb: { where: plBody, getCount: async () => derivatives.length },
                };
            } else {
                const allItems = await this.clientPLCommodityRepository
                    .createQueryBuilder('PL')
                    .where('PL.clientId = :id', { id: body.id })
                    .andWhere(req?.QUERY_STRING?.where || '1=1')
                    .andWhere('PL.financialYear = :financialYear', { financialYear })
                    .getMany();

                const expenseMap: { [key: string]: number } = {}; // Map to aggregate expenses
                const derivatives: PLItem[] = [];
                const summary = {
                    totalPL: 0,
                    totalShortTerm: 0,
                    totalLongTerm: 0,
                    totalUnrealized: 0,
                    totalEquity: 0,
                    totalCurrentValue: 0,
                    totalNetAmount: 0,
                    totalNotional: 0,
                };

                for (const pl of allItems) {
                    const scripName = pl.scripName || '';
                    const isExpense = !/\d$/.test(scripName) || scripName.startsWith('*');

                    if (isExpense) {
                        const particular = scripName.replace(/^\*|\*$/g, '').trim().toUpperCase();
                        const amount = Number(-pl.buyAmount || 0);
                        expenseMap[particular] = (expenseMap[particular] || 0) + amount; // Aggregate by particular
                        continue;
                    }

                    const buyQty = Number(pl.buyQuantity) || 0;
                    const buyAmount = Number(pl.buyAmount) || 0;
                    const saleQty = Number(pl.saleQuantity) || 0;
                    const saleAmount = Number(pl.saleAmount) || 0;
                    const opQty = Number(pl.opQuantity) || 0;
                    const opAmount = Number(pl.opAmount) || 0;
                    const netQty = buyQty - saleQty + opQty;
                    const closingPrice = Number(pl.closingPrice) || 0;
                    const unrealised = Number(pl.notional || 0);
                    const netAmount = buyAmount - saleAmount + opAmount;

                    derivatives.push({
                        Scrip: scripName,
                        ISIN: pl.isin || '-',
                        BuyQty: buyQty,
                        BuyRate: buyQty > 0 ? (buyAmount / buyQty).toFixed(2) : '0.00',
                        BuyAmount: buyAmount.toFixed(2),
                        SaleQty: saleQty,
                        SaleRate: saleQty > 0 ? (saleAmount / saleQty).toFixed(2) : '0.00',
                        SaleAmount: saleAmount.toFixed(2),
                        Trading: Number(pl.plAmount || 0).toFixed(2),
                        ShortTerm: '0.00',
                        LongTerm: '0.00',
                        ClQty: netQty,
                        ClosingPrice: closingPrice.toFixed(2),
                        Unrealised: unrealised.toFixed(2),
                        MarketValue: (netQty * closingPrice).toFixed(2),
                        opQty,
                        opRate: opQty > 0 ? (opAmount / opQty).toFixed(2) : '0.00',
                        opAmount: opAmount.toFixed(2),
                        netQty,
                        netRate: netQty !== 0 ? (netAmount / netQty).toFixed(2) : '0.00',
                        netAmount: netAmount.toFixed(2),
                        notional: Number(pl.notional || 0).toFixed(2),
                    });

                    summary.totalPL += Number(pl.plAmount || 0);
                    summary.totalUnrealized += unrealised;
                    summary.totalEquity += netQty > 0 ? netQty * closingPrice : 0;
                    summary.totalCurrentValue += netQty > 0 ? netQty * closingPrice : 0;
                    summary.totalNetAmount += netAmount;
                    summary.totalNotional += Number(pl.notional || 0);
                }

                // Convert expenseMap to expenses array
                const expenses = Object.entries(expenseMap).map(([particular, total]) => ({
                    Particulars: particular,
                    Total: total.toFixed(2),
                }));

                return {
                    items: {
                        data: derivatives.slice(skip, skip + limit),
                        expenses,
                        summary,
                    },
                    qb: this.clientPLCommodityRepository
                        .createQueryBuilder('PL')
                        .where('PL.clientId = :id', { id: body.id })
                        .andWhere(req?.QUERY_STRING?.where || '1=1')
                        .andWhere('PL.financialYear = :financialYear', { financialYear })
                        .select([]),
                };
            }
        } catch (error) {
            console.error('Error fetching client commodity PL:', error.message);
            throw new Error('Failed to retrieve client commodity PL data');
        }
    }

    async getAnnualClientPLReport(req: any): Promise<{
        summary: Array<{ Particulars: string; Equity: number; Derivatives: number }>;
        equity: { assets: PLItem[]; trading: PLItem[]; shortTerm: PLItem[]; longTerm: PLItem[] };
        derivatives: { data: PLItem[] };
        equityExpenses: Array<{ Particulars: string; Total: number }>;
        derivativesExpenses: Array<{ Particulars: string; Total: number }>;
        clientDetails: { code: string; name: string; email: string; phoneNumber: string; address: string };
        companyDetails: {
            name: string;
            address: string;
            phoneNumber: string;
            website: string;
            email: string;
            pin: string;
            regnNo: { sebi: string; nsdl: string; cdsl: string };
        };
    }> {
        const { id } = req.body;
        if (!id) throw new Error('Client ID is required.');

        try {
            // Fetch client and company details
            const client = await Client.findOne({
                where: { id },
                relations: ['user', 'branch', 'user.company']
            });
            if (!client) throw new Error('Client not found.');
            const user = client.user;
            const company = user.company;

            // Fetch equity & commodity in parallel
            const [equityResult, commodityResult] = await Promise.all([
                this.getClientPLEquity(req, true).catch((err) => {
                    throw new Error(`Equity PL fetch failed: ${err.message}`);
                }),
                this.getClientPLCommodity(req, true).catch((err) => {
                    throw new Error(`Commodity PL fetch failed: ${err.message}`);
                })
            ]);

            // Prepare response
            const response = {
                summary: [] as Array<{ Particulars: string; Equity: number; Derivatives: number }>,
                equity: {
                    assets: [] as PLItem[],
                    trading: [] as PLItem[],
                    shortTerm: [] as PLItem[],
                    longTerm: [] as PLItem[]
                },
                derivatives: { data: [] as PLItem[] },
                equityExpenses: [] as Array<{ Particulars: string; Total: number }>,
                derivativesExpenses: [] as Array<{ Particulars: string; Total: number }>,
                clientDetails: {
                    code: client.id,
                    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
                    email: user.email || '-',
                    phoneNumber: user.phoneNumber || '-',
                    address: user.addresses?.join(', ') || client.branch?.address || '-'
                },
                companyDetails: {
                    name: company.companyName || '-',
                    address: company.address || '-',
                    phoneNumber: company.phoneNumber || '-',
                    website: company.practiceWebsite || '-',
                    email: company.email || '-',
                    regnNo: { sebi: company.sebiRegnNo, nsdl: company.nsdlRegnNo, cdsl: company.cdslRegnNo },
                    pin: company.zip || '-'
                }
            };

            // Split equity items
            const equityItems: PLItem[] = equityResult.items.data || [];
            const equityExpenses = equityResult.items.expenses || [];
            response.equity.assets = equityItems.filter((i) =>
                [TRADE_TYPE.OP_ASSETS, TRADE_TYPE.ASSETS].includes(i.TradeType)
            );
            response.equity.trading = equityItems.filter((i) => i.TradeType === TRADE_TYPE.TRADING);
            response.equity.shortTerm = equityItems.filter((i) => i.TradeType === TRADE_TYPE.SHORTTERM);
            response.equity.longTerm = equityItems.filter((i) => i.TradeType === TRADE_TYPE.LONGTERM);

            // Split commodity items
            const commodityItems: PLItem[] = commodityResult.items.data || [];
            const commodityExpenses = commodityResult.items.expenses || [];
            response.derivatives.data = commodityItems;

            // Assign separated expenses to response
            response.equityExpenses = equityExpenses;
            response.derivativesExpenses = commodityExpenses;

            // Helper to sum a numeric field
            const sumField = (arr: PLItem[], field: keyof PLItem) =>
                arr.reduce((s, i) => s + (Number(i[field]) || 0), 0);

            // Compute subtotals
            let equityShort = sumField(response.equity.shortTerm, 'ShortTerm');
            let equityLong = sumField(response.equity.longTerm, 'LongTerm');
            let equityTrade = sumField(response.equity.trading, 'Trading');
            let equityUnreal = sumField(response.equity.assets, 'Unrealised');
            let equityExpense = equityExpenses.reduce((s, e) => s + Number(e.Total), 0);

            let derivTrade = sumField(commodityItems, 'Trading');
            let derivUnreal = sumField(commodityItems, 'Unrealised');
            let derivExpense = commodityExpenses.reduce((s, e) => s + Number(e.Total), 0);

            // Clamp invalid values
            [equityShort, equityLong, equityTrade, equityUnreal, equityExpense, derivTrade, derivUnreal, derivExpense] =
                [equityShort, equityLong, equityTrade, equityUnreal, equityExpense, derivTrade, derivUnreal, derivExpense].map(
                    (v) => (Number.isFinite(v) ? v : 0)
                );


            // Build summary
            response.summary = [
                { Particulars: 'SHORTTERM', Equity: +equityShort.toFixed(2), Derivatives: 0 },
                { Particulars: 'LONGTERM', Equity: +equityLong.toFixed(2), Derivatives: 0 },
                { Particulars: 'TRADING', Equity: +equityTrade.toFixed(2), Derivatives: +derivTrade.toFixed(2) },
                { Particulars: 'EXPENSES', Equity: +equityExpense.toFixed(2), Derivatives: +derivExpense.toFixed(2) },
                { Particulars: 'UNREALISED', Equity: +equityUnreal.toFixed(2), Derivatives: +derivUnreal.toFixed(2) },
            ];

            return response;
        } catch (err: any) {
            console.error('Error fetching client P&L:', err);
            throw new Error(`Failed to retrieve client P&L data: ${err.message}`);
        }
    }

    async updateClientMapping(reqBody: any): Promise<any> {
        try {

            const client = await this.clientRepository.findOne({
                where: { id: reqBody.id }
            });

            if (!client) {
                throw new BadRequestException('Client not found');
            }

            const params = [
                reqBody.id,
                reqBody.rm === '' || reqBody.rm === 'null' ? null : reqBody.rm,
                reqBody.equityDealer === '' || reqBody.equityDealer === 'null' ? null : reqBody.equityDealer,
                reqBody.commodityDealer1 === '' || reqBody.commodityDealer1 === 'null'
                    ? null
                    : reqBody.commodityDealer1,
                reqBody.commodityDealer2 === '' || reqBody.commodityDealer2 === 'null'
                    ? null
                    : reqBody.commodityDealer2,
                reqBody.isOnlineClient
            ];

            const query = 'CALL mapping_clientDealer(?, ?, ?, ?, ?, ?)';
            const result = await this.clientRepository.query(query, params);

            const finalResult = result[0]?.[0];
            if (!finalResult) {
                throw new InternalServerErrorException('No valid response from stored procedure');
            }

            if (finalResult.RESCODE !== 1 && finalResult.RESCODE !== '1') {
                throw new InternalServerErrorException(finalResult.RESMSZ || 'Error in client dealers mapping');
            }

            return finalResult;
        } catch (error) {
            console.error('updateClientMapping error:', error);
            throw error;
        }
    }

    async getClientMappingById(id: string): Promise<any> {
        const client = await this.clientRepository
            .createQueryBuilder('client')
            .select([
                'client.id AS id',
                'client.rm AS rm',
                'client.equity_dealer AS equityDealer',
                'client.commodity_dealer1 AS commodityDealer1',
                'client.commodity_dealer2 AS commodityDealer2',
                'client.is_online_client AS isOnlineClient'
            ])
            .where('client.id = :id', { id })
            .getRawOne();

        if (!client) {
            throw new BadRequestException('Client not found');
        }

        const data = {
            id: client.id,
            rm: String(client.rm),
            isOnlineClient: client.isOnlineClient,
            equityDealer: String(client.equityDealer),
            commodityDealer1: String(client.commodityDealer1),
            commodityDealer2: String(client.commodityDealer2),
        };

        return data;
    }

    async updateNotTradedDays(): Promise<void> {
        await this.dataSource.transaction(async (manager) => {
            // Step 1: Get the latest trade date
            const latestTradeDateResult = await manager
                .createQueryBuilder(SegmentRevenue, 'sr')
                .select('MAX(DATE(sr.tradeDate))', 'max')
                .getRawOne();

            const latestTradeDate: string = latestTradeDateResult?.max;

            if (!latestTradeDate) {
                Logger.warn('No trade data available. Skipping notTradedDays update.');
                return;
            }

            // Step 2: Increment notTradedDays for all active clients
            await manager.query(`
                UPDATE client 
                SET notTradedDays = COALESCE(notTradedDays, 0) + 1 
                WHERE deletedAt IS NULL
            `);

            // Step 3: Reset notTradedDays for clients who traded on the latest trade date
            const tradedClients = await manager
                .createQueryBuilder(SegmentRevenue, 'sr')
                .select('DISTINCT sr.clientId', 'clientId')
                .where('DATE(sr.tradeDate) = :latestTradeDate', { latestTradeDate })
                .getRawMany();

            const tradedClientIds = tradedClients.map((row) => row.clientId);

            if (tradedClientIds.length > 0) {
                await manager
                    .createQueryBuilder()
                    .update(Client)
                    .set({ notTradedDays: 0 })
                    .whereInIds(tradedClientIds)
                    .andWhere('deletedAt IS NULL')
                    .execute();
            }

            Logger.log(`notTradedDays updated successfully for ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
        });
    }

    async clientsNotTraded(req: any): Promise<any> {
        const { branchId } = req.body
        try {
            const users = await this.userRepo
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.client', 'client')
                .leftJoinAndSelect('client.branch', 'branch')
                .where('client.branch = :branchId', { branchId })
                .andWhere('client.notTradedDays != 0')
                .andWhere(req?.QUERY_STRING?.where)
                .orderBy(
                    orderByKey({
                        key: req?.QUERY_STRING?.orderBy?.key,
                        repoAlias: 'client'
                    }),
                    orderByValue({ req })
                )
                .offset(req?.QUERY_STRING?.skip || 0)
                .limit(req?.QUERY_STRING?.limit || 10)
                .getMany();


            const qb = await this.userRepo.createQueryBuilder('user').leftJoinAndSelect('user.client', 'client').where('client.notTradedDays != 0')
                .andWhere('client.notTradedDays != 0')
                .andWhere('client.branch = :branchId', { branchId })
                .andWhere(req?.QUERY_STRING?.where).select([])

            const data = users.map((user) => ({
                id: user.client.id,
                name: user.firstName,
                branchId: user.client.branch.id,
                phoneNumber: user.phoneNumber,
                clientActivationDate: user.client.clientActivationDate,
                notTradedDays: user.client.notTradedDays
            }));

            return {
                items: data,
                qb
            };
        } catch (error) {
            console.error('Error fetching new clients not traded:', error.message);
            throw new Error('Failed to retrieve data');
        }
    }

    async getClientHoldings(req: any): Promise<any> {
        const { clientId, holdingType, isReport = false } = req.body || {};

        if (!clientId) {
            throw new Error('clientId is required');
        }

        try {
            const holdingsRepository: Repository<HoldingsStatement> = this.dataSource.getRepository(HoldingsStatement);

            // Fetch all holdings for summary stats (without pagination)
            const summaryQuery = holdingsRepository
                .createQueryBuilder('holdings')
                .where('holdings.clientId = :id', { id: clientId })
                .andWhere('holdings.quantity > 0');

            const allHoldings = await summaryQuery.getMany();

            // Calculate summary statistics
            let profitAndLoss = 0;
            let totalEquity = 0;
            let mutualFunds = 0;
            let invested = 0;

            allHoldings.forEach((holding) => {
                const buyAvg = parseFloat(holding.buyAvg as any) || 0;
                const ltp = parseFloat(holding.previousClosing as any) || 0;
                const quantity = holding.quantity || 0;

                const marketValue = quantity * ltp;
                const buyValue = quantity * buyAvg;
                const pl = marketValue - buyValue;

                profitAndLoss += pl;
                invested += buyValue;

                if (holding.isinCode.startsWith('INE')) {
                    totalEquity += 1;
                } else if (holding.isinCode.startsWith('INF')) {
                    mutualFunds += 1;
                }
            });

            const summary = {
                profitAndLoss: Number(profitAndLoss.toFixed(2)),
                totalEquity,
                mutualFunds,
                invested: Number(invested.toFixed(2))
            };

            const query = holdingsRepository
                .createQueryBuilder('holdings')
                .where('holdings.clientId = :id', { id: clientId })
                .andWhere('holdings.quantity > 0');

            if (holdingType) {
                if (holdingType === 'equity') {
                    query.andWhere('holdings.isinCode LIKE :prefix', { prefix: 'INE%' });
                } else if (holdingType === 'mutual_fund') {
                    query.andWhere('holdings.isinCode LIKE :prefix', { prefix: 'INF%' });
                }
            }

            if (req?.QUERY_STRING?.where) {
                query.andWhere(req.QUERY_STRING.where);
            }

            query.orderBy(
                orderByKey({
                    key: req?.QUERY_STRING?.orderBy?.key,
                    repoAlias: 'holdings'
                }),
                orderByValue({ req })
            );

            query
                .skip(isReport ? 0 : req?.QUERY_STRING?.skip || 0)
                .take(isReport ? Number.MAX_SAFE_INTEGER : req?.QUERY_STRING?.limit || 10);

            const holdingsData = await query.getMany();

            const items = holdingsData.map((holding) => {
                const buyAvg = parseFloat(holding.buyAvg as any) || 0;
                const ltp = parseFloat(holding.previousClosing as any) || 0;
                const quantity = holding.quantity || 0;

                const marketValue = quantity * ltp;
                const buyValue = quantity * buyAvg;
                const changePercent = buyAvg ? ((ltp - buyAvg) / buyAvg) * 100 : 0;
                const pl = marketValue - buyValue;

                if (holding.isinCode.startsWith('INF')) {
                    return {
                        schemeName: holding.scripName,
                        units: quantity,
                        nav: Number(ltp.toFixed(2)),
                        change: Number(changePercent.toFixed(2)),
                        marketValue: Number(marketValue.toFixed(2)),
                        pAndL: Number(pl.toFixed(2)),
                        isinCode: holding.isinCode,
                        holdingType: 'mutual_fund'
                    };
                } else {
                    return {
                        scripName: holding.scripName,
                        qty: quantity,
                        buyPrice: Number(buyAvg.toFixed(2)),
                        ltp: Number(ltp.toFixed(2)),
                        change: Number(changePercent.toFixed(2)),
                        marketValue: Number(marketValue.toFixed(2)),
                        pAndL: Number(pl.toFixed(2)),
                        isinCode: holding.isinCode,
                        holdingType: 'equity'
                    };
                }
            });

            const qb = holdingsRepository
                .createQueryBuilder('holdings')
                .where('holdings.clientId = :id', { id: clientId })
                .andWhere('holdings.quantity > 0');

            if (holdingType) {
                if (holdingType === 'equity') {
                    qb.andWhere('holdings.isinCode LIKE :prefix', { prefix: 'INE%' });
                } else if (holdingType === 'mutual_fund') {
                    qb.andWhere('holdings.isinCode LIKE :prefix', { prefix: 'INF%' });
                }
            }

            if (req?.QUERY_STRING?.where) {
                qb.andWhere(req.QUERY_STRING.where);
            }

            return {
                items: {
                    data: items,
                    summary
                },
                qb
            };
        } catch (error) {
            console.error('Error fetching client Holdings:', error.message);
            throw new Error('Failed to retrieve client Holdings');
        }
    }

    async bulkUpsertClients(
        clients: Partial<Client>[],
        manager: EntityManager
    ): Promise<{ affected: number; clients: Client[]; errors: { batch: number; error: string }[] }> {
        const values: any = clients.map((c) => ({
            id: c.id!,
            user_id: c.user?.id || null,
            panNumber: c.panNumber || null,
            dpId: c.dpId || null,
            is_online_client: c.isOnlineClient || false,
            mappingStatus: c.mappingStatus || false,
            clientActivationDate: c.clientActivationDate
                ? new Date(c.clientActivationDate).toISOString().split('T')[0]
                : null,
            clientReactivationDate: c.clientReactivationDate
                ? new Date(c.clientReactivationDate).toISOString().split('T')[0]
                : null,
            familyGroup: c.familyGroup || null,
            branch_id: c.branch?.id!,
            region_branch_id: c.regionBranch?.id || null,
        }));

        try {
            const result = await bulkUpsert(
                'client',
                values,
                [
                    'id',
                    'user_id',
                    'panNumber',
                    'dpId',
                    'is_online_client',
                    'mappingStatus',
                    'clientActivationDate',
                    'clientReactivationDate',
                    'familyGroup',
                    'branch_id',
                    'region_branch_id'
                ],
                [
                    'user_id',
                    'panNumber',
                    'dpId',
                    'is_online_client',
                    'mappingStatus',
                    'clientActivationDate',
                    'clientReactivationDate',
                    'familyGroup',
                    'branch_id',
                    'region_branch_id'
                ],
                manager,
                1000,
                true
            );

            const clientIds = values.map((v: any) => v.id);
            const upsertedClients = await manager
                .createQueryBuilder(Client, 'client')
                .where('client.id IN (:...ids)', { ids: clientIds })
                .leftJoinAndSelect('client.user', 'user')
                .getMany();

            return {
                affected: result.affected,
                clients: upsertedClients,
                errors: [...new Map(result.errors.map((e) => [e.error, e])).values()]
            };
        } catch (error) {
            Logger.error(`bulkUpsertClients failed: ${error.message}`);
            throw error;
        }
    }

    async bulkUpsertUsers(
        users: DeepPartial<User>[],
        clientIds: string[],
        manager: EntityManager
    ): Promise<{
        results: { id: number; clientId: string }[];
        errors: { row: number; error: string }[];
    }> {
        if (users.length === 0 || clientIds.length === 0) {
            Logger.warn('No users or clientIds provided');
            return { results: [], errors: [] };
        }

        const results: { id: number; clientId: string }[] = [];
        const errors: { row: number; error: string }[] = [];
        const processedRows = new Set<number>();

        const userData: any[] = users
            .map((user, index) => {
                const clientId = clientIds[index];
                const rowNumber = index + 1;

                if (!user.firstName) {
                    if (!processedRows.has(rowNumber)) {
                        errors.push({ row: rowNumber, error: `Missing firstName for clientId ${clientId}` });
                        processedRows.add(rowNumber);
                    }
                    return null;
                }
                if (!user.email) {
                    if (!processedRows.has(rowNumber)) {
                        errors.push({ row: rowNumber, error: `Missing email for clientId ${clientId}` });
                        processedRows.add(rowNumber);
                    }
                    return null;
                }
                if (!user.status) {
                    if (!processedRows.has(rowNumber)) {
                        errors.push({ row: rowNumber, error: `Missing status for clientId ${clientId}` });
                        processedRows.add(rowNumber);
                    }
                    return null;
                }

                return {
                    id: null,
                    email: user.email!,
                    firstName: user.firstName!,
                    phoneNumber: user.phoneNumber || null,
                    dateOfBirth: user.dateOfBirth
                        ? new Date(user.dateOfBirth as string | Date).toISOString().split('T')[0]
                        : null,
                    gender: user.gender || null,
                    addresses: Array.isArray(user.addresses) ? user.addresses : user.addresses ? [user.addresses] : [],
                    state: user.state,
                    city: user.city || null,
                    country: user.country,
                    zip: user.zip!,
                    status: user.status || 'active',
                    company: user.company,
                    userType: user.userType || 'client',
                    clientId: user.clientId,
                    password: user.password || null
                };
            })
            .filter((data): data is any => data !== null);

        if (userData.length === 0) {
            return { results: [], errors };
        }

        const existingClientIds = userData.map((u) => u.clientId);
        const existingUsers = await manager
            .createQueryBuilder(User, 'user')
            .where('user.clientId IN (:...clientIds)', { clientIds: existingClientIds })
            .andWhere('user.deletedAt IS NULL')
            .select(['user.id', 'user.clientId'])
            .getMany();

        const existingClientIdMap = new Map(existingUsers.map((u) => [u.clientId, u.id]));

        const upsertData = userData.map((u) => ({
            ...u,
            id: existingClientIdMap.get(u.clientId) || null
        }));

        Logger.debug(`Upserting ${upsertData.length} users`);
        const { affected, errors: upsertErrors } = await bulkUpsert(
            'user',
            upsertData,
            [
                'id',
                'email',
                'firstName',
                'phoneNumber',
                'dateOfBirth',
                'gender',
                'addresses',
                'state',
                'city',
                'country',
                'zip',
                'status',
                'company',
                'userType',
                'clientId',
                'password'
            ],
            [
                'email',
                'firstName',
                'phoneNumber',
                'dateOfBirth',
                'gender',
                'addresses',
                'state',
                'city',
                'country',
                'zip',
                'status',
                'company',
                'userType',
                'password'
            ],
            manager,
            1000,
            true
        );

        upsertErrors.forEach((error) => {
            errors.push({ row: -1, error: error.error });
        });

        const upsertedUsers = await manager
            .createQueryBuilder(User, 'user')
            .where('user.clientId IN (:...clientIds)', { clientIds: existingClientIds })
            .andWhere('user.deletedAt IS NULL')
            .select(['user.id', 'user.clientId'])
            .getMany();

        upsertedUsers.forEach((user) => {
            if (user.clientId) {
                results.push({ id: user.id, clientId: user.clientId });
            }
        });

        clientIds.forEach((clientId, index) => {
            if (!results.some((r) => r.clientId === clientId) && !processedRows.has(index + 1)) {
                errors.push({
                    row: index + 1,
                    error: `Failed to associate user with clientId ${clientId}`
                });
            }
        });

        Logger.debug(`Upserted ${results.length} users for ${clientIds.length} clients`);
        return {
            results,
            errors: [...new Map(errors.map((e) => [`${e.row}-${e.error}`, e])).values()]
        };
    }

    async bulkUpsertUserRoles(
        userRoles: Partial<UserRole>[],
        manager: EntityManager
    ): Promise<{ affected: number; errors: { batch: number; error: string }[] }> {
        const values = userRoles.map((ur) => ({
            userId: ur.userId!,
            roleId: ur.roleId!
        }));

        try {
            // First, check for existing user roles to determine if we should update or insert
            const existingUserIds = values.map((v) => v.userId);
            const existingRoles = await manager
                .createQueryBuilder(UserRole, 'userRole')
                .where('userRole.userId IN (:...userIds)', { userIds: existingUserIds })
                .select(['userRole.userId'])
                .getMany();

            const existingUserIdSet = new Set(existingRoles.map((r) => r.userId));
            const toUpdate = values.filter((v) => existingUserIdSet.has(v.userId));
            const toInsert = values.filter((v) => !existingUserIdSet.has(v.userId));

            let affected = 0;
            const errors: { batch: number; error: string }[] = [];

            // Update existing user roles
            if (toUpdate.length > 0) {
                const updateResult = await bulkUpsert(
                    'user_role',
                    toUpdate,
                    ['userId', 'roleId'],
                    ['roleId'],
                    manager,
                    1000,
                    true // Ensure upsert mode
                );
                affected += updateResult.affected;
                errors.push(...updateResult.errors);
            }

            // Insert new user roles
            if (toInsert.length > 0) {
                const insertResult = await bulkUpsert(
                    'user_role',
                    toInsert,
                    ['userId', 'roleId'],
                    ['roleId'],
                    manager,
                    1000,
                    false // Insert mode for new records
                );
                affected += insertResult.affected;
                errors.push(...insertResult.errors);
            }

            return { affected, errors };
        } catch (error) {
            Logger.error(`bulkUpsertUserRoles failed: ${error.message}`);
            throw error;
        }
    }

    async bulkUpsertBankAccounts(
        bankAccounts: Partial<BankAccount>[],
        manager: EntityManager
    ): Promise<{ affected: number; errors: { batch: number; error: string }[] }> {
        const values = bankAccounts.map((b) => ({
            accountNumber: b.accountNumber || null,
            clientId: b.client?.id || null,
            accountType: b.accountType || 'Saving',
            ifscCode: b.ifscCode || null,
            bankName: b.bankName || 'Unknown',
            active: b.active !== undefined ? b.active : true,
            isDefault: true
        }));

        try {
            return await bulkUpsert(
                'bank_account',
                values,
                ['accountNumber', 'clientId', 'accountType', 'ifscCode', 'bankName', 'active', 'isDefault'],
                ['accountType', 'ifscCode', 'bankName', 'active', 'isDefault'],
                manager,
                1000,
                false
            );
        } catch (error) {
            Logger.error(`bulkUpsertBankAccounts failed: ${error.message}`);
            throw error;
        }
    }

    async bulkUpsertClientMappings(mappings: ClientMappingInput[]): Promise<BulkInsertResult<Client>> {
        const total = mappings.length;
        const errors: { row: number; entityName: string; error: string }[] = [];
        const updatedClients: Client[] = [];
        const validMappings: ClientMappingInput[] = [];

        Logger.debug(`Starting bulkUpsertClientMappings with ${total} DTOs`);

        if (total === 0) {
            Logger.warn('No mappings provided for bulk upsert');
            return {
                statusCode: 400,
                message: 'No mappings provided',
                data: { total, created: 0, updated: 0, failed: 0, errors: [], createdEntities: [] },
            };
        }

        // Step 1: Filter valid mappings (relying on ReportConfig's validateRow)
        mappings.forEach((mapping, idx) => {
            const row = idx + 2; // Header row = 1
            if (!mapping.clientId) {
                errors.push({ row, entityName: 'Client', error: 'Missing clientId' });
                return;
            }
            validMappings.push(mapping);
        });

        if (validMappings.length === 0) {
            return {
                statusCode: 400,
                message: 'No valid rows after validation',
                data: { total, created: 0, updated: 0, failed: total, errors, createdEntities: [] },
            };
        }

        // Step 2: Fetch all required clients, dealers, and employees
        const clientIds = validMappings.map(m => m.clientId).filter(Boolean) as string[];
        const dealerIds = [
            ...new Set([
                ...validMappings.map(m => m.equityDealer).filter(Boolean),
                ...validMappings.map(m => m.commodityDealer1).filter(Boolean),
                ...validMappings.map(m => m.commodityDealer2).filter(Boolean),
            ]),
        ] as string[];
        const rmIds = validMappings.map(m => m.rm).filter(Boolean) as string[];

        const [clients, dealers, rms] = await Promise.all([
            clientIds.length ? this.clientRepository.find({ where: { id: In(clientIds) } }) : [],
            dealerIds.length ? this.dealerRepo.find({ where: { dealerId: In(dealerIds) } }) : [],
            rmIds.length ? this.employeeRepo.find({ where: { id: In(rmIds) } }) : [],
        ]);

        Logger.debug(`Fetched ${clients.length} clients, ${dealers.length} dealers, ${rms.length} RMs`);

        // Step 3: Create maps for quick lookup with explicit tuple typing
        const clientMap = new Map<string, Client>(
            clients.map(c => [c.id, c] as [string, Client]),
        );
        const dealerMap = new Map<string, Dealer>(
            dealers.map(d => [d.dealerId, d] as [string, Dealer]),
        );
        const rmMap = new Map<string, Employee>(
            rms.map(r => [r.id, r] as [string, Employee]),
        );

        // Step 4: Prepare updates
        const updates: Partial<Client>[] = [];
        for (const mapping of validMappings) {
            const row = validMappings.indexOf(mapping) + 2;
            const client = clientMap.get(mapping.clientId);
            if (!client) {
                errors.push({ row, entityName: 'Client', error: `Client with ID ${mapping.clientId} not found` });
                continue;
            }

            const isOnlineClient = mapping.isOnlineClient === true || false;
            let equityDealer: Dealer | null = null;
            let commodityDealer1: Dealer | null = null;
            let commodityDealer2: Dealer | null = null;
            let rm: Employee | null = null;

            // Validate dealers and RM, skip if no valid dealers
            let hasValidDealer = false;
            if (mapping.equityDealer) {
                const dealer = dealerMap.get(mapping.equityDealer);
                if (dealer) {
                    equityDealer = dealer;
                    hasValidDealer = true;
                } else {
                    Logger.warn(`Skipping dealer ${mapping.equityDealer} for client ${mapping.clientId} at row ${row}: not found`);
                }
            }
            if (mapping.commodityDealer1) {
                const dealer = dealerMap.get(mapping.commodityDealer1);
                if (dealer) {
                    commodityDealer1 = dealer;
                    hasValidDealer = true;
                } else {
                    // Logger.warn(`Skipping dealer ${mapping.commodityDealer1} for client ${mapping.clientId} at row ${row}: not found`);
                }
            }
            if (mapping.commodityDealer2) {
                const dealer = dealerMap.get(mapping.commodityDealer2);
                if (dealer) {
                    commodityDealer2 = dealer;
                    hasValidDealer = true;
                } else {
                    // Logger.warn(`Skipping dealer ${mapping.commodityDealer2} for client ${mapping.clientId} at row ${row}: not found`);
                }
            }
            if (mapping.rm) {
                rm = rmMap.get(mapping.rm) || null;
                if (!rm) {
                    // Logger.warn(`Skipping RM ${mapping.rm} for client ${mapping.clientId} at row ${row}: not found`);
                }
            }

            if (!isOnlineClient && !hasValidDealer) {
                errors.push({
                    row,
                    entityName: 'Client',
                    error: `Skipping client ${mapping.clientId}: no valid dealers found`,
                });
                continue;
            }

            // Prepare update
            const updatedClient = { ...client };
            let hasChanges = false;

            if (isOnlineClient) {
                if (updatedClient.rm?.id !== rm?.id) {
                    updatedClient.rm = rm;
                    hasChanges = true;
                }
                if (updatedClient.equityDealer !== null || updatedClient.commodityDealer1 !== null || updatedClient.commodityDealer2 !== null) {
                    updatedClient.equityDealer = null;
                    updatedClient.commodityDealer1 = null;
                    updatedClient.commodityDealer2 = null;
                    hasChanges = true;
                }
                if (updatedClient.isOnlineClient !== true) {
                    updatedClient.isOnlineClient = true;
                    hasChanges = true;
                }
                if (updatedClient.mappingStatus !== !!rm) {
                    updatedClient.mappingStatus = !!rm;
                    hasChanges = true;
                }
            } else {
                if (updatedClient.rm?.id !== rm?.id) {
                    updatedClient.rm = rm;
                    hasChanges = true;
                }
                if (updatedClient.equityDealer?.dealerId !== equityDealer?.dealerId) {
                    updatedClient.equityDealer = equityDealer;
                    hasChanges = true;
                }
                if (updatedClient.commodityDealer1?.dealerId !== commodityDealer1?.dealerId) {
                    updatedClient.commodityDealer1 = commodityDealer1;
                    hasChanges = true;
                }
                if (updatedClient.commodityDealer2?.dealerId !== commodityDealer2?.dealerId) {
                    updatedClient.commodityDealer2 = commodityDealer2;
                    hasChanges = true;
                }
                if (updatedClient.isOnlineClient !== false) {
                    updatedClient.isOnlineClient = false;
                    hasChanges = true;
                }
                if (updatedClient.mappingStatus !== hasValidDealer) {
                    updatedClient.mappingStatus = hasValidDealer;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                updatedClient.updatedAt = new Date();
                updates.push(updatedClient);
            }
        }

        // Step 5: Perform bulk update in a single transaction
        if (updates.length > 0) {
            await this.clientRepository.manager.transaction(async (transactionalEntityManager: EntityManager) => {
                await transactionalEntityManager.save(Client, updates);
            });
            // Fetch updated clients for response
            const updatedClientIds = updates.map(c => c.id);
            const fetchedClients = await this.clientRepository.find({
                where: { id: In(updatedClientIds) },
                relations: ['equityDealer', 'commodityDealer1', 'commodityDealer2', 'rm'],
            });
            updatedClients.push(...fetchedClients);
        }

        const processed = updatedClients.length;
        const failed = total - processed;

        Logger.debug(`Processed ${processed} of ${total} mappings, failed: ${failed}, errors: ${errors.length}`);

        return {
            statusCode: processed === total ? 201 : failed > 0 ? 207 : 400,
            message: `Bulk upsert completed: ${processed} of ${total} mappings processed`,
            data: {
                total,
                created: 0,
                updated: processed,
                failed,
                errors,
                createdEntities: updatedClients,
            },
        };
    }
}
