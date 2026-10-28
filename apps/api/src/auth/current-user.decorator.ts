import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { User } from '../users/user.entity';

/** The user the guard already loaded and verified still exists. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User =>
    context.switchToHttp().getRequest<{ user: User }>().user,
);
