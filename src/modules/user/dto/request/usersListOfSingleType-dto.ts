import { IsNotEmpty } from '@nestjs/class-validator';
import { ApiProperty } from '@nestjs/swagger';
export interface FilterRequest {
    [key: string]: (string | number)[] | FilterRequest;
}
interface SortOrder {
    [key: string]: 'asc' | 'desc';
}

// DTO is data transfer object
export class UsersListOfTypeDto {
    status?: string;
    filters?: FilterRequest;
    sort?: SortOrder;
    page?: number;
    size?: number;
    @ApiProperty({
        description: 'Id of Filter-Role',
        example: '1'
    })
    @IsNotEmpty()
    filterRoleIds: number[];

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
