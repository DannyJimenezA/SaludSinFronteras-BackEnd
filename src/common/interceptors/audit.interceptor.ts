import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService, AuditAction } from '../services/audit.service';
import { AUDIT_METADATA } from '../decorators/audit-log.decorator';

/**
 * Interceptor para auditoría automática de accesos a datos
 *
 * Se activa cuando un endpoint tiene el decorator @AuditLog('ResourceType')
 * Registra automáticamente la acción en la tabla DataAccessLogs
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Obtener el tipo de recurso del metadata
    const resourceType = this.reflector.get<string>(
      AUDIT_METADATA,
      context.getHandler(),
    );

    // Si no hay metadata de auditoría, no hacer nada
    if (!resourceType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Del JWT (JwtAuthGuard)
    const method = request.method;

    // Determinar la acción basada en el método HTTP
    let action: AuditAction;
    switch (method) {
      case 'GET':
      case 'HEAD':
        action = 'READ';
        break;
      case 'POST':
        action = 'CREATE';
        break;
      case 'PATCH':
      case 'PUT':
        action = 'UPDATE';
        break;
      case 'DELETE':
        action = 'DELETE';
        break;
      default:
        action = 'READ';
    }

    return next.handle().pipe(
      tap((response) => {
        // Extraer el ID del recurso
        // Intentar obtenerlo de varios lugares
        let resourceId: bigint | undefined;

        // 1. De los parámetros de la ruta (ej: /medical-records/:id)
        if (request.params?.id) {
          resourceId = BigInt(request.params.id);
        }
        // 2. De la respuesta (si tiene campo Id)
        else if (response?.Id) {
          resourceId = BigInt(response.Id);
        }
        // 3. De parámetros específicos (ej: patientId, appointmentId)
        else if (request.params?.patientId) {
          resourceId = BigInt(request.params.patientId);
        } else if (request.params?.appointmentId) {
          resourceId = BigInt(request.params.appointmentId);
        }

        // Solo registrar si tenemos usuario y resourceId
        if (user && resourceId) {
          this.auditService.logDataAccess({
            userId: BigInt(user.sub),
            resourceType,
            resourceId,
            action,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          });
        }
      }),
    );
  }
}
