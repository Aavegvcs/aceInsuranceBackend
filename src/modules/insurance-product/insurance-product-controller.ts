import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsuranceProductService } from './insurance-product.service';
import { CreateInsuranceProductDto, UpdateInsuranceProductDto } from './dto/insurance-product.dto';
import { CreateInsuranceCompanyDto, UpdateInsuranceCompanyDto } from './dto/insurance-companies.dto';
import { CreateInsuranceSubTypeDto, UpdateInsuranceSubTypeDto } from './dto/insurance-subtype.dto';
import { CreateInsurancePurchasedDto } from './dto/insurance-purchased.dto';
import { Insurance_Type } from 'src/utils/app.utils';
import { JwtAuthGuard } from '@modules/auth/jwt-auth.guard';
import { UserService } from '@modules/user/user.service';
import { LoggedInsUserService } from '@modules/auth/logged-ins-user.service';
import { JwtInsAuthGuard } from '@modules/auth/jwt-ins-auth.guard';

@ApiTags('insurance-product')
@Controller('insurance-product')
export class InsuranceProductController {
    constructor(private readonly _productService: InsuranceProductService) {}


    //---------------------------- insurance companies apis ----------------------------//

    @Post('createCompany')
    @ApiOperation({ summary: 'Create a new company' })
    async productCompanyCreate(@Body() reqeustParam: CreateInsuranceCompanyDto) {
        return this._productService.createCompany(reqeustParam);
    }

   @UseGuards(JwtInsAuthGuard)
    @Post('updateCompany')
    @ApiOperation({ summary: 'update existing compnay' })
    async companyUpdate(@Body() reqBody: any, @Req() req: any) {

        // console.log('here in update company', loggedInUser);
        return this._productService.updateCompany(reqBody, req);
    }
   @UseGuards(JwtInsAuthGuard)
    @Get('getAllCompany')
    @ApiOperation({ summary: 'get all company' })
    async getAllCompany() {
        // console.log('get all company');
        return this._productService.getAllCompany();
    }

    @Get('getInsuranceCompany')
    @ApiOperation({ summary: 'get all insurance company' })
    async getInsuranceCompany() {
        return this._productService.getInsuranceCompany();
    }

    @Get('getCompanyById/:id')
    @ApiOperation({ summary: 'get employee by id' })
    async getCompanyById(@Param('id') id: number) {
        return this._productService.getCompanyById(id);
    }
    @Post('deleteComany')
    @ApiOperation({ summary: 'delete company' })
    async deleteCompany(@Body() reqBody: any) {
        return this._productService.deleteCompany(reqBody);
    }
    //---------------------------- products apis ----------------------------//
    @Post('createProduct')
    @ApiOperation({ summary: 'Create new insurance product' })
    async createProduct(@Body() requestObj: CreateInsuranceProductDto) {
        return this._productService.createProduct(requestObj);
    }

    @Patch('updateProduct')
    @ApiOperation({ summary: 'Update insurance product' })
    async updateProduct(@Body() reqBody: any, @Req() req: any) {

        return this._productService.updateProduct(reqBody, req);
    }

    @Get('getAllProduct')
    @ApiOperation({ summary: 'Get all active insurance products' })
    async getAllProducts() {
        return this._productService.getAllProducts();
    }

    @Get('getProduct/:id')
    @ApiOperation({ summary: 'Get insurance product by ID' })
    async getProductById(@Param('id') id: number) {
        return this._productService.getProductById(id);
    }

    @Get('getAllProductByCompany/:id')
    @ApiOperation({ summary: 'Get insurance product by ID' })
    async getAllByCompany(@Param('id') id: number) {
        return this._productService.getAllProductByCompany(id);
    }

    @Post('getAllProductByType')
    @ApiOperation({ summary: 'Get insurance product by ID' })
    async getAllProductByType(@Body() reqBody:any) {
        return this._productService.getAllProductByType(reqBody);
    }

    //---------------------------- product sub type apis ----------------------------//
    @Post('createSubType')
    @ApiOperation({ summary: 'create new insurance subtype' })
    async subtypeCreate(@Body() reqeustObj: CreateInsuranceSubTypeDto) {
        return this._productService.createSubType(reqeustObj);
    }

    @Patch('updateSubtype/:id')
    @ApiOperation({ summary: 'update insurance subtype' })
    async subtypeUpdate(@Param('id') id: number, @Body() reqeustObj: UpdateInsuranceSubTypeDto) {
        return this._productService.updateSubType(id, reqeustObj);
    }

    @Get('getSubType')
    @ApiOperation({ summary: 'get all active insurance subtype' })
    async getSubType() {
        return this._productService.getAllSubTypes();
    }

    //---------------------------- product purchased apis ----------------------------//
    @Post('purchased')
    @ApiOperation({ summary: 'purchase new insurance product' })
    async createdPurchasedProduct(@Body() requestObj: CreateInsurancePurchasedDto, @Req() req: any) {
        return this._productService.purchasedProduct(requestObj, req);
    }

    @Post('getPurchasedProduct')
    @ApiOperation({ summary: 'Get all active insurance products' })
    async getAllPurchasedProducts(@Body() requestObj: any) {
        return this._productService.getAllPurchasedProducts(requestObj);
    }

    @Post('getProductByIds')
    @ApiOperation({ summary: 'Get purchased products by purchsae id, policy number and product id' })
    async getProductByIds(@Body() reqObj: any) {
        return this._productService.getProductByIds(reqObj);
    }

    @Get('insuranceType')
    getInsuranceTypes() {
        return Object.values(Insurance_Type);
    }

    @Post('deleteProduct')
    @ApiOperation({ summary: 'delete product' })
    async deleteProduct(@Body() reqBody: any, @Req() req: any) {
        return this._productService.deleteProduct(reqBody, req);
    }

    
    @Post('getProductForSelection')
    @ApiOperation({ summary: 'Get purchased products by purchsae id, policy number and product id' })
    async getProductForSelection(@Body() reqObj: any) {
        return this._productService.getProductForSelection(reqObj);
    }
}
