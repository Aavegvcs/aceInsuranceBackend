import { Controller, Get, Post, Request } from '@nestjs/common';
import { AppService } from './app.service';

import { ApiTags } from '@nestjs/swagger';
import { encryptData, decryptData } from './utils/encryption.utils';

@ApiTags('Application')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get('status')
    getStatus(): string {
        return this.appService.getStatus();
    }

    @Post('encrypt')
    encrypt(@Request() req): Promise<any> {
        let data = req.body.string;
        return encryptData(data);
    }

    @Post('decrypt')
    decrypt(@Request() req): Promise<any> {
        let encryptedData = req.body.string;
        return decryptData(encryptedData);
    }
}
