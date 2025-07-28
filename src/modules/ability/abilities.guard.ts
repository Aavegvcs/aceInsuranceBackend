import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory } from './ability.factory';
import { RequiredRule, CHECK_ABILITY } from './abilities.decorator';
import { ForbiddenError } from '@casl/ability';
@Injectable()
export class AbilitiesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private caslAbilityFactory: AbilityFactory
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const rules = this.reflector.get<RequiredRule[]>(CHECK_ABILITY, context.getHandler()) || [];

        const { user } = context.switchToHttp().getRequest();
        const ability = await this.caslAbilityFactory.defineAbility(user);

        rules.forEach((rule) =>
            ForbiddenError.from(ability).setMessage('Forbidden Resource').throwUnlessCan(rule.action, rule.subject)
        );

        return true;
    }
}
