import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

interface ApiResponse {
    DATA: any[][];
    COLUMNS: string[];
}

@Injectable()
export class TechexcelService {
    private readonly baseUrl = 'http://hobackoffice.acumengroup.in:8080/techexcelapi/index.cfm';
    private readonly defaultParams = {
        UrlUserName: process.env.UrlUserName,
        UrlPassword: process.env.UrlPassword,
        UrlDatabase: process.env.UrlDatabase,
        UrlDataYear: new Date().getFullYear().toString(),
    };

    private readonly logger = new Logger(TechexcelService.name);

    constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {}

    async get(endpoint: string, extraParams: any = {}): Promise<any> {
        const url = `${this.baseUrl}/${endpoint}`;
        const params = { ...this.defaultParams, ...extraParams };

        try {
            const response = await firstValueFrom(this.httpService.get(url, { params }));
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch data from ${url}: ${error.message}`);
            throw new InternalServerErrorException('API request failed');
        }
    }

    async getClientMaster(clientCode: string): Promise<ApiResponse> {
        if (!clientCode) {
            throw new BadRequestException('Client code is required');
        }

        const apiUrl = `${this.baseUrl}/ClientList/ClientList`;
        const apiParams = {
            CLIENT_ID: clientCode,
            FROM_DATE: '',
            TO_DATE: '',
            ...this.defaultParams,
        };

        try {
            const response = await firstValueFrom(
                this.httpService.get(apiUrl, {
                    params: apiParams,
                    headers: {
                        Cookie: process.env.API_COOKIE || 'JSESSIONID=_24RXTFxrSVDgi0f8dwtbPxa8I6IoMlGavXT_EVx; cfid=8509090e-2b1b-4db6-b4fc-78aaf94ab3d3; cftoken=0',
                    },
                }),
            );
            const json = response.data;
            if (!json.DATA || !json.COLUMNS) {
                throw new BadRequestException('Invalid API response: Missing DATA or COLUMNS');
            }
            return json as ApiResponse;
        } catch (error) {
            this.logger.error(`Failed to fetch client data for clientCode ${clientCode}: ${error.message}`);
            throw new InternalServerErrorException(`Failed to fetch client data: ${error.message}`);
        }
    }
}