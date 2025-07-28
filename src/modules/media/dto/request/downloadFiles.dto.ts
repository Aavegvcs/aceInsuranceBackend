import { IsArray } from '@nestjs/class-validator';
import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class DownloadFilesDto {
    @IsArray()
    fileNames: string[];
}
