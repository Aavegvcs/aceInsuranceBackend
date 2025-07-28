import { SetMetadata } from '@nestjs/common';
interface FilterRequest {
    [key: string]: string;
}

interface SortOrder {
    [key: string]: 'asc' | 'desc';
}

export interface RequiredRule {
    Filter?: FilterRequest;
    Sort?: SortOrder;
}

export const CHECK_DT_TABLE_PARAMS = 'check_dataTable_params';

export const CheckAbilities = (...requirements: RequiredRule[]) => SetMetadata(CHECK_DT_TABLE_PARAMS, requirements);
