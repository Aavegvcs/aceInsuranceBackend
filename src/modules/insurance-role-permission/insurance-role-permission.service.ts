import { BadRequestException, Injectable, NotAcceptableException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/user/user.entity';
import { InsuranceRoleAccess } from './entities/insurance-role-access.entity';
import { USER_STATUS } from 'src/utils/app.utils';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { InsurancePermission } from './entities/insurance-permission.entity';
import { log } from 'console';
@Injectable()
export class InsuranceRolePermissionService {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,

        @InjectRepository(InsuranceRoleAccess)
        private readonly roleAccessRepo: Repository<InsuranceRoleAccess>,

        @InjectRepository(InsurancePermission)
        private readonly permissionRepo: Repository<InsurancePermission>,

        private readonly loggedInsUserService: LoggedInsUserService
    ) {}

    async getRoleMappingForUpdate(reqBody: any, req: any): Promise<any> {
        const loggedInUser = this.loggedInsUserService.getCurrentUser();
        if (!loggedInUser) {
            throw new UnauthorizedException('User not logged in');
        }
        const roleId = reqBody.roleId;
        // console.log('roleId--------', roleId);
        const permissionResult = await this.roleAccessRepo.query('CALL get_roleMappingForUpdate(?)', [roleId]);
        const res_message = permissionResult[1][0].responseMessage;

        return {
            status: 'success',
            message: res_message,
            data: permissionResult[0]
        };
    }

    async updateRoleMapping(reqBody: any, req: any): Promise<any> {
        const loggedInUser = this.loggedInsUserService.getCurrentUser();
        if (!loggedInUser) {
            throw new UnauthorizedException('User not logged in');
        }
        const { roleId, permissions } = reqBody;
        // console.log('req body--------', roleId, permissions, loggedInUser.id);

        const result = await this.roleAccessRepo.query('CALL ins_roleMapping(?, ?, ?)', [
            roleId,
            permissions,
            loggedInUser.id
        ]);
        // console.log('result--------', result[0][0]);
        const res_message = result[0][0].responseMessage;
        if (res_message == 'success') {
            return {
                status: 'success',
                message: res_message,
                data: null
            };
        } else {
            return {
                status: 'failed',
                message: res_message,
                data: null
            };
        }
    }

    async createPermission(reqBody: any, req: any): Promise<any> {
        const loggedInUser = this.loggedInsUserService.getCurrentUser();
        if (!loggedInUser) {
            throw new UnauthorizedException('User not logged in');
        }
        const { name, type, module, description } = reqBody;
        const result = await this.permissionRepo.query('CALL ins_permission(?, ?, ?, ?, ?)', [
            name,
            type,
            module,
            description,
            loggedInUser.id
        ]);
        // console.log('result--------', result[0][0]);
        const res_message = result[0][0].responseMessage;
        if (res_message == 'success') {
            return {
                status: 'success',
                message: res_message,
                data: null
            };
        } else {
            return {
                status: 'failed',
                message: res_message,
                data: null
            };
        }
    }

    async updatePermission(reqBody: any, req: any): Promise<any> {
        try {
            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            // console.log('loggedInUser--------', loggedInUser);
            if (!loggedInUser) {
                throw new UnauthorizedException('User not logged in');
            }
            const { id, name, type, module, description, status } = reqBody;
            const result = await this.permissionRepo.query('CALL update_permission(?, ?, ?, ?, ?, ?, ?)', [
                id,
                name,
                type,
                module,
                description,
                status,
                loggedInUser.id
            ]);
            // console.log('result--------', result[0][0]);
            const res_message = result[0][0].responseMessage;
            if (res_message == 'success') {
                return {
                    status: 'success',
                    message: res_message,
                    data: null
                };
            } else {
                console.log('-api- insurance-role-permission/updatePermission', res_message);
                return {
                    status: 'failed',
                    message: res_message,
                    data: null
                };
            }
        } catch (err) {
            console.log('-api- insurance-role-permission/updatePermission', err.message);
            return {
                status: 'failed',
                message: err.message,
                data: null
            };
        }
    }

    async getPermission(reqBody: any, req: any): Promise<any> {
        const loggedInUser = this.loggedInsUserService.getCurrentUser();
        if (!loggedInUser) {
            throw new UnauthorizedException('User not logged in');
        }
        const result = await this.permissionRepo.query('CALL get_permission()');
        // console.log('result--------', result[0]);

        return {
            status: 'success',
            message: 'Data fetched successfully',
            data: result[0]
        };
    }

    async deletePermission(reqBody: any) {
        let result = {};
        try {
            const { permissionId } = reqBody;
            const loggedInUser = this.loggedInsUserService.getCurrentUser();
            if (!loggedInUser) {
                throw new UnauthorizedException('User not logged in');
            }

            if (!permissionId) {
                throw new BadRequestException('Permission Id is required.');
            }

            result = await this.permissionRepo.update(permissionId, {
                isActive: false,
                deletedAt: new Date(),
                updatedAt: new Date(),
                updatedBy: loggedInUser
            });
            return (result = {
                status: 'success',
                message: 'Permission deleted successfully',
                data: null
            });
        } catch (error) {
            console.log('-api- insurance-role-permission/deletePermission', error.message);

            return (result = {
                status: 'error',
                message: 'Failed! to delete permission',
                data: null
            });
        }
    }
}
