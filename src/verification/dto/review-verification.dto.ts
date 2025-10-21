import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

/**
 * DTO para que un ADMIN apruebe o rechace la verificación de un doctor
 */
export class ReviewVerificationDto {
  /**
   * Acción a realizar: "approve" o "reject"
   */
  @IsString()
  @IsNotEmpty()
  @IsIn(['approve', 'reject'], {
    message: 'La acción debe ser "approve" o "reject"',
  })
  Action: 'approve' | 'reject';

  /**
   * Notas del administrador sobre la revisión
   *
   * Opcional para aprobación, requerido para rechazo.
   */
  @IsString()
  @IsOptional()
  AdminNotes?: string;

  /**
   * Razón de rechazo (solo si Action = "reject")
   *
   * Ejemplos:
   * - "Documentos ilegibles o de baja calidad"
   * - "Licencia médica expirada"
   * - "Falta diploma de especialidad"
   * - "Documentos no coinciden con la información del perfil"
   */
  @IsString()
  @IsOptional()
  RejectionReason?: string;
}
