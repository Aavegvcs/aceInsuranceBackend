import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { SecretService } from './aws-secrets.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AwsService } from './aws.service';
import { ApiTags } from '@nestjs/swagger';
import { throwError } from 'rxjs';
import { Console } from 'console';
@ApiTags('s3')
@Controller('s3')
export class AwsController {
    constructor(private readonly awsService: AwsService) {}

    @Post('upload/:documentType')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage()
        })
    )
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Param('documentType') documentType: string
        // @Param('associatedId') associatedId: string,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        // console.log("in aws controller-------------");
        
        // const result =  this.awsService.uploadFile(file, documentType);
          return this.awsService.uploadFile(file, documentType);
        //   return { fileUploaded: false, name: 'testingfile_uuiueiuiiedjfkjk.pdf' };
    }


    @Get('getDocument/:documentType/:fileName')
    async getFile(
        @Param('documentType') documentType: string,
        @Param('fileName') fileName: string,
        @Res() res: any
    ) {
        try {
            
            await this.awsService.getFile(documentType, fileName, res);
        } catch (error) {
             throw new BadRequestException('error in getting file');
        }
    }
}
