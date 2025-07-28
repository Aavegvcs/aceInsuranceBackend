import { Controller, Post, Body, Req, UseGuards, Put } from '@nestjs/common';
import { FeatureService } from './feature.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
@ApiTags('Features')
@Controller('features')
export class FeatureController {
    constructor(private readonly featureService: FeatureService) {}

    @UseGuards(JwtAuthGuard)
    @Post('create')
    create(@Req() req: any) {
        return this.featureService.create(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('list')
    async findAll(@Req() req: any, @Body() body: any) {
        return await this.featureService.findAll(body, req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('edit')
    async findOne(@Req() req: any) {
        return await this.featureService.findOneById(req.body.id);
    }

    @UseGuards(JwtAuthGuard)
    @Put('update')
    async updateOne(@Req() req: any) {
        return await this.featureService.update(req);
    }

    @UseGuards(JwtAuthGuard)
    @Post('delete')
    async delete(@Req() req: any) {
        return await this.featureService.delete(req);
    }
}
