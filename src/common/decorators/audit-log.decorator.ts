import { SetMetadata } from '@nestjs/common';

/**
 * Clave para almacenar metadata de auditoría
 */
export const AUDIT_METADATA = 'audit_metadata';

/**
 * Decorator para marcar endpoints que requieren auditoría automática
 *
 * @param resourceType - Tipo de recurso (ej: 'MedicalRecord', 'Appointment', 'User')
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @AuditLog('MedicalRecord')
 * async getRecord(@Param('id') id: string) {
 *   // ...
 * }
 * ```
 */
export const AuditLog = (resourceType: string) =>
  SetMetadata(AUDIT_METADATA, resourceType);
