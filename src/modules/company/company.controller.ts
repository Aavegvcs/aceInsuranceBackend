import { Controller, Get, Post, Body, Param, Req, UseGuards, Put } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyCreateDto } from './dto/company-create.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from '../media/media.service';
import { ApiTags } from '@nestjs/swagger';
import { CompanyUpdateDto } from './dto/update-company.dto';
import { SETTINGS } from 'src/utils/app.utils';
@ApiTags('Company')
@Controller('companies')
export class CompanyController {
    constructor(
        private readonly companyService: CompanyService,
        private authService: AuthService,
        private mediaService: MediaService
    ) {}

    // @UseGuards(JwtAuthGuard)
    @Post('create')
    async create(@Body() createCompanyDto: CompanyCreateDto, @Req() req: any) {
        await this.companyService.create(createCompanyDto, req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('list')
    async companyList(@Req() req: any): Promise<any> {
        const { res, qb } = await this.companyService.companyList(req);

        return {
            items: res,
            qb
        };
    }

    @UseGuards(JwtAuthGuard)
    @Post('edit')
    async findOne(@Req() req: any) {
        return await this.companyService.findOneById(req.body.id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('update')
    async updateOne(@Body(SETTINGS.VALIDATION_PIPE) updateCompanyDto: CompanyUpdateDto, @Req() req: any) {
        return await this.companyService.updateCompany(updateCompanyDto, req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('delete')
    async deleteCompany(@Req() req: any) {
        return await this.companyService.deleteCompany(req);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findOneById(@Param() params: any) {
        await this.companyService.findCompanyById(params.id);
    }
}
