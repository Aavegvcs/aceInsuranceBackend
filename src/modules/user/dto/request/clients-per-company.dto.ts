import { ApiProperty } from '@nestjs/swagger';
// DTO is data transfer object
export class ClientsPerCompanyDto {
    @ApiProperty({
        description: 'Id of Filter-Role',
        example: '1'
    })
    filterRoleId: number;

    @ApiProperty({
        description: 'Id of User-Role',
        example: '1'
    })
    userRoleId: number;

    @ApiProperty({
        description: 'Id of Logged-in User',
        example: '2'
    })
    userId?: number;

    @ApiProperty({
        description: `Id of User's company`,
        example: '3'
    })
    companyId?: number;
}
