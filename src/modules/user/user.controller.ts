import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    UseGuards,
    Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import {ApiTags } from '@nestjs/swagger';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';
@ApiTags('User')
@Controller('users')
export class UserController {
    constructor(private userService: UserService) {}

    @UseGuards(JwtInsAuthGuard)
    @Post('getUserByCompanyId')
    async getUserByCompanyId(@Body() reqBody: any, @Req() req: any) {
        // console.log('in getUserByCompanyId');

        return await this.userService.getUserByCompanyId(reqBody);
    }

    @Get('getUserForFilter')
    async getUserForFilter() {
        return await this.userService.getUserForFilter();
    }

    @Post('getUserById')
    async getUserById(@Body() reqBody: any) {
        return await this.userService.getUserById(reqBody);
    }

    @Get('getEmployeeRo')
    async getEmployeeRo(@Body() reqBody: any) {
        return await this.userService.getEmployeeRo(reqBody);
    }

}
