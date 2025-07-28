import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// import Redis from 'ioredis';

@Injectable()
export class InsuranceDashboardService {
    constructor(
        private readonly loggedInsUserService: LoggedInsUserService,

        @InjectRepository(User) private readonly userRepo: Repository<User>,

        @InjectRepository(InsuranceTicket)
        private readonly ticketRepo: Repository<InsuranceTicket>,
        // @Inject(CACHE_MANAGER) private cacheManager: Cache,
        // @Inject('REDIS_CLIENT') private readonly redisClient: Redis
    ) {}

    async getAdminDashboardDetails(): Promise<any> {
        try {
            // const cacheKey = 'admin_dashboard_details';
            // const cached = await this.redisClient.get(cacheKey);
            // // console.log('cached data ------------------------', cached);
            // if (cached) {
            //     return {
            //         status: 'success',
            //         message: 'From cache',
            //         data: JSON.parse(cached)
            //     };
            // }

            const query = 'CALL get_adminDashboardDetails()';
            const result = await this.ticketRepo.query(query);
            const rows = result[0];
            const userData = result[1][0];
            const insuranceMonthlyData = result[2];
            const totalSoldPolicyYearly = result[3] || [];
            // console.log('sold policy testing ', result[2]);

            const calculateGrowth = (current: number, previous: number) => {
                // console.log('current', current, 'previous', previous);
                if (previous === 0) return current === 0 ? 0 : 100;
                return ((current - previous) / previous) * 100;
            };

            // stat data start here------------------
            const currentMonthString = new Date().toISOString().slice(0, 7); // e.g., "2025-06"

            const statistics: any = {
                monthly: {
                    previous_month: null,
                    current_month: {
                        total_tickets: '0',
                        total_open: '0',
                        total_in_progress: '0',
                        total_closed: '0',
                        growth: '0.00',
                        total_sold: '0'
                    },
                    monthData: {
                        categories: [],
                        totalTicket: []
                    }
                },
                today: {
                    category: 'today',
                    category_type: 'daily',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    growth: '0.00',
                    total_sold: '0'
                },
                yesterday: {
                    category: 'yesterday',
                    category_type: 'daily',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    total_sold: '0'
                },
                before_yesterday: {
                    category: 'before_yesterday',
                    category_type: 'daily',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    total_sold: '0'
                },
                current_week: {
                    category: 'this_week',
                    category_type: 'weekly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    growth: '0.00',
                    total_sold: '0'
                },
                previous_week: {
                    category: 'previous_week',
                    category_type: 'weekly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    total_sold: '0'
                },
                current_year: {
                    category: 'current_year',
                    category_type: 'yearly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    growth: '0.00',
                    total_sold: '0'
                },
                previous_year: {
                    category: 'previous_year',
                    category_type: 'yearly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    total_sold: '0'
                }
            };

            rows.forEach((row) => {
                const { category_type, category } = row;

                if (category_type === 'daily') {
                    if (category === 'today') statistics.today = { ...row, growth: '0.00' };
                    else if (category === 'yesterday') statistics.yesterday = row;
                    else if (category === 'before_yesterday') statistics.before_yesterday = row;
                }

                if (category_type === 'weekly') {
                    if (category === 'this_week') statistics.current_week = { ...row, growth: '0.00' };
                    else if (category === 'previous_week') statistics.previous_week = row;
                }

                if (category_type === 'monthly') {
                    if (category === 'previous_month') {
                        statistics.monthly.previous_month = row;
                    } else if (/^\d{4}-\d{2}$/.test(category)) {
                        const monthLabel = new Date(`${category}-01`).toLocaleString('default', { month: 'short' });
                        statistics.monthly.monthData.categories.push(monthLabel);
                        statistics.monthly.monthData.totalTicket.push(parseInt(row.total_tickets, 10));

                        if (category === currentMonthString) {
                            statistics.monthly.current_month = {
                                total_tickets: row.total_tickets,
                                total_open: row.total_open,
                                total_in_progress: row.total_in_progress,
                                total_closed: row.total_closed,
                                growth: '0.00',
                                total_sold: row.total_sold
                            };
                        }
                    }
                }

                if (category_type === 'yearly') {
                    if (category === 'current_year') statistics.current_year = { ...row, growth: '0.00' };
                    else if (category === 'previous_year') statistics.previous_year = row;
                }
            });

            // Daily growth
            statistics.today.growth = calculateGrowth(
                parseInt(statistics.today.total_tickets, 10),
                parseInt(statistics.yesterday.total_tickets, 10)
            ).toFixed(2);

            // Weekly growth
            statistics.current_week.growth = calculateGrowth(
                parseInt(statistics.current_week.total_tickets, 10),
                parseInt(statistics.previous_week.total_tickets, 10)
            ).toFixed(2);

            // Monthly growth
            const prevMonthTotal = parseInt(statistics.monthly.previous_month?.total_tickets || '0', 10);
            const currMonthTotal = parseInt(statistics.monthly.current_month.total_tickets || '0', 10);
            statistics.monthly.current_month.growth = calculateGrowth(currMonthTotal, prevMonthTotal).toFixed(2);

            // yearly growth
            statistics.current_year.growth = calculateGrowth(
                parseInt(statistics.current_year.total_tickets, 10),
                parseInt(statistics.previous_year.total_tickets, 10)
            ).toFixed(2);

            // user data code start here -----------------
            const userDetails: any = {
                totalUser: userData.totalUser,
                group18: userData.group18,
                group25: userData.group25,
                group35: userData.group35,
                group45: userData.group45,
                group60: userData.group60,
                groupgreater60: userData.groupgreater60
            };

            // sold policy code for bar chart start here ----------------
            // === Build soldPolicy ===

            const monthSet = new Set<string>();
            const insuranceSet = new Set<string>();

            insuranceMonthlyData.forEach((row) => {
                monthSet.add(row.month_name);
                insuranceSet.add(row.insurance_type);
            });

            const sortedMonths = Array.from(monthSet); // will retain SQL order (Jan, Feb, ...)
            const sortedInsuranceTypes = Array.from(insuranceSet); // ['HEALTH', 'LIFE', ...]

            // Build series array
            const series = sortedInsuranceTypes.map((type) => {
                const data = sortedMonths.map((month) => {
                    const match = insuranceMonthlyData.find(
                        (row) => row.month_name === month && row.insurance_type === type
                    );
                    return match ? match.total_purchased : 0;
                });
                return {
                    name: type,
                    data
                };
            });

            const soldPolicy = {
                categories: sortedMonths,
                series
            };

            // total sold policy code start here ----------------
            const totalSold = totalSoldPolicyYearly.reduce(
                (acc, item) => {
                    const type = item.insurance_type;
                    const current = item.current_year_purchased;
                    const previous = item.previous_year_purchased;
                    const growth = item.growth_percentage;

                    acc[type] = {
                        current_year: current,
                        previous_year: previous,
                        growth
                    };

                    acc.total_current_year += Number(current);
                    acc.total_previous_year += Number(previous);

                    return acc;
                },
                {
                    total_current_year: 0,
                    total_previous_year: 0
                }
            );

            totalSold.total_growth = calculateGrowth(
                parseInt(totalSold.total_current_year, 10),
                parseInt(totalSold.total_previous_year, 10)
            ).toFixed(2);

            // await this.redisClient.set(
            //     cacheKey,
            //     JSON.stringify({ statistics, userDetails, soldPolicy, totalSold }),
            //     'EX',
            //     1800
            // );

            return {
                status: 'success',
                message: 'Admin dashboard details fetched successfully',
                data: {
                    statistics,
                    userDetails,
                    soldPolicy,
                    totalSold
                }
            };
        } catch (error) {
            console.error('Dashboard error:', error);
            throw new InternalServerErrorException(error.message || 'Failed to fetch dashboard details');
        }
    }

    async getAgentDashboardDetails(): Promise<any> {
        try {
            const userEntity = this.loggedInsUserService.getCurrentUser();
            if (!userEntity) {
                throw new UnauthorizedException('User not found');
            }
            // const cacheKey = `agent_dashboard_details${userEntity.id}`;

            // const cached = await this.redisClient.get(cacheKey);
            // // console.log('cached data ------------------------', cached);
            // if (cached) {
            //     return {
            //         status: 'success',
            //         message: 'From cache',
            //         data: JSON.parse(cached)
            //     };
            // }
            // console.log('userEntity', userEntity);
            const query = 'CALL get_agentDashboardDetails(?)';
            const result = await this.ticketRepo.query(query, [userEntity.id]);
            // const result = await this.ticketRepo.query(query, [153916]);
            const rows = result[0];
            // const userData = result[1][0];
            const insuranceMonthlyData = result[2];
            // const totalSoldPolicyYearly = result[3] || [];
            // console.log('sold policy testing ', rows);

            const calculateGrowth = (current: number, previous: number) => {
                // console.log('current', current, 'previous', previous);
                if (previous === 0) return current === 0 ? 0 : 100;
                return ((current - previous) / previous) * 100;
            };

            // stat data start here------------------
            const currentMonthString = new Date().toISOString().slice(0, 7); // e.g., "2025-06"

            const statistics: any = {
                monthly: {
                    previous_month: null,
                    current_month: {
                        total_tickets: '0',
                        total_open: '0',
                        total_in_progress: '0',
                        total_closed: '0',
                        growth: '0.00'
                    },
                    monthData: {
                        categories: [],
                        totalTicket: []
                    }
                },
                today: {
                    category: 'today',
                    category_type: 'daily',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    growth: '0.00'
                },
                yesterday: {
                    category: 'yesterday',
                    category_type: 'daily',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0'
                },
                before_yesterday: {
                    category: 'before_yesterday',
                    category_type: 'daily',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0'
                },
                current_week: {
                    category: 'this_week',
                    category_type: 'weekly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    growth: '0.00'
                },
                previous_week: {
                    category: 'previous_week',
                    category_type: 'weekly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0'
                },
                current_year: {
                    category: 'current_year',
                    category_type: 'yearly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0',
                    growth: '0.00'
                },
                previous_year: {
                    category: 'previous_year',
                    category_type: 'yearly',
                    total_tickets: '0',
                    total_open: '0',
                    total_in_progress: '0',
                    total_closed: '0'
                }
            };

            rows.forEach((row) => {
                const { category_type, category } = row;

                if (category_type === 'daily') {
                    if (category === 'today') statistics.today = { ...row, growth: '0.00' };
                    else if (category === 'yesterday') statistics.yesterday = row;
                    else if (category === 'before_yesterday') statistics.before_yesterday = row;
                }

                if (category_type === 'weekly') {
                    if (category === 'this_week') statistics.current_week = { ...row, growth: '0.00' };
                    else if (category === 'previous_week') statistics.previous_week = row;
                }

                if (category_type === 'monthly') {
                    if (category === 'previous_month') {
                        statistics.monthly.previous_month = row;
                    } else if (/^\d{4}-\d{2}$/.test(category)) {
                        const monthLabel = new Date(`${category}-01`).toLocaleString('default', { month: 'short' });
                        statistics.monthly.monthData.categories.push(monthLabel);
                        statistics.monthly.monthData.totalTicket.push(parseInt(row.total_tickets, 10));

                        if (category === currentMonthString) {
                            statistics.monthly.current_month = {
                                total_tickets: row.total_tickets,
                                total_open: row.total_open,
                                total_in_progress: row.total_in_progress,
                                total_closed: row.total_closed,
                                growth: '0.00'
                            };
                        }
                    }
                }

                if (category_type === 'yearly') {
                    if (category === 'current_year') statistics.current_year = { ...row, growth: '0.00' };
                    else if (category === 'previous_year') statistics.previous_year = row;
                }
            });

            // Daily growth
            statistics.today.growth = calculateGrowth(
                parseInt(statistics.today.total_tickets, 10),
                parseInt(statistics.yesterday.total_tickets, 10)
            ).toFixed(2);

            // Weekly growth
            statistics.current_week.growth = calculateGrowth(
                parseInt(statistics.current_week.total_tickets, 10),
                parseInt(statistics.previous_week.total_tickets, 10)
            ).toFixed(2);

            // Monthly growth
            const prevMonthTotal = parseInt(statistics.monthly.previous_month?.total_tickets || '0', 10);
            const currMonthTotal = parseInt(statistics.monthly.current_month.total_tickets || '0', 10);
            statistics.monthly.current_month.growth = calculateGrowth(currMonthTotal, prevMonthTotal).toFixed(2);

            // yearly growth
            statistics.current_year.growth = calculateGrowth(
                parseInt(statistics.current_year.total_tickets, 10),
                parseInt(statistics.previous_year.total_tickets, 10)
            ).toFixed(2);
            // await this.redisClient.set(cacheKey, JSON.stringify({ statistics }), 'EX', 1800);
            return {
                status: 'success',
                message: 'Agent dashboard details fetched successfully',
                data: {
                    statistics
                }
            };
        } catch (error) {
            console.error('Dashboard error:', error);
            throw new InternalServerErrorException(error.message || 'Failed to fetch dashboard details');
        }
    }
}
