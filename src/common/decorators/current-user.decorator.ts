import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Interface para el usuario del JWT
 */
export interface JwtUser {
  sub: number;
  email: string;
  role: string;
}

/**
 * Decorator para extraer el usuario actual del JWT
 *
 * @example
 * ```typescript
 * @Get('profile')
 * async getProfile(@CurrentUser() user: JwtUser) {
 *   console.log(user.sub, user.email, user.role);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    return data ? user?.[data] : user;
  },
);
