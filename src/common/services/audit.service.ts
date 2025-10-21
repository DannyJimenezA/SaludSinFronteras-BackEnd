import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AuditAction = 'READ' | 'CREATE' | 'UPDATE' | 'DELETE';

export interface LogDataAccessParams {
  userId: bigint;
  resourceType: string;
  resourceId: bigint;
  action: AuditAction;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra un acceso a datos en la tabla DataAccessLogs
   * Cumplimiento HIPAA/GDPR: auditoría de accesos a información sensible
   */
  async logDataAccess(params: LogDataAccessParams): Promise<void> {
    try {
      await this.prisma.dataAccessLogs.create({
        data: {
          UserId: params.userId,
          ResourceType: params.resourceType,
          ResourceId: params.resourceId,
          Action: params.action,
          IpAddress: params.ipAddress?.substring(0, 45), // Limitar longitud
          UserAgent: params.userAgent?.substring(0, 255), // Limitar longitud
        },
      });
    } catch (error) {
      // No fallar la request si falla el log de auditoría
      console.error('Error logging data access:', error);
    }
  }

  /**
   * Obtiene logs de auditoría por usuario
   */
  async getUserAccessLogs(userId: bigint, limit: number = 100) {
    return this.prisma.dataAccessLogs.findMany({
      where: { UserId: userId },
      orderBy: { CreatedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtiene logs de auditoría por recurso
   */
  async getResourceAccessLogs(
    resourceType: string,
    resourceId: bigint,
    limit: number = 100,
  ) {
    return this.prisma.dataAccessLogs.findMany({
      where: {
        ResourceType: resourceType,
        ResourceId: resourceId,
      },
      orderBy: { CreatedAt: 'desc' },
      take: limit,
      include: {
        User: {
          select: {
            Id: true,
            Email: true,
            FirstName: true,
            LastName1: true,
            Role: true,
          },
        },
      },
    });
  }

  /**
   * Obtiene estadísticas de accesos por tipo de recurso
   */
  async getAccessStatsByResourceType(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.CreatedAt = {};
      if (startDate) where.CreatedAt.gte = startDate;
      if (endDate) where.CreatedAt.lte = endDate;
    }

    return this.prisma.dataAccessLogs.groupBy({
      by: ['ResourceType', 'Action'],
      _count: true,
      where,
    });
  }
}
