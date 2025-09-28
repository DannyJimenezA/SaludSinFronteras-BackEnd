// src/auth/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'ADMIN'|'DOCTOR'|'PATIENT'>) => SetMetadata(ROLES_KEY, roles);
