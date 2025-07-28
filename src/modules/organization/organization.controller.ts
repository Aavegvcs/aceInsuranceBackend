import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/response/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from '../media/media.service';
import { AddressService } from '../address/address.service';

@Controller('organization')
export class OrganizationController {
    constructor(
        private readonly organizationService: OrganizationService,
        private authService: AuthService,
        private mediaService: MediaService,
        private addressService: AddressService
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post('orgcreate')
    create(@Body() createOrganizationDto: CreateOrganizationDto, @Req() req: any) {
        return this.organizationService.create(createOrganizationDto, req);
    }

    @UseGuards(JwtAuthGuard)
    @Get('orgdata')
    async findAll() {
        const orgData = await this.organizationService.findAll();

        return {
            ...orgData?.[0]
        };
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.organizationService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
        return this.organizationService.update(+id, updateOrganizationDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.organizationService.remove(+id);
    }
}
