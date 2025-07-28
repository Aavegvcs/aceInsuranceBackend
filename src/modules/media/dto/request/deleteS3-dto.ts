import { ApiProperty } from '@nestjs/swagger';

// DTO is data transfer object
export class S3DeleteDto {
    @ApiProperty({
        description: 'Name of File to be Deleted',
        example: 'abc.jpg'
    })
    fileName: string;

    @ApiProperty({
        description: 'Name of Files to be Deleted',
        example: ['deleteone.jpg', 'deletetwo.jpg', 'deletethree.jpg']
    })
    fileNames: string[];
}
