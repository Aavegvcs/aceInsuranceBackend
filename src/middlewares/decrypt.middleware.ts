import {
    Injectable,
    InternalServerErrorException,
    Logger,
    NestMiddleware,
    NotAcceptableException
} from '@nestjs/common';
import { decryptData } from 'src/utils/encryption.utils';

@Injectable()
export class DecryptDataMiddleware implements NestMiddleware {
    async use(req: any, res: any, next: () => void) {
        // Check if the request path is in the exclusion list

        const excludedRoutes = ['/backend/encrypt', '/backend/decrypt', '/backend/status', '/backend/apidata', '/backend/generate-token-via-app'];

        // Logger.log('req.originalUrl--  ', req?.originalUrl);

        if (excludedRoutes.includes(req.originalUrl)) {
            // Skip this middleware for excluded routes
            return next();
        }

        if (!req.headers['content-type'] || !req?.body?.string) {
            return next();
        } else {
            try {
                const decryptedData = await decryptData(req?.body?.string);

                //  Logger.log('decryptedData--  ', JSON.parse(decryptedData));
                // Update the request body with and transformed data

                const _obj = JSON.parse(decryptedData);
                req.body = _obj.message === 'success' ? _obj.data : _obj;

                // Continue processing the request
                next();
            } catch (error) {
                if (error.code === 'ERR_OSSL_WRONG_FINAL_BLOCK_LENGTH') {
                    throw new NotAcceptableException(['Format Not acceptable']);
                }

                throw new InternalServerErrorException(['Server Error']);
            }
        }
    }
}
