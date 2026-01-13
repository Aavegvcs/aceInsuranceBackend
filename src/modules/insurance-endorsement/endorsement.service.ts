import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InsuranceTicket } from '@modules/insurance-ticket/entities/insurance-ticket.entity';
import { User } from '@modules/user/user.entity';
import { standardResponse } from 'src/utils/helper/response.helper';
import { InsuranceEndorsementField } from './entities/insurance-endorsement-field.entity';
@Injectable()
export class EndorsementService {
    constructor(
        @InjectRepository(InsuranceEndorsementField)
        private readonly endorseFiledRepo: Repository<InsuranceEndorsementField>,
       @InjectRepository(InsuranceTicket)
        private readonly ticketRepo: Repository<InsuranceTicket>,
    ) {}

    async getEndorsementFiled(reqBody: any): Promise<any> {

        try {
            const { visibleTo} = reqBody;
            const query = this.endorseFiledRepo
                .createQueryBuilder('endorsementField')
                .select([
                    'endorsementField.id AS endorsementFieldId',
                    'endorsementField.visibleTo AS visibleTo',
                    'endorsementField.fieldType AS fieldType',
                    'endorsementField.fieldKey AS fieldKey',
                    'endorsementField.fieldLabel AS fieldLabel',
                    'endorsementField.isAlwaysVisible AS isAlwaysVisible',
                    'endorsementField.isPaymentRequired AS isPaymentRequired',
                    'endorsementField.isActive AS isActive',
                    
                ])
                .where('endorsementField.isActive = true');

            const result = await query.getRawMany();
            
            return standardResponse(
                true,
                'Features get successfully',
                200,
                result,
                null,
                'endorsement/getEndorsementFiled'
            );
        } catch (error) {
            console.log('error: api -endorsement/getEndorsementFiled');
            return standardResponse(
                false,
                'Error fetching insurance features',
                500,
                null,
                'endorsement/getEndorsementFiled'
            );
        }
    }
}
