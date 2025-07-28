import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDecimal, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmployeeStatus } from '../entities/employee.entity';
import { isNotEmpty, IsNumber } from '@nestjs/class-validator';

export class CreateEmployeeDto {
    @IsString()
    @IsOptional()
    employeeId?: string;

    @ApiProperty({ example: 'Aftab', description: 'first name of the employee' })
    @IsString()
    firstName: string;

    @ApiProperty({ example: '', description: 'Name of the employee' })
    @IsString()
    middleName: string;

    @ApiProperty({ example: 'Alam', description: 'last name of the employee' })
    @IsString()
    lastName: string;

    @ApiProperty({ example: '1', description: 'copmany id' })
    @IsNumber()
    company: number;

    @ApiProperty({ example: 'Software Engineer', description: "Employee's designation" })
    @IsNotEmpty()
    @IsString()
    designation: string;

    @ApiProperty({ example: 50000.0, description: "Employee's salary" })
    @IsNotEmpty()
    @IsDecimal()
    salary: number;

    @ApiProperty({ example: 1, description: 'USER ID the employee belongs to' })
    @IsNotEmpty()
    userId: number;

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
    @IsNotEmpty()
    @IsString()
    phone: string;

    @ApiProperty({ example: 'employee@example.com', description: "Employee's email" })
    @IsNotEmpty()
    @IsEmail()
    email: string;

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
    @IsNotEmpty()
    @IsInt()
    departmentId: number;

    @ApiProperty({ example: 'active/inactive', description: 'employment status' })
    employmentStatus: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
