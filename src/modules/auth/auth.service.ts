import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    HttpException,
    HttpStatus,
    NotAcceptableException,
    NotFoundException,
    forwardRef,
    Inject,
    BadRequestException,
    Logger,
    InternalServerErrorException
} from '@nestjs/common';
import { UserRegisterDto } from '../user/dto/user-register-dto';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../user/user.entity';
import {
    Features,
    Roles,
    STRATEGIES,
    USER_STATUS,
    createPasswordHash,
    generateOTP,
    refineCustomLogs
} from '../../utils/app.utils';
import { ReferenceService } from '../reference/reference.service';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import { LogService } from '../log/log.service';
import { NotificationService } from '../notification/notification.service';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './tokens.service';
import { MediaService } from '../media/media.service';
import { AddressService } from '../address/address.service';
import { RoleFeatureActionService } from '../role-feature-action/role-feature-action.service';
import { RoleService } from '../role/role.service';
import { Action } from '../ability/ability.factory';
import { getLogger } from 'src/utils/winstonLogger';
import { OnEvent } from '@nestjs/event-emitter';
import { SecretService } from '../aws/aws-secrets.service';
import { invitationLinkForClient } from 'src/utils/email-templates/invitation-link/client';
import { resetLink } from 'src/utils/email-templates/reset-password';
import { UserFeatureActionService } from '@modules/user-feature-action/user-feature-action.service';
import axios from 'axios';
import { compare } from 'bcryptjs';
import { Company } from '@modules/company/entities/company.entity';
import { sendOtpForForgotPassword } from 'src/utils/email-templates/otp/login';
import { EmailService } from '@modules/email/email.service';
import { InsuranceRolePermission } from '@modules/insurance-role-permission/entities/insurance-role-permission.entity';

@Injectable()
export class AuthService {
    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private referenceService: ReferenceService,
        private addrService: AddressService,
        private logService: LogService,
        private jwtService: JwtService,
        private mediaService: MediaService,
        @Inject(forwardRef(() => NotificationService))
        private notifyService: NotificationService,
        private tokenService: TokenService,
        @Inject(forwardRef(() => RoleFeatureActionService))
        private roleFeatureActionService: RoleFeatureActionService,
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private roleService: RoleService,
        private secretService: SecretService,
        private userFeatureActionService: UserFeatureActionService,
        @InjectRepository(Company)
        private companyService: Repository<Company>,
        private emailService: EmailService,
        @InjectRepository(InsuranceRolePermission)
        private insRolePermissionRepo: Repository<InsuranceRolePermission>
    ) {}

    async register(userRegister: UserRegisterDto, req: any): Promise<any> {
        const user = new User();
        user.firstName = req.body.firstName;
        user.lastName = req.body.lastName;
        user.phoneNumber = req.body.phoneNumber;
        user.email = req.body.email;
        user.password = req.body.password;
        user.accessToken = null;
        user.refreshToken = null;
        user.otp = generateOTP();
        user.status = 'pending';

        try {
            const userData = await user.save();

            if (!userData) throw new HttpException('could not save User..', HttpStatus.INTERNAL_SERVER_ERROR);

            // Send OTP to user's email
            await this.notifyService.sendOTP(userData.email, userData.otp);

            const logsData = await this.logService.saveLogByRef(userData, Features.user, Action.create, req);

            if (!logsData) throw new HttpException('could not save logs..', HttpStatus.INTERNAL_SERVER_ERROR);

            return await this.generateJWT(
                {
                    email: userData.email
                },
                'otp',
                '1d'
            );
        } catch (error) {
            // PostgreSQL error code 23505 indicates a unique constraint violation
            if (error.code === '23505') {
                throw new ConflictException(['email already exists']);
            }
            throw error;
        }
    }

    async loginViaId(req: any): Promise<any> {
        const user = req.user;
        Logger.log(user);

        if (!user) {
            throw new NotAcceptableException(['Invalid Token']);
        }

        // Reject inactive staff
        if ([Roles.staff].includes(user.userType as Roles) && user.status === USER_STATUS.IN_ACTIVE) {
            throw new BadRequestException('In-Active User cannot be logged in.');
        }

        const newOTP = generateOTP();
        const genericId = user.userType === Roles.client ? user.client.id : user.employee.id;
        await this.userService.findAndUpdateById(user.userType, genericId, { otp: newOTP });

        await this.notifyService.sendOTP(user.email, newOTP);
        return await this.generateJWTViaId({ genericId: genericId, userType: user.userType }, 'otp', '1d');
    }

    async login(req: any): Promise<any> {
        const dbUser = await this.userService.findOneByEmail(req.user.email);

        if (!dbUser) throw new NotAcceptableException(['Invalid Token']);

        if ([Roles.staff].includes(dbUser?.userType as Roles) && dbUser.status === USER_STATUS.IN_ACTIVE) {
            throw new BadRequestException('In-Active User cannot be logged in.');
        }

        const newOTP = generateOTP();
        await this.userService.findAndUpdate(req.user.email, { otp: newOTP });
        await this.notifyService.sendOTP(req.user.email, newOTP);

        return await this.generateJWT({ email: dbUser.email }, 'otp', '2d');
    }

    async resendOTP(email: string): Promise<any> {
        const dbUser = await this.userService.findOneByEmail(email);
        if (!dbUser) throw new NotFoundException(['User Not Found']);

        const newOTP = generateOTP();
        await this.userService.findAndUpdate(dbUser.email, { otp: newOTP });
        await this.notifyService.sendOTP(dbUser.email, newOTP);

        return await this.generateJWT({ email: dbUser.email }, 'otp', '1d');
    }

    async validateUser(email: string, password: string): Promise<any> {
        const user = await this.getUserNamePassword(email, password);

        let isMatch: any;
        if (user) {
            isMatch = password === user.password;

            if (isMatch) {
                const { password, ...rest } = user;
                return rest;
            }
        }

        return null;
    }

    async validateUserViaId(username: string, password: string): Promise<any> {
        const user = await this.getUserNamePasswordViaId(username, password);
        let isMatch: any;
        if (user) {
            isMatch = password === user.password;

            if (isMatch) {
                const { password, ...rest } = user;
                return rest;
            }
        }

        return null;
    }

    async generateJWT(user: any, category: string, expiresIn: string = '2d') {
        const payload = {
            email: user.email,
            forRoutes: category // category can have value => (all/otp)
        };

        return this.jwtService.sign(payload, { expiresIn });
    }

    async generateJWTViaId(user: { genericId: string; userType: string }, category: string, expiresIn: string = '30d') {
        // Logger.log('generating jwt', user);
        const payload = {
            genericId: user.genericId,
            userType: user.userType,
            forRoutes: category // category can have value => (all/otp)
        };

        return this.jwtService.sign(payload, { expiresIn });
    }

    async getUserNamePasswordViaId(username: string, password: string): Promise<User | null> {
        const userRepo = this.userRepository;

        // Attempt to find user joined with Employee
        let user = await userRepo
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.employee', 'employee')
            .where('employee.id = :username', { username })
            .andWhere('user.password = :password', { password })
            .getOne();

        // If not found, try with Client
        if (!user) {
            user = await userRepo
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.client', 'client')
                .where('client.id = :username', { username })
                .andWhere('user.password = :password', { password })
                .getOne();
        }

        return user;
    }

    async getUserNamePassword(email: string, password: string): Promise<User> {
        return await this.userRepository.findOne({
            where: {
                email: Like(`%${String(email).toLowerCase()}%`),
                password: password
            }
        });
    }

    async verifyOTP(requestedOTP: string, req: any): Promise<any> {
        const { user } = req;
        const { genericId, userType } = user;

        // Fetch user from DB
        const dbUser = await this.userService.findOneByGenericId(userType, genericId);
        if (!dbUser) throw new NotAcceptableException('Invalid Token');

        // Validate OTP
        if (requestedOTP !== dbUser.otp) throw new NotAcceptableException('Invalid OTP');

        // Generate new access token
        const token = await this.generateJWTViaId({ genericId, userType }, 'all');

        // Update user status and last login
        const updates: Partial<typeof dbUser> = {
            lastLogin: new Date(),
            accessToken: token,
            ...(dbUser.status !== 'active' && { status: 'active' })
        };

        await this.userService.findAndUpdateById(userType, genericId, updates);

        // Build user query with dynamic joins
        const query = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.state', 'state')
            .leftJoinAndSelect(
                userType === Roles.client ? 'user.client' : 'user.employee',
                userType === Roles.client ? 'client' : 'employee'
            )
            .leftJoinAndSelect(userType === Roles.client ? 'client.branch' : 'employee.branch', 'branch');

        // Apply where condition based on userType
        const detailedUser = await query
            .where(userType === Roles.client ? 'user.clientId = :genericId' : 'user.employeeId = :genericId', {
                genericId
            })
            .getOne();

        if (!detailedUser) throw new NotFoundException('User details not found');

        // Fetch role info and permissions
        const [dbRole, allPermissions] = await Promise.all([
            this.roleService.findOneByName(detailedUser.userType),
            this.userFeatureActionService.findOne(dbUser.id)
        ]);

        const roleName = dbRole?.roleName ?? null;
        const genericEntity = userType === Roles.client ? detailedUser.client : detailedUser.employee;

        return {
            token,
            user: {
                ...detailedUser,
                features: allPermissions ?? null,
                role: dbRole ? { name: roleName, id: dbRole.id } : null
            },
            genericId: genericEntity?.id ?? null,
            branchId: genericEntity?.branch?.id ?? null
        };
    }

    async loginBypassOTP(req: any): Promise<any> {
        const user = req.user;
        Logger.log(user);

        if (!user) {
            throw new NotAcceptableException(['Invalid Token']);
        }

        // Reject inactive staff
        if ([Roles.staff].includes(user.userType as Roles) && user.status === USER_STATUS.IN_ACTIVE) {
            throw new BadRequestException('In-Active User cannot be logged in.');
        }

        const genericId = user.userType === Roles.client ? user.client.id : user.employee.id;
        const payload = {
            genericId: user.clientId || user.employeeId || user.id.toString(),
            userType: user.userType || 'client',
            forRoutes: 'all'

            // Add other fields if needed
        };
        // Generate new access token directly
        return this.jwtService.sign(payload, {
            secret: await this.secretService.getSecret('JWT_ACCESS_SECRET'),
            expiresIn: '1d' // Set the token expiration time
        });
    }

    async generateAccessToken(genericId: string, userType: Roles): Promise<string> {
        // Logger.log(`Generating token for genericId: ${genericId}`);
        const user = await this.userService.findOneByGenericId(userType, genericId);
        if (!user) {
            Logger.error(`User not found for genericId: ${genericId}`);
            throw new BadRequestException('User not found');
        }
        const payload = {
            genericId: user.clientId || user.employeeId || user.id.toString(),
            userType: user.userType || 'client',
            forRoutes: 'all'

            // Add other fields if needed
        };
        // Logger.log('Token payload:', payload);
        const token = await this.jwtService.sign(payload, {
            secret: await this.secretService.getSecret('JWT_ACCESS_SECRET'),
            expiresIn: '1d' // Set the token expiration time
        });
        // Logger.log('Generated token:', token);
        return token;
    }

    async validateAccessToken(token: string): Promise<any> {
        // Logger.log('Validating token:', token);
        let decoded: any = null;
        try {
            decoded = await this.jwtService.verify(token, {
                secret: await this.secretService?.getSecret('JWT_ACCESS_SECRET')
            });
            // Logger.log('Decoded token:', decoded);
        } catch (error) {
            Logger.error('Token verification failed:', error.message);
            throw new UnauthorizedException('Invalid token');
        }

        const { genericId, userType } = decoded;

        // Fetch user from DB using genericId and userType
        const dbUser = await this.userService.findOneByGenericId(userType, genericId);
        if (!dbUser) {
            Logger.error(`User not found for genericId: ${genericId}, userType: ${userType}`);
            throw new NotAcceptableException('User not found');
        }

        // Build base query
        let query = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.state', 'state');

        // Conditionally join the relevant table
        if (dbUser.userType === Roles.client) {
            query = query.leftJoinAndSelect('user.client', 'client').leftJoinAndSelect('client.branch', 'branch');
        } else {
            query = query.leftJoinAndSelect('user.employee', 'employee').leftJoinAndSelect('employee.branch', 'branch');
        }

        // Execute query using genericId
        const detailedUser = await query
            .where(dbUser.userType === Roles.client ? 'user.clientId = :genericId' : 'user.employeeId = :genericId', {
                genericId
            })
            .getOne();

        if (!detailedUser) {
            Logger.error(`Detailed user not found for genericId: ${genericId}`);
            throw new NotFoundException('User details not found');
        }

        // Get Role Information
        const dbRole = await this.roleService.findOneByName(detailedUser.userType);
        const roleName = dbRole?.roleName ?? null;

        // Fetch user permissions
        const allPermissions = await this.userFeatureActionService.findOne(dbUser.id);

        // Assign correct entity (Client or Employee)
        const genericEntity = dbUser.userType === Roles.client ? detailedUser.client : detailedUser.employee;

        // Generate JWT Token with clientId/employeeId and userType
        const tokenPayload = {
            userType: userType,
            genericId: genericId
        };
        const accessToken = await this.generateJWTViaId(tokenPayload, 'all');
        return {
            token: accessToken,
            user: {
                ...detailedUser,
                features: allPermissions ?? null,
                role: dbRole ? { name: roleName, id: dbRole.id } : null
            },
            genericId: genericEntity?.id ?? null,
            branchId: genericEntity?.branch?.id ?? null
        };
    }

    async captcha(token: any): Promise<any> {
        const recaptchaResponse = await axios.post(
            `https://www.google.com/recaptcha/api/siteverify?secret=${await this.secretService?.getSecret('RECAPTCHA_SECRET_KEY')}&response=${token}`
        );
        console.log('recaptchaResponse--  ', recaptchaResponse);
        if (!!recaptchaResponse.data.success === false) throw new Error();
        return { isValid: true };
    }

    async forgotPass({ id, forgot = true }: { id: string; forgot?: boolean }): Promise<any> {
        let htmlContent: string = null;
        let subject: string = 'Reset Link';
        let user = null;
        user = await this.userService.findOneByGenericId(Roles.client, id);
        // user = await this.userService.findOneByGenericId(Roles.staff, id);
        Logger.log('user', user);
        if (!user) throw new NotFoundException(['User does not exist']);

        const secret = (await this.secretService?.getSecret('JWT_ACCESS_SECRET')) + user.password;
        const customJwtService = new JwtService({ secret });
        const payload = {
            email: user.email
        };
        const token = customJwtService.sign(payload, { expiresIn: '1d' });

        const link = `${await this.secretService?.getSecret('API_URL')}backend/verify-forgot-password/${user.id}/${token}`;

        htmlContent = resetLink(user, link);

        if (user?.userType === Roles?.client && !forgot) {
            htmlContent = invitationLinkForClient(user, link);
            subject = 'Portal Invitation';
        }

        return await this.notifyService.sendOneTimeResetLink({
            userEmail: user.email,
            subject,
            body: htmlContent ?? link
        });
    }

    async verifyForgotPass(params: any, res: any): Promise<any> {
        const user = await this.userService.findOneById(parseInt(params.id));

        if (!user) throw new NotFoundException(['User does not exist']);

        const secret = (await this.secretService?.getSecret('JWT_ACCESS_SECRET')) + user.password;

        const payload = await this.jwtService.verify(params.token, { secret });
        if (!payload) throw new UnauthorizedException(['Not Allowed..']);

        const targetUrl = `${await this.secretService?.getSecret('APP_URL')}/reset-password`;
        const redirectUrl = targetUrl + '?' + new URLSearchParams(params).toString();

        res.redirect(302, redirectUrl);
    }

    async resetPass(data: any, authorizationHeader: string): Promise<any> {
        if (!authorizationHeader) throw new UnauthorizedException(['Not Authorized..']);

        const [, token] = authorizationHeader.split('Bearer ');
        if (!token) throw new UnauthorizedException(['Not Authorized..']);

        const user = await this.userService.findOneById(parseInt(data.id));
        if (!user) throw new NotFoundException(['User does not exist']);

        const secret = (await this.secretService?.getSecret('JWT_ACCESS_SECRET')) + user.password;
        const payload = await this.jwtService.verify(token, { secret });
        if (!payload) throw new UnauthorizedException(['Not allowed..']);

        user.password = data.password;

        const { password, accessToken, refreshToken, ...rest } = await this.userRepository.save(user);

        return rest;
    }

    async logout(body: any): Promise<any> {
        const { user, cookies, res } = body;
        // Logger.log('logging out user', user);

        const dbUser = await this.userService.findOneByGenericId(user.userType as Roles, user.genericId);
        if (!dbUser) throw new NotFoundException(['Already Deleted..']);

        dbUser.accessToken = null;
        dbUser.refreshToken = null;

        await this.userRepository.save(dbUser);

        if (cookies?.jwt) res.status(204).clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
    }

    async delete(email: string): Promise<any> {
        if (email === 'tahir@insighttherapy.us') {
            const dbUser = await this.userService.findOneByEmail(email);
            if (!dbUser) throw new NotFoundException(['Already Deleted..']);

            return await this.userService.removeByEmail(email);
        }
    }

    async testCookie(res: any): Promise<any> {
        const token = await this.secretService?.getSecret('JWT_ACCESS_SECRET');
        res.cookie('testCookie', token, { httpOnly: true, secure: true, maxAge: 86400000 }); // Example: 1 day expiration
        res.send('Cookie set successfully');
    }

    async handleRefreshToken(req: any, res: any): Promise<any> {
        const cookies = req.cookies;
        if (!cookies?.jwt) throw new UnauthorizedException(['Not Authorized..']);
        const refreshToken = cookies.jwt;
        res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });

        const foundUser = await this.userRepository.findOneBy({ refreshToken });
        let decoded: any = null;

        // Detected refresh token reuse!
        if (!foundUser) {
            try {
                decoded = await this.jwtService.verify(refreshToken, {
                    secret: await this.secretService?.getSecret('JWT_REFRESH_SECRET')
                });

                const hackedUser = await this.userRepository.findOneBy({ email: decoded.email });
                hackedUser.refreshToken = null;
                hackedUser.accessToken = null;
                const result = await this.userRepository.save(hackedUser);
                // console.log(result);
            } catch (error) {
                if (!decoded) throw new UnauthorizedException(['Not Found hacked-User..']);
                throw error;
            }

            throw new UnauthorizedException(['Un-Authorized..']); //Un-Authorized
        }

        // evaluate jwt
        try {
            decoded = await this.jwtService.verify(refreshToken, {
                secret: await this.secretService?.getSecret('JWT_REFRESH_SECRET')
            });
        } catch (error) {
            foundUser.refreshToken = null;
            const result = await this.userRepository.save(foundUser);
            // console.log(result);
            if (!decoded) throw new UnauthorizedException(['Un-Authorized..']);
            throw error;
        }

        // Refresh token was still valid
        const accessToken = await this.tokenService.generateJWT({ email: foundUser.email }, STRATEGIES.ACCESS);
        const newRefreshToken = await this.tokenService.generateJWT({ email: foundUser.email }, STRATEGIES.REFRESH);

        foundUser.accessToken = accessToken;
        foundUser.refreshToken = newRefreshToken;
        await this.userRepository.save(foundUser);

        // Creates Secure Cookie with refresh token
        res.cookie('jwt', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 30 * 24 * 60 * 60 * 1000
        });

        return accessToken;
    }

    async getHoursTokenFromStart(user: User, date: moment.Moment, amount: number) {
        const expiry = date.clone().add(amount, 'hours').unix();

        const secret = await this.secretService?.getSecret('JWT_ACCESS_SECRET');
        const customJwtService = new JwtService({ secret });
        const payload = {
            id: user?.id,
            exp: expiry
        };
        return customJwtService.sign(payload);
    }

    async loginInsuranceUser(reqBody: any, req: any): Promise<any> {
        // let user = await this.userService.findOneByEmail(reqBody.email);
        let user = await this.userRepository.findOne({
            where: {
                email: reqBody.email,
                company: {
                    id: 2
                }
            },
            relations: ['company']
        });

        if (!user) throw new NotAcceptableException(['User not found']);

        if (user.status === USER_STATUS.IN_ACTIVE) {
            throw new BadRequestException('In-Active User cannot be logged in.');
        }

        const isMatch = await compare(reqBody.password, user.password);
        // console.log('after this pass match', isMatch, user.password, reqBody.password);
        if (!isMatch) {
            throw new BadRequestException('wrong password');
        }

        let query = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.company', 'company')
            .leftJoinAndSelect('user.state', 'state')
            .leftJoinAndSelect('user.employee', 'employee')
            .leftJoinAndSelect('employee.branch', 'branch');
        const detailedUser = await query.where('user.id = :id', { id: user.id }).getOne();
        // console.log('after this pass match', isMatch);
        // Get Role Information
        const dbRole = await this.roleService.findOneByName(detailedUser.userType);
        const roleName = dbRole?.roleName ?? null;
        // console.log('inauth service????????????????????????????????????????????????????', dbRole, dbRole.id, dbRole.roleName);

        // this code is old. after that procudure is used.
        // const rolePermissions = await this.insRolePermissionRepo
        //     .createQueryBuilder('rolePermission')
        //     .leftJoinAndSelect('rolePermission.permission', 'permission')
        //     .where('rolePermission.role = :roleId', { roleId: dbRole.id })
        //     .andWhere('rolePermission.is_active = :rpActive', { rpActive: true })
        //     .andWhere('permission.is_active = :permActive', { permActive: true })
        //     .getMany();

        // console.log('permissionsByType===========', rolePermissions);
        // const permissionsByType = {};
        // for (const { permission } of rolePermissions) {
        //     const { type, name } = permission;
        //     if (!permissionsByType[type]) permissionsByType[type] = [];
        //     permissionsByType[type].push(name);
        // }
        //old code is ended here.

        const permissionResult = await this.userRepository.query('CALL get_roleAccess(?)', [roleName]);
        const permissionsByType = permissionResult[0].reduce((acc, { type, name }) => {
            if (!acc[type]) acc[type] = [];
            acc[type].push(name);
            return acc;
        }, {});
        //   console.log('permissionsByType===========', permissionsByType);

        const token = await this.generateJWT(user, 'all');
        return {
            token,
            isAuthenticated: true,
            user: {
                ...detailedUser,
                //features: user.allPermissions ?? null,
                role: dbRole ? { name: roleName, id: dbRole.id } : null,
                permissions: permissionsByType
            }
        };
    }

    async verifyAccessToken(req: any, res: any): Promise<any> {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        // console.log('in verify access token service token is here ', token);

        if (!token) return res.status(401).json({ isAuthorized: false });
        let responseData = null;
        let decoded: any = null;
        decoded = await this.jwtService.verify(token, {
            secret: await this.secretService?.getSecret('JWT_ACCESS_SECRET')
        });
        // console.log('decoded', decoded);

        const foundUser = await this.userRepository.findOneBy({ email: decoded.email });
        if (!foundUser) {
            throw new UnauthorizedException(['Not Found User..']);
        } else {
            responseData = {
                isAuthorized: true,
                user: foundUser,
                accessToken: foundUser.accessToken,
                email: foundUser.email,
                id: foundUser.id
            };
        }
        try {
        } catch (err) {
            // console.log(' - verifyAccessToken - error during in verifyAccessToken', err.message);
            throw new UnauthorizedException(['Not Found User..']);
        }
    }

    // async singleSignOn(userId: number): Promise<any> {
    //     // Fetch user from DB using userId
    //     const dbUser = await this.userService.findOneById(userId);
    //     if (!dbUser) throw new NotAcceptableException('User not found');
    //     const allPermissions = await this.userFeatureActionService.findOne(dbUser.id);
    //     const { userType, clientId, employeeId } = dbUser;
    //     const genericId = userType === Roles.client ? clientId : employeeId;

    //     if (!genericId) throw new NotAcceptableException('Invalid user data: genericId not found');

    //     // Generate JWT Token with clientId/employeeId and userType
    //     const tokenPayload = {
    //         userType: userType,
    //         genericId: genericId
    //     };
    //     const token = await this.generateJWTViaId(tokenPayload, 'all');

    //     // Update User Info
    //     const updates: Partial<typeof dbUser> = {
    //         lastLogin: new Date(),
    //         accessToken: token,
    //         ...(dbUser.status !== 'active' && { status: 'active' })
    //     };

    //     await this.userService.findAndUpdateById(userType as Roles, genericId, updates);

    //     // Build base query
    //     let query = this.userRepository
    //         .createQueryBuilder('user')
    //         .leftJoinAndSelect('user.company', 'company')
    //         .leftJoinAndSelect('user.state', 'state');

    //     // Conditionally join the relevant table
    //     if (userType === Roles.client) {
    //         query = query.leftJoinAndSelect('user.client', 'client').leftJoinAndSelect('client.branch', 'branch');
    //     } else {
    //         query = query.leftJoinAndSelect('user.employee', 'employee').leftJoinAndSelect('employee.branch', 'branch');
    //     }

    //     // Execute query using userId
    //     const detailedUser = await query.where('user.id = :userId', { userId }).getOne();

    //     if (!detailedUser) throw new NotFoundException('User details not found');

    //     // Get Role Information
    //     const dbRole = await this.roleService.findOneByName(detailedUser.userType);
    //     const roleName = dbRole?.roleName ?? null;

    //     // Assign correct entity (Client or Employee)
    //     const genericEntity = userType === Roles.client ? detailedUser.client : detailedUser.employee;

    //     return {
    //         token,
    //         user: {
    //             ...detailedUser,
    //             features: allPermissions ?? null,
    //             role: dbRole ? { name: roleName, id: dbRole.id } : null
    //         },
    //         genericId: genericEntity?.id ?? null,
    //         branchId: genericEntity?.branch?.id ?? null
    //     };
    // }

    async changeInsuranceUserPassword(reqBody: any, req: any): Promise<any> {
        try {
            const { email, oldPassword, newPassword } = reqBody;

            const company = await this.companyService.findOneBy({ id: 2 });
            // console.log('in change password service company', company);

            let user = await this.userRepository.findOne({
                where: {
                    email,
                    company: { id: company.id }
                },
                relations: ['company']
            });
            // console.log('user in change password service', user);

            if (!user) {
                throw new NotAcceptableException(['User not found']);
            }
            const hashedNewPassword = await createPasswordHash(reqBody.newPassword);
            user.password = hashedNewPassword;
            const result = await this.userRepository.save(user);
            return {
                status: 'success',
                message: 'Password changed successfully',
                data: result
            };

            if (user.otp === reqBody.otp) {
                const currentDate = new Date(); // Current date and time
                const otpValidity = new Date(user.otpCreatedAt.getTime() + 5 * 60000);
                // console.log('otp validy is ', otpValidity);
                if (currentDate > otpValidity) {
                    return {
                        status: 'error',
                        message: 'OTP has expired. Please request a new OTP',
                        data: null
                    };
                } else {
                    const hashedNewPassword = await createPasswordHash(reqBody.newPassword);
                    user.password = hashedNewPassword;
                    const result = await this.userRepository.save(user);
                    if (!result) {
                        throw new BadRequestException('Error in changing password');
                    }
                    return {
                        status: 'success',
                        message: 'Password changed successfully',
                        data: null
                    };
                }
            } else {
                return {
                    status: 'error',
                    message: 'Invalid OTP',
                    data: null
                };
            }
        } catch (error) {
            console.error('Error in changeInsuranceUserPassword:', error);
            // If it's already a known exception, rethrow it
            if (error instanceof BadRequestException || error instanceof NotAcceptableException) {
                throw error;
            }

            // Otherwise throw a generic error
            throw new InternalServerErrorException('An unexpected error occurred while changing the password.');
        }
    }

    async otpForResetPassword(reqBody: any, req: any): Promise<any> {
        try {
            const { email } = reqBody;
            // console.log('email', email);

            const company = await this.companyService.findOneBy({ id: 2 });

            const user = await this.userRepository.findOne({
                where: {
                    email,
                    company: { id: company.id }
                },
                relations: ['company']
            });

            if (!user) {
                throw new NotAcceptableException(['User not found']);
            }
            const otp = generateOTP();
            user.otp = otp;
            user.otpCreatedAt = new Date();
            const savedUser = await this.userRepository.save(user);
            if (savedUser) {
                // console.log('otp', otp);
                let htmlContent = sendOtpForForgotPassword(email, otp, user.firstName);
                const mailedData = await this.emailService.sendEmail(email, 'Reset Password', htmlContent);
                // console.log('mailedData', mailedData);

                if (!mailedData) {
                    throw new InternalServerErrorException('Email not sent');
                }
                return {
                    status: 'success',
                    message: 'Email send successfully',
                    data: null
                };
            }
        } catch (error) {
            console.error('Error in otpForResetPassword:', error);
            // If it's already a known exception, rethrow it
            if (error instanceof BadRequestException || error instanceof NotAcceptableException) {
                throw error;
            }

            // Otherwise throw a generic error
            throw new InternalServerErrorException('An unexpected error occurred while sending otp.');
        }
    }
}
