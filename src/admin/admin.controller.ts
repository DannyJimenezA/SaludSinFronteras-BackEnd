import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { DashboardService } from './services/dashboard.service';
import { UsersManagementService } from './services/users-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserStatusDto, UserFiltersDto } from './dto/user-management.dto';

/**
 * AdminController - Panel de administración
 *
 * Endpoints protegidos para ADMIN:
 * - Dashboard: Estadísticas y métricas
 * - Gestión de usuarios: Listar, ver, banear, eliminar
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly usersManagementService: UsersManagementService,
  ) {}

  // ==========================================
  // DASHBOARD - ESTADÍSTICAS
  // ==========================================

  /**
   * Obtener estadísticas generales del dashboard
   *
   * Retorna todos los contadores principales:
   * - Total de usuarios por rol
   * - Doctores por estado de verificación
   * - Citas por estado
   * - Suscripciones activas
   * - Ingresos simulados
   * - Nuevos usuarios (hoy, semana, mes)
   *
   * @returns Objeto con todas las estadísticas
   *
   * @example
   * GET /admin/dashboard/stats
   */
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.dashboardService.getGeneralStats();
  }

  /**
   * Obtener estadísticas de citas por estado
   *
   * @returns Array de citas agrupadas por estado con porcentajes
   *
   * @example
   * GET /admin/dashboard/appointments-by-status
   * Response:
   * [
   *   { "status": "completed", "count": 150, "percentage": 50 },
   *   { "status": "scheduled", "count": 100, "percentage": 33.33 },
   *   { "status": "cancelled", "count": 50, "percentage": 16.67 }
   * ]
   */
  @Get('dashboard/appointments-by-status')
  async getAppointmentsByStatus() {
    return this.dashboardService.getAppointmentsByStatus();
  }

  /**
   * Obtener estadísticas de suscripciones por plan
   *
   * @returns Array de suscripciones agrupadas por plan con ingresos
   *
   * @example
   * GET /admin/dashboard/subscriptions-by-plan
   */
  @Get('dashboard/subscriptions-by-plan')
  async getSubscriptionsByPlan() {
    return this.dashboardService.getSubscriptionsByPlan();
  }

  /**
   * Obtener actividad de usuarios (últimos 30 días)
   *
   * @param days - Número de días a consultar (default: 30)
   * @returns Array de actividad diaria con nuevos usuarios
   *
   * @example
   * GET /admin/dashboard/user-activity?days=7
   */
  @Get('dashboard/user-activity')
  async getUserActivity(@Query('days', ParseIntPipe) days: number = 30) {
    return this.dashboardService.getUserActivity(days);
  }

  /**
   * Obtener top doctores (por citas completadas)
   *
   * @param limit - Número de doctores a retornar (default: 10)
   * @returns Array de top doctores con estadísticas
   *
   * @example
   * GET /admin/dashboard/top-doctors?limit=5
   */
  @Get('dashboard/top-doctors')
  async getTopDoctors(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.dashboardService.getTopDoctors(limit);
  }

  /**
   * Obtener logs de auditoría recientes
   *
   * @param limit - Número de logs a retornar (default: 50)
   * @returns Array de logs de auditoría
   *
   * @example
   * GET /admin/dashboard/audit-logs?limit=20
   */
  @Get('dashboard/audit-logs')
  async getAuditLogs(@Query('limit', ParseIntPipe) limit: number = 50) {
    return this.dashboardService.getRecentAuditLogs(limit);
  }

  // ==========================================
  // GESTIÓN DE USUARIOS
  // ==========================================

  /**
   * Listar usuarios con filtros y paginación
   *
   * @param query - Filtros de búsqueda (rol, verificación, búsqueda por texto) + paginación
   * @returns Lista paginada de usuarios
   *
   * @example
   * GET /admin/users?role=DOCTOR&page=1&limit=10
   * GET /admin/users?search=juan&isEmailVerified=true
   * GET /admin/users?role=DOCTOR&verificationStatus=pending
   */
  @Get('users')
  async listUsers(@Query() query: UserFiltersDto) {
    const { page = 1, limit = 20, ...filters } = query;
    return this.usersManagementService.listUsers(filters, page, limit);
  }

  /**
   * Obtener detalles de un usuario específico
   *
   * @param userId - ID del usuario
   * @returns Información detallada del usuario con estadísticas
   *
   * @example
   * GET /admin/users/5
   */
  @Get('users/:userId')
  async getUserDetails(@Param('userId') userId: string) {
    return this.usersManagementService.getUserDetails(BigInt(userId));
  }

  /**
   * Banear a un usuario
   *
   * El usuario no podrá iniciar sesión hasta ser desbaneado.
   * No se pueden banear otros administradores.
   *
   * @param userId - ID del usuario a banear
   * @param dto - Razón del ban
   * @returns Mensaje de confirmación
   *
   * @example
   * POST /admin/users/5/ban
   * Body: {
   *   "Reason": "Violación de términos de servicio: spam en consultas médicas"
   * }
   */
  @Post('users/:userId/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersManagementService.banUser(
      BigInt(userId),
      dto.Reason || 'Sin razón especificada',
    );
  }

  /**
   * Desbanear a un usuario
   *
   * El usuario podrá volver a iniciar sesión normalmente.
   *
   * @param userId - ID del usuario a desbanear
   * @returns Mensaje de confirmación
   *
   * @example
   * POST /admin/users/5/unban
   */
  @Post('users/:userId/unban')
  @HttpCode(HttpStatus.OK)
  async unbanUser(@Param('userId') userId: string) {
    return this.usersManagementService.unbanUser(BigInt(userId));
  }

  /**
   * Eliminar a un usuario permanentemente
   *
   * ⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE.
   * Se eliminan todos los datos relacionados:
   * - Historiales médicos
   * - Citas
   * - Suscripciones
   * - Mensajes
   * - Archivos
   * - Logs de auditoría
   *
   * No se pueden eliminar otros administradores.
   *
   * @param userId - ID del usuario a eliminar
   * @returns Mensaje de confirmación
   *
   * @example
   * DELETE /admin/users/5
   */
  @Delete('users/:userId')
  async deleteUser(@Param('userId') userId: string) {
    return this.usersManagementService.deleteUser(BigInt(userId));
  }
}
