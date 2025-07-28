interface FilterRequest {
    [key: string]: string;
}
interface SortOrder {
    [key: string]: 'asc' | 'desc';
}
// DTO is data transfer object
export class TestListDto {
    filter?: FilterRequest;
    sort?: SortOrder;
    page?: number;
    size?: number;
}
