import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { CreateRoleDto } from './dto/request/create-role.dto';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRoleService } from '../user-role/user-role.service';
import { UserService } from '../user/user.service';
import { orderByKey, orderByValue } from 'src/utils/app.utils';
import { User } from '@modules/user/user.entity';

@Injectable()
export class RoleService {
    constructor(
        @InjectRepository(Role)
        private roleRepo: Repository<Role>,
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

        async findOneById(id: number): Promise<Role> {
        return await this.roleRepo.findOneBy({ id });
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


    async getRolesForRoleNames(roleNames: string[]): Promise<Role[]> {
        return await this.roleRepo
            .createQueryBuilder('role')
            .where(`role.roleName IN (:...roleNames)`, { roleNames })
            .getMany();
    }
}
