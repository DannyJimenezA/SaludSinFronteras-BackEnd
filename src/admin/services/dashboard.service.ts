import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentStatusesService } from '../../appointments/appointment-statuses.service';
import {
  DashboardStatsDto,
  AppointmentsByStatusDto,
  SubscriptionsByPlanDto,
  UserActivityDto,
  TopDoctorDto,
  RecentAuditLogDto,
} from '../dto/dashboard-stats.dto';

/**
 * DashboardService - Servicio para obtener estadísticas del dashboard
 *
 * Proporciona métricas y KPIs para el panel de administración:
 * - Contadores generales (usuarios, doctores, pacientes, citas)
 * - Estadísticas de verificación de doctores
 * - Ingresos por suscripciones
 * - Actividad de usuarios
 * - Top doctores
 * - Logs de auditoría recientes
 */
@Injectable()
export class DashboardService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private statusService: AppointmentStatusesService,
  ) {}

  async onModuleInit() {
    await this.statusService.initializeCache();
  }

  /**
   * Obtener estadísticas generales del dashboard
   *
   * Retorna todos los contadores y métricas principales en una sola consulta optimizada.
   *
   * @param month - Mes específico para filtrar (1-12, opcional)
   * @param year - Año específico para filtrar (opcional)
   */
  async getGeneralStats(month?: number, year?: number): Promise<DashboardStatsDto> {
    // Determinar el rango de fechas para el filtro
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month ? month - 1 : now.getMonth(); // month en JS es 0-indexed

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    // Determinar fechas para "este mes" y "esta semana" si estamos en el mes actual
    const isCurrentMonth = targetYear === now.getFullYear() && targetMonth === now.getMonth();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Ejecutar todas las queries en paralelo para mejor rendimiento
    const [
      totalUsers,
      usersByRole,
      doctorsByStatus,
      appointmentsByStatus,
      totalMedicalRecords,
      medicalRecordsThisMonth,
      subscriptionStats,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      // Total de usuarios
      this.prisma.users.count(),

      // Usuarios por rol
      this.prisma.users.groupBy({
        by: ['Role'],
        _count: true,
      }),

      // Doctores por estado de verificación
      this.prisma.doctorProfiles.groupBy({
        by: ['VerificationStatus'],
        _count: true,
      }),

      // Citas por estado (del mes/año seleccionado)
      this.prisma.appointments.groupBy({
        by: ['StatusId'],
        _count: true,
        where: {
          CreatedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),

      // Total de historiales médicos
      this.prisma.medicalRecords.count(),

      // Historiales médicos del mes seleccionado
      this.prisma.medicalRecords.count({
        where: {
          CreatedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),

      // Estadísticas de suscripciones (filtradas por mes/año)
      this.getSubscriptionStats(startOfMonth, endOfMonth),

      // Nuevos usuarios hoy (solo si estamos viendo el mes actual)
      isCurrentMonth
        ? this.prisma.users.count({
            where: {
              CreatedAt: {
                gte: todayStart,
              },
            },
          })
        : 0,

      // Nuevos usuarios esta semana (solo si estamos viendo el mes actual)
      isCurrentMonth
        ? this.prisma.users.count({
            where: {
              CreatedAt: {
                gte: weekStart,
              },
            },
          })
        : 0,

      // Nuevos usuarios en el mes seleccionado
      this.prisma.users.count({
        where: {
          CreatedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      }),
    ]);

    // Procesar contadores por rol
    const roleCountsMap = usersByRole.reduce(
      (acc, item) => {
        acc[item.Role] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Procesar doctores por estado
    const doctorStatusMap = doctorsByStatus.reduce(
      (acc, item) => {
        acc[item.VerificationStatus] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Obtener todos los estados para mapear IDs a códigos
    const allStatuses = await this.prisma.appointmentStatuses.findMany({
      select: { Id: true, Code: true },
    });
    const statusIdToCode = new Map(allStatuses.map(s => [s.Id, s.Code]));

    // Procesar citas por estado
    const appointmentStatusMap = appointmentsByStatus.reduce(
      (acc, item) => {
        const code = statusIdToCode.get(item.StatusId) || 'UNKNOWN';
        acc[code] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Contar citas próximas (futuras)
    const activeStatusIds = await this.statusService.getStatusIds([
      'PENDING',
      'CONFIRMED',
    ]);
    const upcomingAppointments = await this.prisma.appointments.count({
      where: {
        ScheduledAt: {
          gte: new Date(),
        },
        StatusId: {
          in: activeStatusIds,
        },
      },
    });

    return {
      // Usuarios
      totalUsers,
      totalDoctors: roleCountsMap['DOCTOR'] || 0,
      totalPatients: roleCountsMap['PATIENT'] || 0,
      totalAdmins: roleCountsMap['ADMIN'] || 0,

      // Doctores
      verifiedDoctors: doctorStatusMap['approved'] || 0,
      pendingDoctors: doctorStatusMap['pending'] || 0,
      rejectedDoctors: doctorStatusMap['rejected'] || 0,

      // Citas
      totalAppointments: appointmentsByStatus.reduce(
        (sum, item) => sum + item._count,
        0,
      ),
      completedAppointments: appointmentStatusMap['completed'] || 0,
      cancelledAppointments: appointmentStatusMap['cancelled'] || 0,
      upcomingAppointments,

      // Historiales médicos
      totalMedicalRecords,
      medicalRecordsThisMonth,

      // Suscripciones
      activeSubscriptions: subscriptionStats.activeSubscriptions,
      basicSubscriptions: subscriptionStats.basicSubscriptions,
      professionalSubscriptions: subscriptionStats.professionalSubscriptions,
      premiumSubscriptions: subscriptionStats.premiumSubscriptions,

      // Ingresos
      totalRevenueCents: subscriptionStats.totalRevenueCents,
      revenueThisMonthCents: subscriptionStats.revenueThisMonthCents,

      // Actividad
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
    };
  }

  /**
   * Obtener estadísticas de citas por estado
   */
  async getAppointmentsByStatus(): Promise<AppointmentsByStatusDto[]> {
    const appointments = await this.prisma.appointments.groupBy({
      by: ['StatusId'],
      _count: true,
    });

    // Obtener todos los estados para mapear IDs a códigos
    const allStatuses = await this.prisma.appointmentStatuses.findMany({
      select: { Id: true, Code: true },
    });
    const statusIdToCode = new Map(allStatuses.map(s => [s.Id, s.Code]));

    const total = appointments.reduce((sum, item) => sum + item._count, 0);

    return appointments.map((item) => ({
      status: statusIdToCode.get(item.StatusId) || 'UNKNOWN',
      count: item._count,
      percentage: total > 0 ? (item._count / total) * 100 : 0,
    }));
  }

  /**
   * Obtener estadísticas de suscripciones por plan
   */
  async getSubscriptionsByPlan(): Promise<SubscriptionsByPlanDto[]> {
    const subscriptions = await this.prisma.subscriptions.findMany({
      where: { IsActive: true },
      include: {
        Plans: true,
      },
    });

    // Agrupar por plan
    const planStats = subscriptions.reduce(
      (acc, sub) => {
        const planName = sub.Plans.Name;
        if (!acc[planName]) {
          acc[planName] = {
            count: 0,
            revenueCents: 0,
          };
        }
        acc[planName].count++;
        acc[planName].revenueCents += sub.Plans.PriceCents;
        return acc;
      },
      {} as Record<string, { count: number; revenueCents: number }>,
    );

    const total = subscriptions.length;

    return Object.entries(planStats).map(([planName, stats]) => ({
      planName,
      count: stats.count,
      revenueCents: stats.revenueCents,
      percentage: total > 0 ? (stats.count / total) * 100 : 0,
    }));
  }

  /**
   * Obtener actividad de usuarios por día (últimos 30 días)
   */
  async getUserActivity(days: number = 30): Promise<UserActivityDto[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const users = await this.prisma.users.findMany({
      where: {
        CreatedAt: {
          gte: startDate,
        },
      },
      select: {
        CreatedAt: true,
        Role: true,
      },
      orderBy: {
        CreatedAt: 'asc',
      },
    });

    // Agrupar por fecha
    const activityMap = new Map<string, UserActivityDto>();

    users.forEach((user) => {
      const dateKey = user.CreatedAt.toISOString().split('T')[0];
      if (!activityMap.has(dateKey)) {
        activityMap.set(dateKey, {
          date: dateKey,
          newUsers: 0,
          newDoctors: 0,
          newPatients: 0,
        });
      }

      const activity = activityMap.get(dateKey)!;
      activity.newUsers++;
      if (user.Role === 'DOCTOR') activity.newDoctors++;
      if (user.Role === 'PATIENT') activity.newPatients++;
    });

    return Array.from(activityMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }

  /**
   * Obtener top doctores (por número de citas completadas)
   */
  async getTopDoctors(limit: number = 10): Promise<TopDoctorDto[]> {
    const completedStatusId = await this.statusService.getStatusId('COMPLETED');

    const doctors = await this.prisma.doctorProfiles.findMany({
      include: {
        Users: {
          select: {
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
        AvailabilitySlots: {
          include: {
            Appointments: {
              select: {
                StatusId: true,
              },
            },
          },
        },
      },
    });

    const doctorsWithStats = doctors.map((doctor) => {
      const appointments = doctor.AvailabilitySlots.flatMap((slot) => slot.Appointments);
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(
        (a) => a.StatusId === completedStatusId,
      ).length;

      return {
        doctorId: doctor.UserId,
        doctorName: `${doctor.Users.FirstName} ${doctor.Users.LastName1}`,
        email: doctor.Users.Email,
        totalAppointments,
        completedAppointments,
        isVerified: doctor.VerificationStatus === 'approved',
      };
    });

    // Ordenar por citas completadas y tomar el top
    return doctorsWithStats
      .sort((a, b) => b.completedAppointments - a.completedAppointments)
      .slice(0, limit);
  }

  /**
   * Obtener logs de auditoría recientes
   */
  async getRecentAuditLogs(limit: number = 50): Promise<RecentAuditLogDto[]> {
    const logs = await this.prisma.dataAccessLogs.findMany({
      take: limit,
      orderBy: {
        CreatedAt: 'desc',
      },
      include: {
        Users: {
          select: {
            FirstName: true,
            LastName1: true,
            Role: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.Id,
      userId: log.UserId,
      userName: `${log.Users.FirstName} ${log.Users.LastName1}`,
      userRole: log.Users.Role,
      resourceType: log.ResourceType,
      resourceId: log.ResourceId,
      action: log.Action,
      ipAddress: log.IpAddress || undefined,
      createdAt: log.CreatedAt,
    }));
  }

  /**
   * Método auxiliar para obtener estadísticas de suscripciones
   *
   * @param startOfMonth - Inicio del rango de fechas para filtrar
   * @param endOfMonth - Fin del rango de fechas para filtrar
   */
  private async getSubscriptionStats(
    startOfMonth: Date,
    endOfMonth: Date,
  ) {
    const activeSubscriptions = await this.prisma.subscriptions.findMany({
      where: { IsActive: true },
      include: { Plans: true },
    });

    const basicSubs = activeSubscriptions.filter(
      (s) => s.Plans.Name === 'Basic',
    );
    const professionalSubs = activeSubscriptions.filter(
      (s) => s.Plans.Name === 'Professional',
    );
    const premiumSubs = activeSubscriptions.filter(
      (s) => s.Plans.Name === 'Premium',
    );

    // Calcular ingresos totales
    const totalRevenueCents = activeSubscriptions.reduce(
      (sum, sub) => sum + sub.Plans.PriceCents,
      0,
    );

    // Calcular ingresos del mes seleccionado (suscripciones creadas en ese mes)
    const revenueThisMonthCents = activeSubscriptions
      .filter((sub) => sub.StartAt >= startOfMonth && sub.StartAt <= endOfMonth)
      .reduce((sum, sub) => sum + sub.Plans.PriceCents, 0);

    return {
      activeSubscriptions: activeSubscriptions.length,
      basicSubscriptions: basicSubs.length,
      professionalSubscriptions: professionalSubs.length,
      premiumSubscriptions: premiumSubs.length,
      totalRevenueCents,
      revenueThisMonthCents,
    };
  }
}
