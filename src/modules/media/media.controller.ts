// your.controller.ts
import {
    Controller,
    Post,
    Delete,
    UploadedFile,
    UseInterceptors,
    ParseFilePipe,
    Req,
    Body,
    UseGuards,
    Inject,
    forwardRef,
    Headers
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { Express } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { S3DeleteDto } from './dto/request/deleteS3-dto';
import { SETTINGS } from 'src/utils/app.utils';
import { UserService } from '../user/user.service';
import { ApiTags } from '@nestjs/swagger';
import { DownloadFileDto } from './dto/request/downloadFile.dto';
import { DownloadFilesDto } from './dto/request/downloadFiles.dto';

@ApiTags('Media')
@Controller()
export class MediaController {
    constructor(
        private readonly mediaService: MediaService,
        @Inject(forwardRef(() => UserService))
        private userService: UserService
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post('uploadFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdate(req.user.email, file);
    }

    @UseGuards(JwtAuthGuard)
    @Post('downloadFile')
    async downloadFile(@Req() req: any, @Body(SETTINGS.VALIDATION_PIPE) data: DownloadFileDto) {
        return await this.mediaService.downloadFile(data?.fileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('downloadFiles')
    async downloadFiles(@Req() req: any, @Body(SETTINGS.VALIDATION_PIPE) data: DownloadFilesDto) {
        return await this.mediaService.downloadFiles(data?.fileNames);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-userFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadUserFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateUserMedia(file, req.body.oldFileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-orgFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadOrgFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateOrgMedia(file, req.body.oldFileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-companyFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadCompanyFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateCompanyMedia(file, req.body.oldFileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-specialityFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadSpecialityFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateSpecialityMedia(file, req.body.oldFileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-therapistFile')
    @UseInterceptors(FileInterceptor('file'))
    async therapistFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateTherapistMedia(file, req.body.oldFileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-therapistIntroFile')
    @UseInterceptors(FileInterceptor('file'))
    async therapistIntroFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateTherapistIntroMedia(file, req.body.oldFileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-clientFile')
    @UseInterceptors(FileInterceptor('file'))
    async clientFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateClientMedia(file, req.body.oldFileName);
    }

    @Post('upload-publicClientFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadPublicClientFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        let fileName = file.originalname;

        return await this.mediaService.findAndUpdatePublicClientMedia(file, req.body.oldFileName, authorizationHeader);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-cmsFile')
    @UseInterceptors(FileInterceptor('file'))
    async cmsFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateCmsFile(file, req.body.oldFileName, req.body.fileType);
    }

    @UseGuards(JwtAuthGuard)
    @Post('upload-reviewFile')
    @UseInterceptors(FileInterceptor('file'))
    async reviewFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateReviewFile(file, req.body.oldFileName, req.body.fileType);
    }

    @Post('upload-websiteFile')
    @UseInterceptors(FileInterceptor('file'))
    async websiteFile(
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.findAndUpdateFileWebsite(file, req.body.oldFileName);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('deleteFile')
    async deleteUserFile(
        @Headers('authorization') authorizationHeader: string,
        @Req() req: any,
        @Body(SETTINGS.VALIDATION_PIPE) data: S3DeleteDto
    ): Promise<any> {
        await this.mediaService.deleteUserFile(req.user.email, data.fileName);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete-orgFile')
    async deleteOrganizatonFile(
        @Headers('authorization') authorizationHeader: string,
        @Req() req: any,
        @Body(SETTINGS.VALIDATION_PIPE) data: S3DeleteDto
    ): Promise<any> {
        await this.mediaService.deleteOrganizatonFile(2, data.fileName);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete-files')
    async deleteFiles(
        @Headers('authorization') authorizationHeader: string,
        @Req() req: any,
        @Body(SETTINGS.VALIDATION_PIPE) data: S3DeleteDto
    ): Promise<any> {
        await this.mediaService.deleteFiles(data.fileNames);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('delete-Onefile')
    async deleteOneFile(
        @Headers('authorization') authorizationHeader: string,
        @Req() req: any,
        @Body(SETTINGS.VALIDATION_PIPE) data: S3DeleteDto
    ): Promise<any> {
        await this.mediaService.deleteOneFile(data.fileName);
    }

    @UseGuards(JwtAuthGuard)
    @Post('uploadTestFile')
    @UseInterceptors(FileInterceptor('file'))
    async uploadTestFile(
        @Headers('authorization') authorizationHeader: string,
        @UploadedFile(
            new ParseFilePipe({
                validators: []
            })
        )
        file: Express.Multer.File,
        @Req() req: any
    ) {
        return await this.mediaService.uploadTestFile(file, req.body.oldFileName);
    }

    @Delete('deleteFileTest')
    async deleteFileTest(@Req() req: any): Promise<any> {
        await this.mediaService.deleteFileTest(req.body.fileName);
    }
}
