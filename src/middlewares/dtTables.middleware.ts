import { Injectable, NestMiddleware } from '@nestjs/common';
@Injectable()
export class CheckDtTableMiddleware implements NestMiddleware {
    async use(req: any, res: any, next: () => void) {
        const QUERY_STRING = {
            orderBy: {},
            where: {},
            skip: null,
            limit: null,
            pageNumber: req?.body?.page
        };

        if (req?.body?.sort) {
            const [[key, value]] = Object.entries(req?.body?.sort);

            QUERY_STRING['orderBy'] = {
                key,
                value: String(value).trim().toUpperCase() as 'ASC' | 'DESC'
            };
        } else if (!req?.body?.sort) {
            QUERY_STRING['orderBy'] = {
                key: null,
                value: 'DESC' as 'ASC' | 'DESC'
            };
        }

        if (req?.body?.filters) {
            Object.entries(req?.body?.filters).forEach(([key, value]) => {
                QUERY_STRING['where'] = {
                    ...QUERY_STRING['where'],
                    [key]: value
                };
            });
        }

        if (req?.body?.page && req?.body?.size) {
            const { page, size } = req?.body;
            if (page > 1) {
                QUERY_STRING['skip'] = (page - 1) * size;
            }
        }

        if (req?.body?.size) {
            QUERY_STRING['limit'] = req?.body?.size;
        }

        req.QUERY_STRING = QUERY_STRING;

        next();
    }
}
