import {
    Controller,
    Get,
    Post,
    Patch,
    UseGuards,
    Body,
    Req,
    Res,
    MethodNotAllowedException,
    HttpStatus,
    Param,
    Headers,
    HttpCode,
    UnauthorizedException,
    Inject,
    forwardRef,
    Request,
    Logger,
    BadRequestException
} from '@nestjs/common';
import { UserRegisterDto } from '../user/dto/user-register-dto';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthService } from './auth.service';
import { Roles, SETTINGS } from 'src/utils/app.utils';
import { UserService } from '../user/user.service';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { NotificationService } from '../notification/notification.service';
import { UserLoginDto } from '../user/dto/user-login-dto';
import { UserVerifyOTPDto } from '../user/dto/user-verifyOTP-dto';
import { UserForgotPassDto } from '../user/dto/user-forgotPassword-dto';
import { UserResetPassDto } from '../user/dto/user-resetPass-dto';
import { VerifyOTPResponseDto } from '../user/dto/response/verify-otp-dto';
import { RegisterResponseDto } from '../user/dto/response/register-dto';
import { LoginResponseDto } from '../user/dto/response/login-dto';
import { ResendOTPResponseDto } from '../user/dto/response/resendOTP-dto';
import { UserDeleteDto } from '../user/dto/user-delete-dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from './tokens.service';

@ApiTags('Auth')
@Controller()
export class AuthController {
    constructor(
        private authService: AuthService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService,
        private notifyService: NotificationService,
        private tokenService: TokenService
    ) { }

    @Post('register')
    @ApiCreatedResponse({
        description: 'user registered successfully and OTP sent successfully',
        type: RegisterResponseDto
    })
    @ApiBadRequestResponse({
        description: 'user not registered'
    })
    

    @Post('generate-token')
    @ApiOkResponse({
        description: 'Access token generated successfully',
        type: Object
    })
    @ApiBadRequestResponse({
        description: 'Token generation failed'
    })
    @HttpCode(HttpStatus.OK)

    @Get('verify-forgot-password/:id/:token')
    async verifyForgotPass(@Param() params: any, @Res() res): Promise<any> {
        return await this.authService.verifyForgotPass(params, res);
    }

    @Patch('reset-password')
    @ApiCreatedResponse({
        description: 'Reset-Password is successful'
    })
    @ApiBadRequestResponse({
        description: 'Reset-Password is not processable'
    })
    @HttpCode(HttpStatus.NO_CONTENT)
    async resetPass(
        @Body(SETTINGS.VALIDATION_PIPE) data: UserResetPassDto,
        @Headers('authorization') authorizationHeader: string
    ): Promise<any> {
        return await this.authService.resetPass(data, authorizationHeader);
    }

    // @UseGuards(JwtAuthGuard)
    // @Post('logout')
    // @ApiCreatedResponse({
    //     description: 'Logged-out successfuly'
    // })
    // @ApiBadRequestResponse({
    //     description: 'Log-out Failed'
    // })
    // @HttpCode(HttpStatus.NO_CONTENT)
    // async logout(
    //     @Headers('authorization') authorizationHeader: string,
    //     @Req() req,
    //     @Res({ passthrough: true }) res
    // ): Promise<any> {
    //     if (req.user.forRoutes !== 'all') throw new MethodNotAllowedException(['not allowed']);
    //     return await this.authService.logout({ user: req.user, cookies: req.cookies, res });
    // }

    @Get('refresh')
    async refreshToken(@Request() req: any, @Res({ passthrough: true }) res: any): Promise<any> {
        return { token: await this.authService.handleRefreshToken(req, res) };
    }

    @UseGuards(JwtAuthGuard)
    @Get('test')
    async testCookie(@Headers('authorization') authorizationHeader: string, @Res() res): Promise<any> {
        return 'THIS IS A TEST';
    }

    @Post('conference-token')
    async conferenceToken(@Body() body: any): Promise<any> {
        return { token: await this.tokenService.conferenceToken(body) };
    }

    @Post('verifyAccessToken')
    async verifyAccessToken(@Request() req: any, @Res() res: any): Promise<any> {
        // console.log('is verify token calling api============');

        return await this.authService.verifyAccessToken(req, res);
    }

    @Post('loginInsuranceUser')
    async loginInsuranceUser(@Body() body: any, @Request() req: any,): Promise<any> {
        //  console.log("is loginInsuranceUser calling api============");

        return await this.authService.loginInsuranceUser(body, req);
    }

    @Post('changePassword')
    async changeInsuranceUserPassword(@Body() body: any, @Request() req: any,): Promise<any> {
        // console.log("is loginInsuranceUser calling api============");

        return await this.authService.changeInsuranceUserPassword(body, req);
    }


    // this is for insurance
    @Post('otpForResetPassword')
    async otpForResetPassword(@Body() body: any, @Request() req: any,): Promise<any> {


        return await this.authService.otpForResetPassword(body, req);
    }

    @Post('generateAccessToken')
    async generateAccessToken(@Body() body: { genericId: string; userType: string; category: string; expiresIn?: string }): Promise<any> {
        const { genericId, userType, category, expiresIn = '30d' } = body;
        const token = await this.authService.generateJWTViaId({ genericId, userType }, category, expiresIn);
        return { accessToken: token };
    }

}
