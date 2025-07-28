import { Injectable } from '@nestjs/common';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserRole } from './entities/user-role.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
@Injectable()
export class UserRoleService {
    constructor(
        @InjectRepository(UserRole)
        private userRoleRepo: Repository<UserRole>
    ) {}

    async create(userId: number, roleId: number) {
        const newUserRole = new UserRole();
        newUserRole.userId = userId;
        newUserRole.roleId = roleId;

        await this.userRoleRepo.save(newUserRole);
    }

    findAll() {
        return `This action returns all userRole`;
    }

    findOne(id: number) {
        return `This action returns a #${id} userRole`;
    }

    async findByRoleId(roleId: number) {
        return await this.userRoleRepo.findOneBy({ roleId });
    }

    async updateUserRole(dbUserRole: UserRole, updates: any) {
        let newUserRole = {
            ...dbUserRole,
            ...updates
        };
        return await this.userRoleRepo.save(newUserRole);
    }

    async findByUserId(userId: number) {
        return await this.userRoleRepo.findOneBy({ userId });
    }

    update(id: number, updateUserRoleDto: UpdateUserRoleDto) {
        return `This action updates a #${id} userRole`;
    }

    async remove(id: number) {
        return await this.userRoleRepo.delete({ id });
    }

    async deleteRecordsForRole(roleId: number) {
        const recordsToDelete = await this.userRoleRepo.find({
            where: {
                roleId: roleId
            }
        });

        if (!recordsToDelete || !recordsToDelete.length) return null;

        // Delete the records
        await this.userRoleRepo.remove(recordsToDelete);
    }

    async getRolesForAllStaff(staffIds: number[]): Promise<UserRole[]> {
        return await this.userRoleRepo
            .createQueryBuilder('userRole')
            .leftJoinAndSelect('userRole.userId', 'user')
            .leftJoinAndSelect('userRole.roleId', 'role')
            .where(`userRole.userId IN (:...staffIds)`, { staffIds })
            .getMany();
    }
}
