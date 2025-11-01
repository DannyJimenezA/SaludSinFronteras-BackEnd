import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DashboardService } from './services/dashboard.service';
import { UsersManagementService } from './services/users-management.service';
import { AppointmentStatusesService } from '../appointments/appointment-statuses.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AdminModule
 *
 * Módulo que gestiona el panel de administración y gestión de usuarios.
 *
 * Servicios:
 * - DashboardService: Estadísticas y métricas del sistema
 * - UsersManagementService: Gestión de usuarios (listar, banear, eliminar)
 *
 * Endpoints (solo ADMIN):
 * - GET /admin/dashboard/stats - Estadísticas generales
 * - GET /admin/dashboard/appointments-by-status - Citas por estado
 * - GET /admin/dashboard/subscriptions-by-plan - Suscripciones por plan
 * - GET /admin/dashboard/user-activity - Actividad de usuarios
 * - GET /admin/dashboard/top-doctors - Top doctores
 * - GET /admin/dashboard/audit-logs - Logs de auditoría
 * - GET /admin/users - Listar usuarios con filtros
 * - GET /admin/users/:id - Ver detalles de un usuario
 * - POST /admin/users/:id/ban - Banear usuario
 * - POST /admin/users/:id/unban - Desbanear usuario
 * - DELETE /admin/users/:id - Eliminar usuario
 */
@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [DashboardService, UsersManagementService, AppointmentStatusesService],
  exports: [DashboardService, UsersManagementService],
})
export class AdminModule {}
