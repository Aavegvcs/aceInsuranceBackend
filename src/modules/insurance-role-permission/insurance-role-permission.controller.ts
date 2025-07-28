import { Body, Controller, Get, HttpException, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';
import { InsuranceRolePermissionService } from './insurance-role-permission.service';

@ApiTags('insurance-role-permission')
@Controller('insurance-role-permission')
export class InsuranceRolePermissionController {
    constructor(private readonly _rolePermissionService: InsuranceRolePermissionService) {}

    @UseGuards(JwtInsAuthGuard)
    @Post('getRoleMappingForUpdate')
    async getRoleMappingForUpdate(@Body() reqBody: any, @Req() req: any) {
        try {
            return await this._rolePermissionService.getRoleMappingForUpdate(reqBody, req);
        } catch (error) {
            throw new HttpException('Failed to get role mapping data', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('updateRoleMapping')
    async updateRoleMapping(@Body() reqBody: any, @Req() req: any) {
        try {
            return await this._rolePermissionService.updateRoleMapping(reqBody, req);
        } catch (error) {
            throw new HttpException('Failed to get role mapping data', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @UseGuards(JwtInsAuthGuard)
    @Post('createPermission')
    async createPermission(@Body() reqBody: any, @Req() req: any) {
        try {
            return await this._rolePermissionService.createPermission(reqBody, req);
        } catch (error) {
            throw new HttpException('Failed to get create permission', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @UseGuards(JwtInsAuthGuard)
    @Patch('updatePermission')
    async updatePermission(@Body() reqBody: any, @Req() req: any) {
        try {
            return await this._rolePermissionService.updatePermission(reqBody, req);
        } catch (error) {
            throw new HttpException('Failed to update permission', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    @UseGuards(JwtInsAuthGuard)
    @Get('getPermission')
    async getPermission(@Body() reqBody: any, @Req() req: any) {
        try {
            return await this._rolePermissionService.getPermission(reqBody, req);
        } catch (error) {
            throw new HttpException('Failed to get permission', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Post('deletePermission')
    @ApiOperation({ summary: 'delete company' })
    async deletePermission(@Body() reqBody: any) {
        return this._rolePermissionService.deletePermission(reqBody);
    }
}
