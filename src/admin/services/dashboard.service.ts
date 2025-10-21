import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
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
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener estadísticas generales del dashboard
   *
   * Retorna todos los contadores y métricas principales en una sola consulta optimizada.
   */
  async getGeneralStats(): Promise<DashboardStatsDto> {
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

      // Citas por estado
      this.prisma.appointments.groupBy({
        by: ['Status'],
        _count: true,
      }),

      // Total de historiales médicos
      this.prisma.medicalRecords.count(),

      // Historiales médicos este mes
      this.prisma.medicalRecords.count({
        where: {
          CreatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),

      // Estadísticas de suscripciones
      this.getSubscriptionStats(),

      // Nuevos usuarios hoy
      this.prisma.users.count({
        where: {
          CreatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),

      // Nuevos usuarios esta semana
      this.prisma.users.count({
        where: {
          CreatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Nuevos usuarios este mes
      this.prisma.users.count({
        where: {
          CreatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
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

    // Procesar citas por estado
    const appointmentStatusMap = appointmentsByStatus.reduce(
      (acc, item) => {
        acc[item.Status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Contar citas próximas (futuras)
    const upcomingAppointments = await this.prisma.appointments.count({
      where: {
        ScheduledAt: {
          gte: new Date(),
        },
        Status: {
          in: ['PENDING', 'CONFIRMED'],
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
      by: ['Status'],
      _count: true,
    });

    const total = appointments.reduce((sum, item) => sum + item._count, 0);

    return appointments.map((item) => ({
      status: item.Status,
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
        Plan: true,
      },
    });

    // Agrupar por plan
    const planStats = subscriptions.reduce(
      (acc, sub) => {
        const planName = sub.Plan.Name;
        if (!acc[planName]) {
          acc[planName] = {
            count: 0,
            revenueCents: 0,
          };
        }
        acc[planName].count++;
        acc[planName].revenueCents += sub.Plan.PriceCents;
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
    const doctors = await this.prisma.doctorProfiles.findMany({
      select: {
        UserId: true,
        VerificationStatus: true,
        Users: {
          select: {
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
        Appointments: {
          select: {
            Status: true,
          },
        },
      },
    });

    const doctorsWithStats = doctors.map((doctor) => {
      const appointments = doctor.Appointments;
      const totalAppointments = appointments.length;
      const completedAppointments = appointments.filter(
        (a) => a.Status === 'COMPLETED',
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
        User: {
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
      userName: `${log.User.FirstName} ${log.User.LastName1}`,
      userRole: log.User.Role,
      resourceType: log.ResourceType,
      resourceId: log.ResourceId,
      action: log.Action,
      ipAddress: log.IpAddress || undefined,
      createdAt: log.CreatedAt,
    }));
  }

  /**
   * Método auxiliar para obtener estadísticas de suscripciones
   */
  private async getSubscriptionStats() {
    const activeSubscriptions = await this.prisma.subscriptions.findMany({
      where: { IsActive: true },
      include: { Plan: true },
    });

    const basicSubs = activeSubscriptions.filter(
      (s) => s.Plan.Name === 'Basic',
    );
    const professionalSubs = activeSubscriptions.filter(
      (s) => s.Plan.Name === 'Professional',
    );
    const premiumSubs = activeSubscriptions.filter(
      (s) => s.Plan.Name === 'Premium',
    );

    // Calcular ingresos totales
    const totalRevenueCents = activeSubscriptions.reduce(
      (sum, sub) => sum + sub.Plan.PriceCents,
      0,
    );

    // Calcular ingresos de este mes (suscripciones creadas este mes)
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );
    const revenueThisMonthCents = activeSubscriptions
      .filter((sub) => sub.StartAt >= startOfMonth)
      .reduce((sum, sub) => sum + sub.Plan.PriceCents, 0);

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
