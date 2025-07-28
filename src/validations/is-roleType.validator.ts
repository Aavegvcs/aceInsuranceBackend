import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { Roles } from 'src/utils/app.utils';

export function IsRoleType(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isRoleType',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return Object.values(Roles).includes(value);
                },
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a valid role type`;
                }
            }
        });
    };
}
