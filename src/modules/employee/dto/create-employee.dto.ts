import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDecimal,
    IsEmail,
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsArray,
    Validate
} from 'class-validator';
import { EmployeeStatus } from '../entities/employee.entity';
import { IsNumber } from '@nestjs/class-validator';
import { RmStatus } from '../entities/dealer.entity';

export class CreateEmployeeDto {
    @ApiProperty({ example: '1234567890', description: 'Employee ID' })
    @IsString()
    @IsNotEmpty()
    employeeId: string;

    @ApiProperty({ example: '1234567890', description: 'Dealer ID' })
    @IsString()
    @IsOptional()
    dealerId?: string;

    @ApiProperty({ example: 'ABCDE1234F', description: 'Pan Number' })
    @IsString()
    @IsOptional()
    panNumber?: string;

    @ApiProperty({ example: 'Aftab', description: 'First name of the employee' })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({ example: '', description: 'Middle name of the employee' })
    @IsString()
    @IsOptional()
    middleName?: string;

    @ApiProperty({ example: 'Alam', description: 'Last name of the employee' })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiProperty({ example: 1, description: 'Company ID' })
    @IsNumber()
    @IsNotEmpty()
    companyId: number;

    @ApiProperty({ description: 'Id of Role', example: 3 })
    @IsOptional()
    @IsNumber()
    roleId?: number;

    @ApiProperty({ example: 'Software Engineer', description: "Employee's designation" })
    @IsOptional()
    @IsString()
    designation?: string;

    @ApiProperty({ example: 50000.0, description: "Employee's salary" })
    @IsDecimal()
    @IsOptional()
    salary?: number;

    @ApiProperty({ example: 1, description: 'USER ID the employee belongs to' })
    @IsOptional()
    @IsNumber()
    userId?: number;

    @ApiProperty({ example: 'active', description: 'if the is rm or not' })
    @IsOptional()
    @IsString()
    rmStatus?: RmStatus;

    @ApiProperty({ example: 'ABC1', description: 'Branch ID the employee belongs to' })
    @IsNotEmpty()
    @IsString()
    branchId: string;

    @ApiProperty({ example: '2024-01-01T12:00:00.000Z', description: 'Date of joining' })
    @IsOptional()
    dateOfJoining?: Date;

    @ApiProperty({ example: true, description: 'Is the employee on probation?' })
    @IsOptional()
    @IsBoolean()
    probation?: boolean;

    @ApiProperty({ example: '9876543210', description: "Employee's phone number" })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiProperty({ example: 'employee@example.com', description: "Employee's email" })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password', description: 'Password' })
    @IsOptional()
    @IsString()
    password?: string;

    @ApiProperty({
        example: EmployeeStatus.ACTIVE,
        description: 'Employee status',
        enum: EmployeeStatus,
        default: EmployeeStatus.ACTIVE
    })
    @IsOptional()
    @IsEnum(EmployeeStatus)
    status?: EmployeeStatus;

    @ApiProperty({ example: true, description: 'Is the employee retained?' })
    @IsOptional()
    @IsBoolean()
    retain?: boolean;

    @ApiProperty({ example: 5, description: 'Total leave days available for the employee' })
    @IsOptional()
    @IsInt()
    leaveDays?: number;

    @ApiProperty({ example: 2, description: 'Department ID the employee belongs to' })
    @IsOptional()
    @IsInt()
    departmentId?: number;

    @ApiProperty({ example: ['Terminal1', 'Terminal2'], description: 'List of terminals the employee can access' })
    @IsOptional()
    @Validate(
        (value) => {
            if (value === undefined || value === null) return true;
            if (value instanceof Set)
                return Array.from(value).every((v: any) => typeof v === 'string' && v.trim() !== '');
            if (Array.isArray(value)) return value.every((v) => typeof v === 'string' && v.trim() !== '');
            return false;
        },
        { message: 'Terminals must be a Set<string> or string[] with non-empty strings' }
    )
    terminals?: Set<string> | string[];
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
