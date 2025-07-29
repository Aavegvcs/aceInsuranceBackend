import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RoleFeatureActionService } from '../role-feature-action/role-feature-action.service';
import { UserRoleService } from '../user-role/user-role.service';
import { UserService } from '../user/user.service';
import { orderByKey, orderByValue } from 'src/utils/app.utils';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private roleRepo: Repository<Role>,
        @Inject(forwardRef(() => RoleFeatureActionService))
        private roleFeatureActionService: RoleFeatureActionService,
        private userRoleService: UserRoleService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService
    ) {}

    async create(createRoleDto: CreateRoleDto) {
        const role = new Role();
        role.roleName = createRoleDto.roleName;

        const { roleName } = await this.roleRepo.save(role);

        return roleName;
    }

    // async findAll(body: any, req: any): Promise<any> {
    //     const items = await this.roleRepo
    //         .createQueryBuilder('role')
    //         .where(req?.QUERY_STRING?.where)
    //         .skip(req?.QUERY_STRING?.skip)
    //         .take(req?.QUERY_STRING?.limit)
    //         .orderBy(
    //             orderByKey({
    //                 key: req?.QUERY_STRING?.orderBy?.key,
    //                 repoAlias: 'role'
    //             }),
    //             orderByValue({ req })
    //         )
    //         .getMany();

    //     const qb = this.roleRepo.createQueryBuilder('role').where(req?.QUERY_STRING?.where).select([]);

    //     return {
    //         items,
    //         qb
    //     };
    // }
    async findAll(body: any, req: any): Promise<any> {
    const baseWhere = req?.QUERY_STRING?.where || {};

    // Ensure isActive = true is always applied
    const items = await this.roleRepo
        .createQueryBuilder('role')
        .where('role.isActive = :isActive', { isActive: true })
        .andWhere(baseWhere)
        .skip(req?.QUERY_STRING?.skip)
        .take(req?.QUERY_STRING?.limit)
        .orderBy(
            orderByKey({
                key: req?.QUERY_STRING?.orderBy?.key,
                repoAlias: 'role'
            }),
            orderByValue({ req })
        )
        .getMany();

    const qb = this.roleRepo
        .createQueryBuilder('role')
        .where('role.isActive = :isActive', { isActive: true })
        .andWhere(baseWhere)
        .select([]);

    return {
        items,
        qb
    };
}


    async findOne(id: number) {
        return await this.roleRepo.findOneBy({ id });
    }

    async findOneByName(roleName: string): Promise<Role> {
        return await this.roleRepo.findOneBy({ roleName });
    }

    async findAndUpdateRole(roleId: number, updates: any): Promise<any> {
        let dbRole: Role = await this.findOne(roleId);
        if (!dbRole) throw new NotFoundException(['Role not found']);

        const { id, roleName, ...rest } = updates;

        dbRole = {
            ...dbRole,
            ...rest
        };

        return await this.roleRepo.save(dbRole);
    }

    async removeByName(roleName: string): Promise<any> {
        return await this.roleRepo.delete({ roleName });
    }

    async removeById(roleId: number): Promise<any> {
        const dbRole = await this.roleRepo.findOneBy({ id: roleId });
        if (!dbRole) throw new NotFoundException(['Role Not found']);

        // Hard-Delete Records for this Role in Junction Tables
        await this.roleFeatureActionService.deleteRecordsForRole(dbRole.id);
        await this.userRoleService.deleteRecordsForRole(dbRole.id);

        // Set 'userType' to null of all users with value of this Role's name
        await this.userService.bulkUpdate('userType', null, { userType: dbRole.roleName });

        // Soft-Delete from its own Table and Save
        dbRole.deletedAt = new Date(Date.now());
        await this.roleRepo.save(dbRole);
    }

    async getRolesForRoleNames(roleNames: string[]): Promise<Role[]> {
        return await this.roleRepo
            .createQueryBuilder('role')
            .where(`role.roleName IN (:...roleNames)`, { roleNames })
            .getMany();
    }
}
