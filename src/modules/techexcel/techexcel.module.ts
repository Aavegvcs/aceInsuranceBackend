import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TechexcelService } from './techexcel.service';

@Module({
    imports: [HttpModule], // Register HttpModule to use HttpService
    providers: [TechexcelService],
    exports: [TechexcelService] // Make available for injection
})
export class TechexcelModule {}
