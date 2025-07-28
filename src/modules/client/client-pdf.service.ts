import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Interfaces for type safety
interface ApiResponse {
    DATA: any[][];
    COLUMNS: string[];
}

interface ColumnIndices {
    [key: string]: number;
}

interface ClientData {
    dp_id: string;
    ac_status: string;
    poa: string;
    [key: string]: string | undefined;
}

@Injectable()
export class ClientPdfService {
    private readonly logger = new Logger(ClientPdfService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    private async fetchClientData(clientCode: string, dbYear: string): Promise<ApiResponse> {
        if (!clientCode || !dbYear) {
            throw new BadRequestException('Client code and database year are required');
        }

        const apiUrl = `http://hobackoffice.acumengroup.in:8080/techexcelapi/index.cfm/ClientList/ClientList`;
        const apiParams = {
            CLIENT_ID: clientCode,
            FROM_DATE: '',
            TO_DATE: '',
            UrlUserName: this.configService.get('API_USERNAME') || 'techapi',
            UrlPassword: this.configService.get('API_PASSWORD') || 'tech@api',
            UrlDatabase: 'CAPSFO',
            UrlDataYear: dbYear,
        };

        try {
            const response = await firstValueFrom(
                this.httpService.get(apiUrl, {
                    params: apiParams,
                    headers: {
                        Cookie:
                            this.configService.get('API_COOKIE') ||
                            'JSESSIONID=_24RXTFxrSVDgi0f8dwtbPxa8I6IoMlGavXT_EVx; cfid=8509090e-2b1b-4db6-b4fc-78aaf94ab3d3; cftoken=0',
                    },
                }),
            );
            const json = response.data;
            if (!json.DATA || !json.COLUMNS) {
                throw new BadRequestException('Invalid API response: Missing DATA or COLUMNS');
            }
            return json as ApiResponse;
        } catch (error) {
            this.logger.error(`Failed to fetch client data: ${error.message}`);
            throw new InternalServerErrorException(`Failed to fetch client data: ${error.message}`);
        }
    }

    private mapColumnIndices(columns: string[]): ColumnIndices {
        return {
            dp_id: columns.indexOf('DP_ID'),
            client_dp_code: columns.indexOf('CLIENT_DP_CODE'),
            sex: columns.indexOf('SEX'),
            client_id: columns.indexOf('CLIENT_ID'),
            agreement_date: columns.indexOf('AGREEMENT_DATE'),
            category_desc: columns.indexOf('CATEGORY_DESC'),
            country: columns.indexOf('COUNTRY'),
            occupation: columns.indexOf('OCCUPATION'),
            mobile_no: columns.indexOf('MOBILE_NO'),
            client_name: columns.indexOf('CLIENT_NAME'),
            pan_no: columns.indexOf('PAN_NO'),
            birth_date: columns.indexOf('BIRTH_DATE'),
            cl_resi_add1: columns.indexOf('CL_RESI_ADD1'),
            cl_resi_add2: columns.indexOf('CL_RESI_ADD2'),
            cl_resi_add3: columns.indexOf('CL_RESI_ADD3'),
            cl_resi_add1_reg: columns.indexOf('CL_RESI_ADD1_REG'),
            cl_resi_add2_reg: columns.indexOf('CL_RESI_ADD2_REG'),
            cl_resi_add3_reg: columns.indexOf('CL_RESI_ADD3_REG'),
            client_id_mail: columns.indexOf('CLIENT_ID_MAIL'),
            client_bank_name: columns.indexOf('CLIENT_BANK_NAME'),
            client_bank_address: columns.indexOf('CLIENT_BANK_ADDRESS'),
            bank_acctype: columns.indexOf('BANK_ACCTYPE'),
            bank_acno: columns.indexOf('BANK_ACNO'),
            micr_code: columns.indexOf('MICR_CODE'),
            ifsccode: columns.indexOf('IFSCCODE'),
            poa: columns.indexOf('POA'),
            sub_branch_name: columns.indexOf('SUB_BRANCH_NAME'),
            father_husband_name: columns.indexOf('FATHER_HUSBAND_NAME'),
            state: columns.indexOf('STATE'),
            annual_income: columns.indexOf('ANNUAL_INCOME'),
            r_pin_code: columns.indexOf('R_PIN_CODE'),
            resi_address: columns.indexOf('RESI_ADDRESS'),
            resi_fax_no: columns.indexOf('RESI_FAX_NO'),
            net_worth: columns.indexOf('NET_WORTH'),
            net_worth_date: columns.indexOf('NET_WORTH_DATE'),
            aadharcard: columns.indexOf('AADHARCARD'),
            nominee_name: columns.indexOf('NOMINEE_NAME'),
            nominee_address: columns.indexOf('NOMINEE_ADDRESS'),
            nominee_sharepercentage: columns.indexOf('NOMINEE_SHAREPERCENTAGE'),
            nominee_father_husband_name: columns.indexOf('NOMINEE_FATHER_HUSBAND_NAME'),
            nominee_pan: columns.indexOf('NOMINEE_PAN'),
            nominee_phone: columns.indexOf('NOMINEE_PHONE'),
            nominee_email: columns.indexOf('NOMINEE_EMAIL'),
            nominee_pin_code: columns.indexOf('NOMINEE_PIN_CODE'),
            aadharcard_nominee: columns.indexOf('AADHARCARD_NOMINEE'),
            nominee2_name: columns.indexOf('NOMINEE2_NAME'),
            nominee2_address: columns.indexOf('NOMINEE2_ADDRESS'),
            nominee2_sharepercentage: columns.indexOf('NOMINEE2_SHAREPERCENTAGE'),
            nominee2_father_husband_name: columns.indexOf('NOMINEE2_FATHER_HUSBAND_NAME'),
            nominee3_name: columns.indexOf('NOMINEE3_NAME'),
            nominee3_address: columns.indexOf('NOMINEE3_ADDRESS'),
            nominee3_sharepercentage: columns.indexOf('NOMINEE3_SHAREPERCENTAGE'),
            nominee3_father_husband_name: columns.indexOf('NOMINEE3_FATHER_HUSBAND_NAME'),
            grp1active: columns.indexOf('GRP1ACTIVE'),
        };
    }

    private extractClientData(resultsArray: any[][], indices: ColumnIndices, mode: string): ClientData {
        if (!resultsArray?.length) {
            throw new BadRequestException('No client data found');
        }

        const supportedDpIds = ['12075800', 'IN300896'];
        const validRow = resultsArray.find((row) => {
            const dp_id = row[indices.dp_id]?.toString();
            return supportedDpIds.includes(dp_id);
        });

        if (!validRow) {
            const availableDpIds = resultsArray.map((row) => row[indices.dp_id]?.toString()).filter(Boolean);
            throw new BadRequestException(
                `No supported DP_ID found. Expected: ${supportedDpIds.join(', ')}. Found: ${availableDpIds.join(', ')}`,
            );
        }

        const dp_id = validRow[indices.dp_id]?.toString() || '';
        const poa = validRow[indices.poa]?.toString() || '';
        const active = validRow[indices.grp1active]?.toString() || '';
        let ac_status = '';
        if (active === 'N') ac_status = 'In-active';
        else if (active === 'Y') ac_status = 'Active';
        else if (active === 'C') ac_status = 'Closed';

        if (dp_id === 'IN300896') {
            let client_id = '';
            try {
                client_id = validRow[indices.client_dp_code]?.toString().slice(-8) || '';
            } catch {
                client_id = validRow[indices.client_dp_code]?.toString() || '';
            }

            const currentDate = new Date();
            const day = currentDate.getDate().toString().padStart(2, '0');
            const month = currentDate.toLocaleString('en-GB', { month: 'short' });
            const year = currentDate.getFullYear();
            const hours = currentDate.getHours().toString().padStart(2, '0');
            const minutes = currentDate.getMinutes().toString().padStart(2, '0');
            const seconds = currentDate.getSeconds().toString().padStart(2, '0');
            const printDate = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
            const businessDate = `${day} ${month} ${year}`;

            return {
                dp_id,
                ac_status,
                poa,
                template_id: 'TMP2306011250534937JDH7EJGDHNXS4',
                date: businessDate,
                date_time: printDate,
                client_id,
                active_date_from: 'All',
                active_date_to: 'All',
                standing_instruction: 'Y',
                account_category: 'Beneficiary',
                client_type: 'Resident',
                sub_type: 'Ordinary',
                ac_date: validRow[indices.agreement_date]?.toString(),
                branch: validRow[indices.sub_branch_name]?.toString(),
                basic_services: 'Y',
                name: validRow[indices.client_name]?.toString(),
                e_statement: 'Enabled',
                father_spouse_name: validRow[indices.father_husband_name]?.toString(),
                occupation: validRow[indices.occupation]?.toString(),
                address: `${validRow[indices.cl_resi_add1_reg]?.toString() || ''} ${validRow[indices.cl_resi_add2_reg]?.toString() || ''} ${validRow[indices.cl_resi_add3_reg]?.toString() || ''}`.trim(),
                pincode: validRow[indices.r_pin_code]?.toString(),
                country: validRow[indices.country]?.toString(),
                state: validRow[indices.state]?.toString(),
                bank_account_number: validRow[indices.bank_acno]?.toString(),
                bank_name: validRow[indices.client_bank_name]?.toString(),
                bank_addr: validRow[indices.client_bank_address]?.toString(),
                annual_income: validRow[indices.annual_income]?.toString(),
                mobile: validRow[indices.mobile_no]?.toString(),
                poa_flag: poa === 'Y' ? 'Assigned' : 'Not Assigned',
                poa_masterid: poa === 'Y' ? '100008' : '',
                poa_type: poa === 'Y' ? 'Corporate POA' : '',
                poa_name: poa === 'Y' ? 'FOR PAY-IN' : '',
                poa_status: poa === 'Y' ? 'Active' : '',
                number_sign: poa === 'Y' ? '1' : '',
                sign_type: poa === 'Y' ? 'None' : '',
            };
        } else if (dp_id === '12075800') {
            let dp_client_id = '';
            try {
                dp_client_id = validRow[indices.client_dp_code]?.toString().slice(-8) || '';
            } catch {
                dp_client_id = validRow[indices.client_dp_code]?.toString() || '';
            }

            return {
                dp_id,
                ac_status,
                poa,
                template_id: mode === 'test' ? 'TMP220406150212281L6F5MX8M8766JC' : 'TMP220407104807463PLXJP1CDK93PF7',
                dp_client_id,
                client_id: validRow[indices.client_id]?.toString(),
                name1: validRow[indices.client_name]?.toString(),
                date: new Date().toLocaleDateString('en-GB'),
            };
        } else {
            throw new BadRequestException(`Unsupported DP_ID: ${dp_id}`);
        }
    }

    async generateClientData(clientCode: string, dbYear: string): Promise<any> {
        function getClientStatus(statusCode: string): string {
            switch (statusCode) {
                case 'Y': return 'Active';
                case 'N': return 'In-active';
                case 'C': return 'Closed';
                default: return statusCode;
            }
        }

        try {
            const json = await this.fetchClientData(clientCode, dbYear);
            if (!json.DATA || !json.COLUMNS || !json.DATA.length) {
                throw new BadRequestException('Invalid API response: Missing DATA, COLUMNS, or no data rows');
            }

            // Define the columns needed for the PDF
            const requiredColumns = [
                'CLIENT_ID', 'POA', 'GRP1ACTIVE', 'CLIENT_NAME', 'FATHER_HUSBAND_NAME',
                'RESI_ADDRESS', 'R_PIN_CODE', 'COUNTRY', 'STATE', 'MOBILE_NO',
                'BANK_ACNO', 'CLIENT_BANK_NAME', 'CLIENT_BANK_ADDRESS', 'ANNUAL_INCOME', 'DP_ID', 'DP_NAME'
            ];

            // Map column names to indices
            const indices = requiredColumns.reduce((acc, col) => {
                acc[col] = json.COLUMNS.indexOf(col);
                return acc;
            }, {} as { [key: string]: number });

            // Check for missing columns
            const missingColumns = requiredColumns.filter(col => indices[col] === -1);
            if (missingColumns.length > 0) {
                this.logger.warn(`Missing columns: ${missingColumns.join(', ')}`);
            }

            // Take the first row of data (assuming single client per clientCode)
            const row = json.DATA[0];

            // Generate current date and time for header
            const currentDate = new Date();
            const day = currentDate.getDate().toString().padStart(2, '0');
            const month = currentDate.toLocaleString('en-GB', { month: 'short' });
            const year = currentDate.getFullYear();
            const hours = currentDate.getHours().toString().padStart(2, '0');
            const minutes = currentDate.getMinutes().toString().padStart(2, '0');
            const seconds = currentDate.getSeconds().toString().padStart(2, '0');
            const businessDate = `${day} ${month} ${year}`;
            const printDate = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;

            // Construct the JSON response
            const clientData = {
                header: {
                    business_date: businessDate,
                    print_date: printDate,
                    dp_name: row[indices['DP_NAME']] || '',
                    dp_id: row[indices['DP_ID']] || '',
                    dp_address: '3RD FLOOR, S.T.REDDIAR & SONS BLDG., VEEKSHANAM ROAD, COCHIN, 682035',
                    phone: '0484-382380, 362267',
                    fax: '0484-369510',
                },
                selection_criteria: {
                    client_id: row[indices['CLIENT_ID']] || '',
                    active_date_from: 'All',
                    active_date_to: 'All',
                },
                client_details: {
                    client_id: row[indices['CLIENT_ID']] || '',
                    standing_instruction: row[indices['POA']] || '',
                    short_name: row[indices['SHORT_NAME']] || '',
                    client_type: row[indices['CLIENT_TYPE']] || '',
                    acct_activation_date: row[indices['ACCT_ACTIVATION_DATE']] || '',
                    status: getClientStatus(row[indices['GRP1ACTIVE']]),
                    status_change_reason: '',
                    branch: row[indices['BRANCH']] || '',
                    sub_type: row[indices['SUB_TYPE']] || '',
                    close_suspend_date: row[indices['CLOSE_SUSPEND_DATE']] || '',
                    bsda_flag: row[indices['BSDA']] || '',
                },
                personal_details: {
                    sole_first_holder_name: row[indices['CLIENT_NAME']] || '',
                    father_spouse_name: row[indices['FATHER_HUSBAND_NAME']] || '',
                    occupation: row[indices['OCCUPATION']] || '',
                    address: row[indices['RESI_ADDRESS']] || '',
                    other_address: row[indices['OTHER_ADDRESS']] || '',
                    pin_code: row[indices['R_PIN_CODE']] || '',
                    country: row[indices['COUNTRY']] || '',
                    state: row[indices['STATE']] || '',
                    mobile_phone_no: row[indices['MOBILE_NO']] || '',
                    mobile_phone_no2: row[indices['SECONDARY_MOBILE_NO']] || '',
                    fax_no: row[indices['RESI_FAX_NO']] || '',
                    fax_no2: row[indices['CLIENT_ID_FAX']] || '',
                    e_statement_flag: row[indices['ESTATEMENT_FLAG']] || '',
                    gsec_declaration: row[indices['GSEC_DECLARATION']] || '',
                    idt_flag: row[indices['IDT_FLAG']] || '',
                    dob: row[indices['BIRTH_DATE']] || '',
                    pan: row[indices['PAN_NO']] || '',
                    email: row[indices['EMAILID_PERSON1']] || '',
                },
                financial_details: {
                    bank_account_number: row[indices['BANK_ACNO']] || '',
                    bank_account_type: row[indices['BANK_ACCTYPE']] || '',
                    ifsc_code: row[indices['IFSCCODE']] || '',
                    micr_code: row[indices['MICR_CODE']] || '',
                    lei_no: row[indices['LEI_NO']] || '',
                    upi_id: row[indices['UPI_ID']] || '',
                    bank_name: row[indices['CLIENT_BANK_NAME']] || '',
                    bank_address: row[indices['CLIENT_BANK_ADDRESS']] || '',
                    bank_pin_code: row[indices['CLIENT_BANK_PINCODE']] || '',
                    gross_annual_income_range: row[indices['ANNUAL_INCOME']] || '',
                    net_worth: row[indices['NET_WORTH']] || '',
                    net_worth_date: row[indices['NET_WORTH_DATE']] || '',
                    tax_ded_status: row[indices['TAX_DED_STATUS']] || '',
                    poa_assigned: row[indices['POA']] || '',
                },
                flags: {
                    sms_flag: row[indices['SMS_FLAG']] || '',
                    pan_flag: row[indices['PAN_FLAG']] || '',
                    ath_flag: row[indices['ATH_FLAG']] || '',
                    family_mobile_flag: row[indices['FAMILY_MOBILE_FLAG']] || '',
                    family_email_flag: row[indices['FAMILY_EMAIL_FLAG']] || '',
                    agm_notice_flag: row[indices['PHYSICAL_REPORT_FLAG']] || '',
                    aadhaar_reason: row[indices['AADHAAR_REASON']] || '',
                },
                poa_ddpi_details: {
                    poa_ddpi: row[indices['POA']] === 'Y' ? '10008' : '',
                    poa_ddpi_type: row[indices['POA']] === 'Y' ? 'Corporate POA' : '',
                    poa_ddpi_name: row[indices['POA']] === 'Y' ? 'FOR PAY-IN' : '',
                    poa_ddpi_status: row[indices['POA']] === 'Y' ? 'Stock Broker' : '',
                    poa_ddpi_active_status: row[indices['POA']] === 'Y' ? 'Active' : '',
                    no_of_sign_required: row[indices['POA']] === 'Y' ? '1' : '',
                    signature_type: row[indices['POA']] === 'Y' ? 'None' : '',
                },
                nominee_details: {
                    name: row[indices['NOMINEE_TITLE']] || '',
                    pan: row[indices['NOMINEE_PAN']] || '',
                    aadhaar: row[indices['NOMINEE_AADHAAR']] || '',
                    email: row[indices['NOMINEE_EMAIL']] || '',
                    mobile: row[indices['NOMINEE_MOBILE']] || '',
                    address: row[indices['NOMINEE_ADDRESS']] || '',
                    pin: row[indices['NOMINEE_PIN']] || '',
                    state: row[indices['NOMINEE_STATE']] || '',
                    country: row[indices['NOMINEE_COUNTRY']] || '',
                }
            };

            return clientData;
        } catch (error) {
            this.logger.error(`Failed to generate Client Data: ${error.message}`);
            throw error;
        }
    }
}