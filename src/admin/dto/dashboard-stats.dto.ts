/**
 * DTO para estadísticas generales del dashboard
 */
export interface DashboardStatsDto {
  // Contadores generales
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAdmins: number;

  // Doctores
  verifiedDoctors: number;
  pendingDoctors: number;
  rejectedDoctors: number;

  // Citas
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  upcomingAppointments: number;

  // Historiales médicos
  totalMedicalRecords: number;
  medicalRecordsThisMonth: number;

  // Suscripciones
  activeSubscriptions: number;
  basicSubscriptions: number;
  professionalSubscriptions: number;
  premiumSubscriptions: number;

  // Ingresos simulados (basado en suscripciones)
  totalRevenueCents: number; // En centavos
  revenueThisMonthCents: number;

  // Actividad reciente
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

/**
 * DTO para estadísticas de citas por estado
 */
export interface AppointmentsByStatusDto {
  status: string;
  count: number;
  percentage: number;
}

/**
 * DTO para estadísticas de suscripciones por plan
 */
export interface SubscriptionsByPlanDto {
  planName: string;
  count: number;
  revenueCents: number;
  percentage: number;
}

/**
 * DTO para actividad de usuarios (registro por día/semana/mes)
 */
export interface UserActivityDto {
  date: string; // YYYY-MM-DD
  newUsers: number;
  newDoctors: number;
  newPatients: number;
}

/**
 * DTO para top doctores (por número de citas)
 */
export interface TopDoctorDto {
  doctorId: string | bigint;
  doctorName: string;
  email: string;
  totalAppointments: number;
  completedAppointments: number;
  averageRating?: number; // Placeholder para futuro sistema de ratings
  isVerified: boolean;
}

/**
 * DTO para logs de auditoría recientes
 */
export interface RecentAuditLogDto {
  id: string | bigint;
  userId: string | bigint;
  userName: string;
  userRole: string;
  resourceType: string;
  resourceId?: string | bigint;
  action: string;
  ipAddress?: string;
  createdAt: Date;
}
