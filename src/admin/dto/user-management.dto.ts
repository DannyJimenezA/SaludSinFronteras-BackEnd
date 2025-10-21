import { IsBoolean, IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * DTO para actualizar el estado de un usuario (ban/unban)
 */
export class UpdateUserStatusDto {
  /**
   * Razón del ban (requerido si se está baneando)
   */
  @IsString()
  @IsOptional()
  Reason?: string;
}

/**
 * DTO para filtros de búsqueda de usuarios (query params)
 */
export class UserFiltersDto {
  /**
   * Filtrar por rol
   */
  @IsString()
  @IsOptional()
  @IsIn(['ADMIN', 'DOCTOR', 'PATIENT'])
  role?: 'ADMIN' | 'DOCTOR' | 'PATIENT';

  /**
   * Filtrar por estado de verificación de email
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isEmailVerified?: boolean;

  /**
   * Filtrar por estado de verificación de doctor (solo para DOCTOR)
   */
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected'])
  verificationStatus?: 'pending' | 'approved' | 'rejected';

  /**
   * Búsqueda por texto (nombre o email)
   */
  @IsString()
  @IsOptional()
  search?: string;

  /**
   * Número de página (default: 1)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Elementos por página (default: 20)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

/**
 * DTO para respuesta de usuario en lista
 */
export interface UserListItemDto {
  id: string | bigint;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  createdAt: Date;

  // Solo para doctores
  verificationStatus?: string;
  licenseNumber?: string;
}

/**
 * DTO para respuesta de usuario detallado
 */
export interface UserDetailDto extends UserListItemDto {
  firstName: string;
  lastName1: string;
  lastName2?: string;
  phone?: string;
  birthDate?: Date;

  // Estadísticas del usuario
  totalAppointments?: number;
  totalMedicalRecords?: number;
  activeSubscription?: {
    planName: string;
    expiresAt?: Date;
  };

  // Metadata
  lastLogin?: Date;
  updatedAt: Date;
}
