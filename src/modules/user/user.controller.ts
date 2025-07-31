import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    Request,
    Headers,
    UseGuards,
    Delete,
    HttpStatus,
    HttpCode,
    MethodNotAllowedException,
    Req,
    Param,
    NotFoundException,
    Patch
} from '@nestjs/common';
import { UserService } from './user.service';
import { Roles, SETTINGS } from 'src/utils/app.utils';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserUpdateDto } from './dto/user-update-dto';
import { UserChangePassDto } from './dto/user-changePass-dto';
import { UserVerifyOTPDto } from './dto/user-verifyOTP-dto';
import { UserCreateDto } from './dto/request/user-create-dto';
import { UserDeleteDto } from './dto/user-delete-dto';
import { UserEditDto } from './dto/request/user-edit-dto';
import { UsersListOfTypeDto } from './dto/request/usersListOfSingleType-dto';
import { ClientsPerCompanyDto } from './dto/request/clients-per-company.dto';
import { ClientStatusDto } from './dto/request/client-status.dto';
import { TestListDto } from './dto/request/testList.dto';

@ApiTags('User')
@Controller('users')
export class UserController {
    constructor(private userService: UserService) {}

    @Post('users')
    async getUserListOfSingleType(@Req() req: any, @Body(SETTINGS.VALIDATION_PIPE) data: UsersListOfTypeDto) {
        return await this.userService.getUserListOfSingleType(data, req);
    }

    @Put('users')
    async editUserType(@Body(SETTINGS.VALIDATION_PIPE) data: UserEditDto) {
        return await this.userService.editUserType(data.email, data);
    }

    @Post('create-user')
    async createUser(
        @Body(SETTINGS.VALIDATION_PIPE)
        userCreate: UserCreateDto
    ): Promise<any> {
        return { token: await this.userService.createUser(userCreate) };
    }

    @UseGuards(JwtAuthGuard)
    @Put('update-profile')
    @ApiCreatedResponse({
        description: 'Update user is successful'
    })
    @ApiBadRequestResponse({
        description: 'Update is not processable'
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateProfile(
        @Headers('authorization') authorizationHeader: string,
        @Request() req,
        @Body(SETTINGS.VALIDATION_PIPE) data: UserUpdateDto
    ): Promise<any> {
        if (req.user.forRoutes !== 'all') throw new MethodNotAllowedException(['not allowed']);
        return await this.userService.updateProfile(req.user.email, data);
    }

    @UseGuards(JwtAuthGuard)
    @Put('change-password')
    @ApiCreatedResponse({
        description: 'Change-Password is successful'
    })
    @ApiBadRequestResponse({
        description: 'Change-Password is not processable'
    })
    async changePass(
        @Headers('authorization') authorizationHeader: string,
        @Request() req,
        @Body(SETTINGS.VALIDATION_PIPE) data: UserChangePassDto
    ): Promise<any> {
        if (req.user.forRoutes !== 'all') throw new MethodNotAllowedException(['not allowed']);
        return {
            token: await this.userService.changePass(req.user.email, data)
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('verify-change-pass')
    @ApiCreatedResponse({
        description: 'Change-Password is successful'
    })
    @ApiBadRequestResponse({
        description: 'Change-Password is not processable'
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async verifyChangePass(
        @Headers('authorization') authorizationHeader: string,
        @Request() req,
        @Body(SETTINGS.VALIDATION_PIPE) data: UserVerifyOTPDto
    ): Promise<any> {
        if (req.user.forRoutes !== 'otp') throw new MethodNotAllowedException(['not allowed']);
        return await this.userService.verifyChangePass(req, data);
    }

    @UseGuards(JwtAuthGuard)
    @Get('profile')
    @ApiCreatedResponse({
        description: 'Get Profile is successful'
    })
    @ApiBadRequestResponse({
        description: 'Get Profile is not processable'
    })
    @HttpCode(HttpStatus.OK)
    async getProfile(@Headers('authorization') authorizationHeader: string, @Request() req): Promise<any> {
        if (req.user.forRoutes !== 'all') throw new MethodNotAllowedException(['not allowed']);
        return await this.userService.getProfile(req.user.email);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete')
    @ApiCreatedResponse({
        description: 'Delete user is successful'
    })
    @ApiBadRequestResponse({
        description: 'Delete is not processable'
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Request() req, @Body(SETTINGS.VALIDATION_PIPE) data: UserDeleteDto): Promise<any> {
        return await this.userService.removeByEmail(data.email);
    }

    @UseGuards(JwtAuthGuard)
    @Post('removeById')
    async removeById(@Request() req) {
        return await this.userService.removeById(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('userById')
    async findOne(@Req() req: any) {
        return await this.userService.findOneById(req.body.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('users/client/status')
    async toggleStatus(@Req() req: any, @Body(SETTINGS.VALIDATION_PIPE) body: ClientStatusDto) {
        const loggedInUser = await this.userService.findOneByEmailWithRelations(req?.user?.email);
        // if (!loggedInUser || loggedInUser?.userType !== Roles.staff) throw new NotFoundException('Staff not found');

        return await this.userService.setClientStatus(body);
    }

    @Post('users-test-list')
    async getTestList(@Req() req: any, @Body(SETTINGS.VALIDATION_PIPE) data: TestListDto) {
        return await this.userService.getTestList(data, req);
    }

   @UseGuards(JwtAuthGuard)
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
