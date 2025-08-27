import { HttpStatus, Logger, ValidationPipe } from '@nestjs/common';
import { hash, genSalt } from 'bcryptjs';
import { User } from 'src/modules/user/user.entity';
import * as moment from 'moment-timezone';
import { randomInt } from 'crypto';
import { Brackets, EntityManager, SelectQueryBuilder } from 'typeorm';
import { FilterRequest } from 'src/modules/user/dto/request/usersListOfSingleType-dto';

const VALIDATION_PIPE = new ValidationPipe({
    transform: true,
    forbidNonWhitelisted: true,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY
});

export const SETTINGS = {
    VALIDATION_PIPE
};

export async function createPasswordHash(password): Promise<any> {
    const salt = await genSalt();
    const hashedPassword = await hash(password, salt);
    return hashedPassword;
}

/**
 *
 * @returns 6 character Numeric OTP
 */
export function generateOTP() {
    const length = 6;
    const charset = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = randomInt(0, charset.length);
        otp += charset[randomIndex];
    }

    return otp;
}

export function generateUUID(type: 'EMP' | 'BR' | 'CL', branchId?: string): string {
    const branchChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous characters
    const employeeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Letters only (no numbers)
    const clientChars = '23456789'; // Numbers only
    const idLength = 8;

    // Generate Branch ID (4 characters)
    if (type === 'BR') {
        return Array.from({ length: 4 }, () => branchChars[Math.floor(Math.random() * branchChars.length)]).join('');
    }

    // Validate parameters for Employee/Client
    if (!branchId) throw new Error('Branch ID is required');
    if (branchId.length !== 4 || !/^[A-Z0-9]{4}$/.test(branchId)) {
        throw new Error('Branch ID must be 4-character uppercase non-ambiguous alphanumeric');
    }

    // Generate Employee/Client ID
    const [typeCode, pool] = type === 'EMP' ? ['E', employeeChars] : ['C', clientChars];

    const suffix = Array.from(
        { length: idLength - branchId.length - 1 },
        () => pool[Math.floor(Math.random() * pool.length)]
    ).join('');

    const fullId = `${branchId}${typeCode}${suffix}`;

    // Final validation
    if (fullId.length !== idLength) {
        throw new Error(`Invalid ID length: ${fullId}`);
    }

    return fullId;
}

import { createHash } from 'crypto';

/**
 * Generates a unique row key by hashing specified fields from a row object.
 * @param row The row object containing the data.
 * @param fields An array of field names or field configurations to include in the key.
 * @returns A hexadecimal MD5 hash of the concatenated field values.
 */
export function generateRowKey(
    row: any,
    fields: Array<string | { name: string; defaultValue?: any; transform?: (value: any) => string }>
): string {
    const keyParts = fields.map((field) => {
        // Handle both string and object field definitions
        const fieldName = typeof field === 'string' ? field : field.name;
        const defaultValue = typeof field === 'string' ? '' : (field.defaultValue ?? '');
        const transform = typeof field === 'string' ? undefined : field.transform;

        // Get the field value from the row
        let value = row[fieldName] ?? defaultValue;

        // Apply transformation if provided
        if (transform) {
            value = transform(value);
        } else if (value instanceof Date) {
            // Default transformation for Date objects
            value = value.toISOString();
        } else if (typeof value === 'number') {
            // Ensure numbers are converted to strings without scientific notation
            value = value.toString();
        } else {
            // Convert to string and handle null/undefined
            value = String(value ?? defaultValue);
        }

        return value;
    });

    // Concatenate the field values with a separator
    const keyString = keyParts.join('|');
    return createHash('md5').update(keyString).digest('hex');
}

export const USER_STATUS = {
    ACTIVE: 'active',
    IN_ACTIVE: 'in-active',
    INVITATION_SENT: 'invitation sent',
    UN_ASSIGNED: 'un-assigned',
    AWAITING: 'awaiting',
    PENDING: 'pending',
    COMPLETED: 'completed',
    DELETED: 'deleted'
};

export const USER_OCCUPIED = {
    TRUE: true,
    NULL: null
};

export const COCD_TYPES = ['NSE_CASH'];

export const roleIds = {
    superadmin: 1,
    admin: 2,
    client: 3,
    staff: 6,
    dealer: 5,
    insuranceAgent: 9
};

export enum COCDType {
    MCX = 'MCX',
    NSE_CASH = 'NSE_CASH',
    NSE_FNO = 'NSE_FNO',
    NSE_SLBM = 'NSE_SLBM',
    NSE_COM = 'NSE_COM',
    CD_NSE = 'CD_NSE',
    NSE_DLY = 'NSE_DLY',
    NCDEX = 'NCDEX',
    BSE_CASH = 'BSE_CASH',
    BSE_FNO = 'BSE_FNO'
}
export const COCDTypeArr = [
    COCDType.MCX,
    COCDType.NSE_CASH,
    COCDType.NSE_FNO,
    COCDType.NSE_SLBM,
    COCDType.CD_NSE,
    COCDType.NSE_DLY,
    COCDType.NCDEX,
    COCDType.BSE_CASH,
    COCDType.BSE_FNO,
    COCDType.NSE_COM
];

export const mapCocdToSegment = (cocd: string): string => {
    switch (cocd) {
        case COCDType.NSE_CASH:
        case COCDType.NSE_DLY:
            return 'EQUITY';
        case COCDType.NSE_FNO:
            return 'FNO';
        case COCDType.MCX:
        case COCDType.NCDEX:
            return 'COMMODITY';
        case COCDType.NSE_SLBM:
            return 'SLBM';
        case COCDType.CD_NSE:
            return 'CURRENCY';
        default:
            return 'UNKNOWN';
    }
};

export enum TRADE_TYPE {
    'SHORTTERM' = 'SHORTTERM',
    'LONGTERM' = 'LONGTERM',
    'TRADING' = 'TRADING',
    'ASSETS' = 'ASSETS',
    'LIABILITIES' = 'LIABILITIES',
    'OP_ASSETS' = 'OP_ASSETS',
    'EXPENSES' = 'EXPENSES'
}

export enum ReportType {
    RISK_REPORT = 'risk-report',
    SEGMENT_REVENUE = 'turnover-file',
    PORTFOLIO_EQUITY = 'portfolio-equity',
    PORTFOLIO_FNO = 'portfolio-fno',
    NET_POSITION_REPORT = 'net-position-report',
    FIVE_DAYS_DEBIT_REPORT = 'five-days-debit-report',
    MTF_REPORT = 'mtf-report',
    ISIN_MASTER = 'isin-master',
    TOUCH_TURNOVER_REPORT = 'touch-turnover-report',
    HOLDINGS_STATEMENT = 'holdings-statement',
    MONTHLY_SETTLEMENT = 'monthly-settlement',
    QUARTERLY_SETTLEMENT = 'quarterly-settlement',
    BRANCH_TARGET = 'branch-target',
    ANNUAL_BRANCH_REPORT = 'annual-branch-report'
}
export const reportTypeArr = [
    ReportType.SEGMENT_REVENUE,
    ReportType.RISK_REPORT,
    ReportType.PORTFOLIO_EQUITY,
    ReportType.PORTFOLIO_FNO,
    ReportType.NET_POSITION_REPORT,
    ReportType.FIVE_DAYS_DEBIT_REPORT,
    ReportType.MTF_REPORT,
    ReportType.ISIN_MASTER,
    ReportType.TOUCH_TURNOVER_REPORT,
    ReportType.MONTHLY_SETTLEMENT,
    ReportType.QUARTERLY_SETTLEMENT,
    ReportType.HOLDINGS_STATEMENT,
    ReportType.BRANCH_TARGET,
    ReportType.ANNUAL_BRANCH_REPORT
];
export enum ReportEntities {
    'risk-report' = 'RiskReport',
    'turnover-file' = 'SegmentRevenue',
    'portfolio-equity' = 'ClientProfitLossEquity',
    'portfolio-fno' = 'ClientProfitLossCommodity',
    'net-position-report' = 'NetPositionReport',
    'five-days-debit-report' = 'FiveDaysDebitReport',
    'mtf-report' = 'MtfReport',
    'isin-master' = 'ISINMaster',
    'touch-turnover-report' = 'TouchTurnover',
    'holdings-statement' = 'HoldingsStatement',
    'monthly-settlement' = 'MonthlySettlement',
    'quarterly-settlement' = 'QuarterlySettlement'
}
export const ReportEntitiesArr = [
    ReportEntities['five-days-debit-report'],
    ReportEntities['holdings-statement'],
    ReportEntities['isin-master'],
    ReportEntities['monthly-settlement'],
    ReportEntities['net-position-report'],
    ReportEntities['portfolio-equity'],
    ReportEntities['portfolio-fno'],
    ReportEntities['quarterly-settlement'],
    ReportEntities['risk-report'],
    ReportEntities['segment-revenue'],
    ReportEntities['touch-turnover-report'],
    ReportEntities['mtf-report'],
    ReportEntities['annual-branch-report'],
    ReportEntities['branch-target']
];

export enum MasterType {
    KYC_MASTER = 'kyc-master',
    BRANCH_MASTER = 'branch-master',
    EMPLOYEE_MASTER = 'employee-master',
    DEALER_RM_MAPPING = 'dealer-rm-mapping'
}
export const masterTypeArr = [
    MasterType.KYC_MASTER,
    MasterType.BRANCH_MASTER,
    MasterType.EMPLOYEE_MASTER,
    MasterType.DEALER_RM_MAPPING
];

export enum STRATEGIES {
    'VERIFY' = 'VERIFY',
    'ACCESS' = 'ACCESS',
    'REFRESH' = 'REFRESH',
    'JWT' = 'JWT'
}

export enum Roles {
    'superadmin' = 'superadmin',
    'admin' = 'admin',
    'client' = 'client',
    'staff' = 'staff',
    'dealer' = 'dealer',
    'stateHead' = 'stateHead',
    'branchManager' = 'branchManager',
    'productHead' = 'productHead',
    'insuranceManager' = 'insuranceManager',
    'teleCaller' = 'teleCaller',
    'insuranceAgent' = 'insuranceAgent'
}

// this will be same as Role table values
export enum RoleId {
    'superadmin' = 1,
    'admin' = 2,
    'client' = 3,
    'insuranceAgent' = 4,
    'dealer' = 5,
    'staff' = 6,
    'teleCaller' = 7,
    'stateHead' = 8,
    'branchManager' = 9,
    'insuranceManager' = 10,
    'productHead' = 11
}
export type RoleType = keyof typeof Roles;
export const rolesArr = [Roles.admin, Roles.client, Roles.staff];

export enum Designation {
    stateHead = 'stateHead',
    regionalManager = 'regionalManager',
    superAdmin = 'superAdmin',
    branchManager = 'branchManager',
    staff = 'staff'
}
export type DesignationType = keyof typeof Designation;
export const DesignationArr = [
    Designation.stateHead,
    Designation.regionalManager,
    Designation.staff,
    Designation.branchManager
];

export enum BranchModels {
    'BRANCH' = 'Branch',
    'FRANCHISE' = 'AP',
    'REFERRAL' = 'Introducer'
}
export type BranchModelType = keyof typeof BranchModels;
export const branchModelsArr = [BranchModels.BRANCH, BranchModels.FRANCHISE, BranchModels.REFERRAL];

export enum Features {
    'user' = 'User',
    'company' = 'Company',
    'organization' = 'Organization',
    'role' = 'Role',
    'cms' = 'CMS',
    'media' = 'Media',
    'all' = 'all',
    'client' = 'Client'
}


export const featuresArr = [
    Features.user,
    Features.role,
    Features.organization,
    Features.media,
    Features.company,
    Features.cms,
    Features.all,
    Features.client
];

export const CLIENT_STATUS = {
    ACTIVE: 'active',
    IN_ACTIVE: 'in-active',
    PENDING: 'pending',
    INVITATION_SENT: 'invitation sent'
};

export const STAFF_STATUS = {
    ACTIVE: 'active',
    IN_ACTIVE: 'in-active',
    PENDING: 'pending',
    INVITATION_SENT: 'invitation sent'
};

export const TICKET_EVENTS = {
    GENERATED: 'GENERATED',
    GENERATED_AND_ASSIGNED: 'GENERATED-AND-ASSIGNED',
    ASSIGNED: 'ASSIGNED',
    RE_ASSIGNED: 'RE-ASSIGNED',
    MODIFIED: 'MODIFIED',
    MADE_AWAITED: 'MADE-AWAITED',
    REMOVED_FROM_AWAITED: 'REMOVED-FROM-AWAITED',
    RE_ASSIGNED_AND_MODIFIED: 'RE-ASSIGNED-AND-MODIFIED',
    COMPLETED: 'COMPLETED',
    DELETED: 'DELETED',
    CANCELED: 'CANCELED',
    MARKED_NO_SHOW: 'NO-SHOW'
};
// Define a union type for the event types
export type TicketEvent = (typeof TICKET_EVENTS)[keyof typeof TICKET_EVENTS];

export const APPOINTMENT_REQUEST_STATUS = {
    UN_ASSIGNED: 'UN-ASSIGNED',
    AWAITING: 'AWAITING',
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    DELETED: 'DELETED',
    CANCELED: 'CANCELED',
    MARKED_NO_SHOW: 'NO-SHOW'
};

export enum APPOINTMENT_STATUS {
    'PENDING' = 'PENDING',
    'SAVED' = 'SAVED',
    'COMPLETED' = 'COMPLETE',
    'DELETED' = 'DELETED',
    'CANCELED' = 'CANCELED',
    'APPROVED' = 'APPROVED',
    'REJECTED' = 'REJECTED'
}

export const fillOrReplaceObject = (target: any, source: any) => {
    for (const key of Object.keys(source)) {
        if (source[key] !== null && source[key] !== undefined) target[key] = source[key];
    }
};

export const datesInSpan = (from: string, to: string) => {
    const startDate = moment.utc(from, 'YYYY-MM-DD');
    const endDate = moment.utc(to, 'YYYY-MM-DD');

    let allDates: string[] = [];

    // Loop through each day between startDate and endDate
    for (let currentDate = startDate.clone(); currentDate.isSameOrBefore(endDate, 'day'); currentDate.add(1, 'day')) {
        let clone = currentDate.clone();
        allDates.push(
            moment(`${clone.year()}-${clone.month() + 1}-${clone.date()}`, 'YYYY-MM-DD').format('YYYY-MM-DD')
        );
    }

    return allDates;
};

export const datesInSpanEachWithEmptySchedules = (from: string, to: string) => {
    const startDate = moment.utc(from, 'YYYY-MM-DD');
    const endDate = moment.utc(to, 'YYYY-MM-DD');

    const allDatesSchedule: Record<string, { schedules: any[]; count: number }> = {};

    // Loop through each day between startDate and endDate
    for (let currentDate = startDate.clone(); currentDate.isSameOrBefore(endDate, 'day'); currentDate.add(1, 'day')) {
        const formattedDate = currentDate.format('YYYY-MM-DD');
        allDatesSchedule[formattedDate] = {
            schedules: [],
            count: 0
        };
    }

    return allDatesSchedule;
};

export const datesInSpanEachWithCountOnly = (from: string, to: string) => {
    const startDate = moment.utc(from, 'YYYY-MM-DD');
    const endDate = moment.utc(to, 'YYYY-MM-DD');

    const allDatesSchedule: Record<string, { count: number }> = {};

    // Loop through each day between startDate and endDate
    for (let currentDate = startDate.clone(); currentDate.isSameOrBefore(endDate, 'day'); currentDate.add(1, 'day')) {
        const formattedDate = currentDate.format('YYYY-MM-DD');
        allDatesSchedule[formattedDate] = {
            count: 0
        };
    }

    return allDatesSchedule;
};

// Helper function to group by a specific key
export function groupBy(array: any[], key: any) {
    return array.reduce((acc, obj) => {
        const keyValue = obj[key];
        if (!acc[keyValue]) {
            acc[keyValue] = [];
        }
        acc[keyValue].push(obj);
        return acc;
    }, {});
}

export function reorderNullsFirstInObject(items: object) {
    // Separate entries with null values and non-null values
    const nullValues = {};
    const nonNullValues = {};

    for (const item in items) {
        if (items[item] === null) {
            nullValues[item] = null;
        } else {
            nonNullValues[item] = items[item];
        }
    }

    // Combine null values first, then non-null values
    return { ...nullValues, ...nonNullValues };
}

export function convertToArrayAndReorderItemsByCountInObject(items: object) {
    // Convert the object into an array of objects
    const entriesArray = Object.entries(items).map(([key, value]) => ({
        staffId: Number(key), // Convert the staff ID to a number
        ...value // Spread the original value properties
    }));

    // Sort the array by count in ascending order
    entriesArray.sort((a, b) => a.count - b.count);

    return entriesArray;
}

export function orderByKey({
    key,
    isKeyAlias,
    defaultKey,
    isDefaultKeyAlias,
    repoAlias
}: {
    key?: string | null;
    isKeyAlias?: boolean;
    defaultKey?: string | null;
    isDefaultKeyAlias?: boolean;
    repoAlias: string;
}): string | null {
    // Helper function to construct the key based on its alias status
    const constructKey = (key: string | null, isAlias: boolean) => {
        if (!key) return null;
        if (key.includes('.')) return key;
        return isAlias ? key : `${repoAlias}.${key}`;
    };

    // Try to construct key from `key` parameter
    const result = constructKey(key, isKeyAlias);

    // If `key` is not defined, fallback to `defaultKey`
    if (result === null && defaultKey) {
        return constructKey(defaultKey, isDefaultKeyAlias);
    }

    return result;
}

export function orderByValue({
    defaultOrder = 'DESC',
    req
}: {
    defaultOrder?: 'ASC' | 'DESC';
    req: any;
}): 'ASC' | 'DESC' {
    return (req?.QUERY_STRING?.orderBy?.value ?? defaultOrder) as 'ASC' | 'DESC';
}

export enum generatedVia {
    COMMERCIAL = 'COMMERCIAL',
    PORTAL = 'PORTAL'
}

export const refineCustomLogs = ({
    action,
    ip,
    api,
    method,
    user,
    apptId
}: {
    action?: string;
    ip?: string;
    api?: string;
    method?: string;
    user?: string;
    apptId?: number;
}): string => {
    return JSON.stringify({
        action: action ?? '',
        ip: ip ?? '',
        api: api ?? '',
        user: user ?? '',
        method: method ?? '',
        apptId: apptId ?? ''
    });
};

export const addFilters = <T>(query: SelectQueryBuilder<T>, filterObject: FilterRequest, alias = 'user'): void => {
    Object.entries(filterObject).forEach(([key, value]) => {
        const columnPath = key.includes('.') ? key : `${alias}.${key}`;

        if (Array.isArray(value)) {
            // Apply OR condition for multiple values within the same field
            query.andWhere(
                new Brackets((qb) => {
                    value.forEach((val, index) => {
                        qb.orWhere(`${columnPath} = :${alias}_${key.replace('.', '_')}_${index}`, {
                            [`${alias}_${key.replace('.', '_')}_${index}`]: val
                        });
                    });
                })
            );
        }
    });
};

export const INSURANCE_TYPES = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary',
    TERTIARY: 'tertiary'
};
export enum Insurance_Type {
    Health = 'HEALTH',
    Life = 'LIFE',
    Motor = 'MOTOR',
    Other = 'OTHER'
}
export enum Policy_Status {
    Active = 'ACTIVE',
    Lapsed = 'LAPSED',
    Expired = 'EXPIRED',
    Cancelled = 'CANCELLED'
}

export const PAYMENT_TYPES = {
    CASH: 'cash',
    INSURANCE: 'insurance'
};

export function deepEqual(obj1: any, obj2: any) {
    if (obj1 === obj2) return true;

    if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
        return false;
    }

    // Handle Array comparison with unordered logic
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;

        // Sort arrays based on their stringified JSON representations
        const sorted1 = obj1.slice().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
        const sorted2 = obj2.slice().sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

        // Recursively check each item
        return sorted1.every((item, index) => deepEqual(item, sorted2[index]));
    }

    // Compare keys and values for objects
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    if (keys1.length !== keys2.length) return false;

    // Recursively check each key and its value
    for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
            return false;
        }
    }

    return true;
}

export const THERAPIST_APPROVED = 'approved';

// High-level ticket statuses
export enum Ticket_Status {
    OPEN = 'OPEN', // Ticket is newly created and active
    IN_PROGRESS = 'IN_PROGRESS', // Ticket is being worked on
    ON_HOLD = 'ON_HOLD', // Ticket is paused (e.g., waiting for customer input)
    RESOLVED = 'RESOLVED', // Ticket issue is resolved but not yet closed
    CLOSED = 'CLOSED', // Ticket is fully completed and closed
    CANCELLED = 'CANCELLED' // Ticket is cancelled
}
// Specific steps in the ticket workflow
export enum Current_Step {
    INITIAL_REVIEW = 'INITIAL_REVIEW', // Ticket is under initial review
    // DOCUMENT_COLLECTION = 'DOCUMENT_COLLECTION', // Collecting documents from the customer
    DOCUMENT_COLLECTED = 'DOCUMENT_COLLECTED', // Collecting documents from the customer
    // DOCUMENT_VERIFICATION = 'DOCUMENT_VERIFICATION', // Verifying the submitted documents
    // ASSIGNED_TO_TELECALLER = 'ASSIGNED_TO_TELECALLER', // Assigned to a telecaller for follow-up
    QUOTATION_GENERATED = 'QUOTATION_GENERATED', // Generating insurance quotation
    QUOTATION_SENT = 'QUOTATION_SENT', // Quotation sent to the customer
    QUOTATION_REVIEWED = 'QUOTATION_REVIEWED', // Reviewing the quotation

    SUBMITTED_FOR_REVISION = 'SUBMITTED_FOR_REVISION', // Submitted for revision by the customer
    REVISED_AND_UPDATE = 'REVISED_AND_UPDATE', // Revision required by the customer
    CUSTOMER_APPROVED = 'CUSTOMER_APPROVED', // Waiting for customer approval of quotation

    PAYMENT_LINK_GENERATED = 'PAYMENT_LINK_GENERATED', // Waiting for payment from the customer
    // PAYMENT_PROCESSING = 'PAYMENT_PROCESSING', // Processing the payment
    PAYMENT_DENIED = 'PAYMENT_DENIED', // Payment denied by the customer//
    PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED', // Payment successfully completed

    POLICY_ISSUED = 'POLICY_ISSUED', // Issuing the insurance policy
    POLICY_RECEIVED = 'POLICY_RECEIVED', // Reviewing the issued policy
    POLICY_DELIVERED = 'POLICY_DELIVERED', // Policy delivered to the customer
    // FOLLOW_UP = 'FOLLOW_UP' // Post-issuance follow-up with the customer
    CLOSED = 'CLOSED'
}
export enum Quotation_Status {
    QUOTATION_GENERATED = 'QUOTATION_GENERATED', // Generating insurance quotation
    QUOTATION_SENT = 'QUOTATION_SENT', // Quotation sent to the customer
    SUBMITTED_FOR_REVISION = 'SUBMITTED_FOR_REVISION', // Submitted for revision by the customer
    REVISED_AND_UPDATE = 'REVISED_AND_UPDATE', // Revision required by the customer
    CUSTOMER_APPROVED = 'CUSTOMER_APPROVED', // Waiting for customer approval of quotation
    EXPIRED = 'EXPIRED' // Expired
}

// Events for logging ticket actions
export enum TICKET_LOG_EVENTS {
    TICKET_CREATED = 'CREATED',
    TICKET_CREATED_AND_ASSIGNED = 'CREATED_AND_ASSIGNED',
    TICKET_ASSIGNED = 'ASSIGNED',
    TICKET_REASSIGNED = 'REASSIGNED',
    TICKET_UPDATED = 'UPDATED',
    TICKET_CLOSED = 'CLOSED',
    TICKET_CANCELLED = 'CANCELLED',
    TICKET_COMMENTED = 'COMMENTED',
    TICKET_ESCALATED = 'ESCALATED',
    TICKET_DELETED = 'DELETED',
    TICKET_STATUS_CHANGED = 'STATUS_CHANGED', // Logs changes to Ticket_Status
    TICKET_STEP_CHANGED = 'STEP_CHANGED' // Logs changes to Current_Step
}

export enum Notification_Type {
    'new_ticket' = 'New_Ticket',
    'renewal_reminder' = 'Renewal_Reminder',
    'payment_reminder' = 'Payment_Reminder',
    'claim_update' = 'Claim_Update'
}

export enum Insurance_Product_Status {
    ACTIVE = 'ACTIVE',
    CANCELED = 'CANCELED',
    EXPIRED = 'EXPIRED'
}

export enum Gender {
    Male = 'male',
    Female = 'female',
    Other = 'other'
}

export enum Ticket_Type {
    NEW = 'NEW',
    PORT = 'PORT',
    RENEWAL = 'RENNEWAL'
}

export enum Policy_Holerder_Type {
    INDIVIDUAL = 'INDIVIDUAL',
    FAMILY = 'FAMILY'
}

export enum Coverage_Type {
    FULL = 'FULL',
    THIRD_PARTY = 'THIRD_PARTY',
    B2B = 'B2B'
}

export enum Family_Member_Type {
    SELF = 'SELF',
    SPOUSE = 'SPOUSE',
    SON = 'SON',
    DAUGHTER = 'DAUGHTER',
    MOTHER = 'MOTHER',
    FATHER = 'FATHER',
    BROTHER = 'BROTHER',
    SISTER = 'SISTER',
    GRANDPARENT = 'GRANDPARENT',
    OTHER = 'OTHER'
}

export enum Insurance_Purpose {
    TERM = 'TERM',
    SAVINGS = 'SAVINGS',
    ULIP = 'ULIP',
    ENDOWMENT = 'ENDOWMENT'
}
export enum Employment_Type {
    BUSINESS = 'BUSINESS',
    SALARIED = 'SALARIED'
}

export enum Vehicle_Type {
    CAR = 'CAR',
    BIKE = 'BIKE',
    SCOOTER = 'SCOOTER',
    AUTO = 'AUTO',
    BUS = 'BUS',
    OTHERS = 'OTHERS'
}

export enum Client_Type {
    NEW_CLIENT = 'NEW_CLIENT',
    EXISTING_CLIENT = 'EXISTING_CLIENT',
    PORT_CLIENT = 'PORT_CLIENT'
}

export enum Pre_Existing_Diseases {
    NONE = 'NONE',
    ASTHMA = 'ASTHMA',
    BP = 'BP',
    CHOLESTEROL = 'CHOLESTEROL',
    DIABETES_OBESITY = 'DIABETES_OBESITY',
    OTHERS = 'OTHERS'
}

export function generateRandomPassword(length = 8): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
}

export interface TicketResponse {
    status: string;
    message: string;
    data: any;
}

export interface MedicalDetails {
    height: number | null;
    weight: number | null;
    preExistDiseases: string;
    othersDiseases: string | null;
    medication: string | null;
    bloodGroup: string | null;
    isPastSurgery: boolean;
    isChronicCondition: boolean;
    dischargeSummary: string;
    diagnosticReport: string;
    isSmoker: boolean;
    isDrinker: boolean;
    documents: any | null;
    updatedBy: number | null;
    updatedAt: Date | null;
}

// function for quote id

export function generateQuoteId(ticketId: number): string {
    const prefix = 'QUOT';
    const randomCharsLength = 4;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    let randomChars = '';
    for (let i = 0; i < randomCharsLength; i++) {
        const randomIndex = randomInt(0, charset.length);
        randomChars += charset[randomIndex];
    }

    return `${prefix}${ticketId}${randomChars}`;
}

export const formatToCamelCase = (
    value: string | undefined,
    options: { camelCase?: boolean; withSpace?: boolean } = { withSpace: true }
): string => {
    if (!value || value === 'N/A') return 'N/A';

    const words = value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    if (options.camelCase && !options.withSpace) {
        return words.join('');
    }

    return words.join(' ');
};

export function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
}
export function addHours(hours) {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date;
}

export enum InsuranceModuleType {
    dashboard = 'dashboard',
    employee = 'employee',
    company = 'company',
    product = 'product',
    ticket = 'ticket',
    policy = 'policy',
    escalation = 'escalation',
    quotation = 'quotation',
    roleMapping = 'roleMapping',
    admin = 'admin'
}

// export enum InsurancePermissionType {
//     Route = 'route',
//     Button = 'button',
//     Pdf = 'pdf',
//     Api = 'api',
//     Menu = 'menu',
//     Field = 'field',
//     admin = 'admin'
// }

export enum InsurancePermissionType {
    Route = 'route',
    Button = 'button',
    Pdf = 'pdf',
    Api = 'api',
    Menu = 'menu',
    Field = 'field',
    All = 'all'
}

// this function check to which person can access this ticket details
export function isUserAuthorizedToAccessTicket(user: User, ticket: any): boolean {
    const role = user.userType.roleName;
    const branchRoles = ['teleCaller', 'insuranceManager', 'productHead'];
    // console.log("here role is in auhto---", role, user.branch.id, ticket.createdBy.branch.id );
    
    if (['admin', 'superadmin'].includes(role)) return true;
    // Check if the role is one of branch-level roles
    if (branchRoles.includes(role)) {
        return user.branch?.id === ticket.createdBy?.branch?.id;
    }
    // Default: only assigned or created by
    return ticket.assignTo?.id === user.id || ticket.createdBy?.id === user.id;
}
