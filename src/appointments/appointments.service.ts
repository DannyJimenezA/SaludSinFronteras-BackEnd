import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { AppointmentStatusesService } from './appointment-statuses.service';

@Injectable()
export class AppointmentsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jobs: JobsService,
    private statusService: AppointmentStatusesService,
  ) {}

  async onModuleInit() {
    // Initialize status cache on module startup
    await this.statusService.initializeCache();
  }

  async createForPatient(patientUserId: bigint, dto: { DoctorUserId: number; SlotId: number; Modality?: any }) {
    const doctorId = BigInt(dto.DoctorUserId);
    const slotId   = BigInt(dto.SlotId);

    // Get status IDs
    const cancelledStatusIds = await this.statusService.getStatusIds(['CANCELLED', 'NO_SHOW']);
    const pendingStatusId = await this.statusService.getStatusId('PENDING');

    // valida doctor y slot
    const slot = await this.prisma.availabilitySlots.findUnique({ where: { Id: slotId } });
    if (!slot || slot.DoctorUserId !== doctorId) throw new BadRequestException('Slot/Doctor mismatch');

    // el slot no debe tener cita activa
    const exists = await this.prisma.appointments.findFirst({
      where: {
        SlotId: slotId,
        StatusId: { notIn: cancelledStatusIds },
      },
      select: { Id: true },
    });
    if (exists) throw new BadRequestException('Slot already booked');

    // el paciente no debe tener otra cita en el mismo horario (colisión)
    const collision = await this.prisma.appointments.findFirst({
      where: {
        PatientUserId: patientUserId,
        StatusId: { notIn: cancelledStatusIds },
        ScheduledAt: { lt: slot.EndAt as any },
        // End = ScheduledAt + Duration; como guardamos Duration, comparamos así:
      },
      select: { Id: true },
    });
    // Para simple MVP asumimos 1 cita por slot; si colisiona con otras, puedes reforzar.

    const durationMin = Math.ceil((+slot.EndAt - +slot.StartAt) / 60000);

    const appt = await this.prisma.appointments.create({
      data: {
        PatientUserId: patientUserId,
        DoctorUserId: doctorId,
        SlotId: slotId,
        StatusId: pendingStatusId,
        ScheduledAt: slot.StartAt,
        DurationMin: durationMin,
        Modality: dto.Modality ?? 'online',
        CreatedByUserId: patientUserId,
      },
    });
        const start = new Date(appt.ScheduledAt as any);
    if (!isNaN(start.getTime()) && start.getTime() > Date.now()) {
      const t24 = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const t01 = new Date(start.getTime() - 60 * 60 * 1000);
      await this.jobs.scheduleReminder(appt.Id, t24, 'reminder-24h');
      await this.jobs.scheduleReminder(appt.Id, t01, 'reminder-1h');
    }

    return appt;
  
  }

  async getUpcoming(userId: bigint, role: 'DOCTOR'|'PATIENT', limit: number = 10) {
    const now = new Date();
    const activeStatusIds = await this.statusService.getStatusIds(['PENDING', 'CONFIRMED']);

    const where: any = {
      ScheduledAt: { gte: now },
      StatusId: { in: activeStatusIds },
    };

    // Si es paciente, filtra por sus citas
    if (role === 'PATIENT') {
      where.PatientUserId = userId;
    }
    // Si es doctor, filtra por sus citas
    else if (role === 'DOCTOR') {
      where.DoctorUserId = userId;
    }

    const appointments = await this.prisma.appointments.findMany({
      where,
      orderBy: [{ ScheduledAt: 'asc' }],
      take: limit,
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
        Users_Appointments_PatientUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfiles: {
          select: {
            UserId: true,
            Bio: true,
            Users: {
              select: {
                Id: true,
                FirstName: true,
                LastName1: true,
                LastName2: true,
                Email: true,
              },
            },
          },
        },
        AvailabilitySlots: {
          select: {
            Id: true,
            StartAt: true,
            EndAt: true,
          },
        },
      },
    });

    // Formatea la respuesta para que sea más amigable
    return appointments.map(appt => ({
      id: appt.Id.toString(),
      scheduledAt: appt.ScheduledAt,
      durationMin: appt.DurationMin,
      status: appt.AppointmentStatuses?.Code || 'UNKNOWN',
      modality: appt.Modality,
      doctor: appt.DoctorProfiles?.Users ? {
        id: appt.DoctorProfiles.Users.Id.toString(),
        name: `${appt.DoctorProfiles.Users.FirstName || ''} ${appt.DoctorProfiles.Users.LastName1 || ''}`.trim(),
        specialty: 'General', // La especialidad está en DoctorProfileSpecialties, por ahora dejamos General
        email: appt.DoctorProfiles.Users.Email,
      } : null,
      patient: appt.Users_Appointments_PatientUserIdToUsers ? {
        id: appt.Users_Appointments_PatientUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_PatientUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_PatientUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_PatientUserIdToUsers.Email,
      } : null,
      slot: appt.AvailabilitySlots ? {
        id: appt.AvailabilitySlots.Id.toString(),
        startAt: appt.AvailabilitySlots.StartAt,
        endAt: appt.AvailabilitySlots.EndAt,
      } : null,
    }));
  }

  // Obtener citas de HOY del usuario autenticado (doctor o paciente)
  async getToday(userId: bigint, role: 'DOCTOR'|'PATIENT') {
    // Calculate start and end of today - use UTC to avoid timezone issues
    const now = new Date();

    // Start of day in UTC
    const startOfDay = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));

    // End of day in UTC
    const endOfDay = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23, 59, 59, 999
    ));

    // Get status IDs - incluir más estados activos
    const activeStatusIds = await this.statusService.getStatusIds(['PENDING', 'CONFIRMED']);

    const where: any = {
      ScheduledAt: {
        gte: startOfDay,
        lte: endOfDay
      },
      StatusId: { in: activeStatusIds },
    };

    // Si es paciente, filtra por sus citas
    if (role === 'PATIENT') {
      where.PatientUserId = userId;
    }
    // Si es doctor, filtra por sus citas
    else if (role === 'DOCTOR') {
      where.DoctorUserId = userId;
    }

    const appointments = await this.prisma.appointments.findMany({
      where,
      orderBy: [{ ScheduledAt: 'asc' }],
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
        Users_Appointments_PatientUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfiles: {
          select: {
            UserId: true,
            Bio: true,
            Users: {
              select: {
                Id: true,
                FirstName: true,
                LastName1: true,
                LastName2: true,
                Email: true,
              },
            },
          },
        },
        AvailabilitySlots: {
          select: {
            Id: true,
            StartAt: true,
            EndAt: true,
          },
        },
      },
    });

    // Formatea la respuesta para que sea más amigable
    return appointments.map(appt => ({
      id: appt.Id.toString(),
      scheduledAt: appt.ScheduledAt,
      durationMin: appt.DurationMin,
      status: appt.AppointmentStatuses?.Code || 'UNKNOWN',
      modality: appt.Modality,
      doctor: appt.DoctorProfiles?.Users ? {
        id: appt.DoctorProfiles.Users.Id.toString(),
        name: `${appt.DoctorProfiles.Users.FirstName || ''} ${appt.DoctorProfiles.Users.LastName1 || ''}`.trim(),
        specialty: 'General',
        email: appt.DoctorProfiles.Users.Email,
      } : null,
      patient: appt.Users_Appointments_PatientUserIdToUsers ? {
        id: appt.Users_Appointments_PatientUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_PatientUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_PatientUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_PatientUserIdToUsers.Email,
      } : null,
      slot: appt.AvailabilitySlots ? {
        id: appt.AvailabilitySlots.Id.toString(),
        startAt: appt.AvailabilitySlots.StartAt,
        endAt: appt.AvailabilitySlots.EndAt,
      } : null,
    }));
  }

  async getPast(userId: bigint, role: 'DOCTOR'|'PATIENT', limit: number = 20) {
    const now = new Date();

    // Get status IDs
    const cancelledStatusId = await this.statusService.getStatusId('CANCELLED');

    const where: any = {
      ScheduledAt: { lt: now }, // Citas anteriores a ahora
      StatusId: { notIn: [cancelledStatusId] }, // Excluir solo las canceladas (se muestran en otro filtro)
    };

    // Si es paciente, filtra por sus citas
    if (role === 'PATIENT') {
      where.PatientUserId = userId;
    }
    // Si es doctor, filtra por sus citas
    else if (role === 'DOCTOR') {
      where.DoctorUserId = userId;
    }

    const appointments = await this.prisma.appointments.findMany({
      where,
      orderBy: [{ ScheduledAt: 'desc' }], // Más recientes primero
      take: limit,
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
        Users_Appointments_PatientUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfiles: {
          select: {
            UserId: true,
            Bio: true,
            Users: {
              select: {
                Id: true,
                FirstName: true,
                LastName1: true,
                LastName2: true,
                Email: true,
              },
            },
          },
        },
        AvailabilitySlots: {
          select: {
            Id: true,
            StartAt: true,
            EndAt: true,
          },
        },
      },
    });

    // Formatea la respuesta
    return appointments.map(appt => ({
      id: appt.Id.toString(),
      scheduledAt: appt.ScheduledAt,
      durationMin: appt.DurationMin,
      status: appt.AppointmentStatuses?.Code || 'UNKNOWN',
      modality: appt.Modality,
      doctor: appt.DoctorProfiles?.Users ? {
        id: appt.DoctorProfiles.Users.Id.toString(),
        name: `${appt.DoctorProfiles.Users.FirstName || ''} ${appt.DoctorProfiles.Users.LastName1 || ''}`.trim(),
        specialty: 'General',
        email: appt.DoctorProfiles.Users.Email,
      } : null,
      patient: appt.Users_Appointments_PatientUserIdToUsers ? {
        id: appt.Users_Appointments_PatientUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_PatientUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_PatientUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_PatientUserIdToUsers.Email,
      } : null,
      slot: appt.AvailabilitySlots ? {
        id: appt.AvailabilitySlots.Id.toString(),
        startAt: appt.AvailabilitySlots.StartAt,
        endAt: appt.AvailabilitySlots.EndAt,
      } : null,
    }));
  }

  async getCancelled(userId: bigint, role: 'DOCTOR'|'PATIENT', limit: number = 20) {
    // Get status ID
    const cancelledStatusId = await this.statusService.getStatusId('CANCELLED');

    const where: any = {
      StatusId: cancelledStatusId,
    };

    // Si es paciente, filtra por sus citas
    if (role === 'PATIENT') {
      where.PatientUserId = userId;
    }
    // Si es doctor, filtra por sus citas
    else if (role === 'DOCTOR') {
      where.DoctorUserId = userId;
    }

    const appointments = await this.prisma.appointments.findMany({
      where,
      orderBy: [{ UpdatedAt: 'desc' }], // Más recientemente canceladas primero
      take: limit,
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
        Users_Appointments_PatientUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfiles: {
          select: {
            UserId: true,
            Bio: true,
            Users: {
              select: {
                Id: true,
                FirstName: true,
                LastName1: true,
                LastName2: true,
                Email: true,
              },
            },
          },
        },
        AvailabilitySlots: {
          select: {
            Id: true,
            StartAt: true,
            EndAt: true,
          },
        },
        Users_Appointments_CancelledByUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
      },
    });

    // Formatea la respuesta
    return appointments.map(appt => ({
      id: appt.Id.toString(),
      scheduledAt: appt.ScheduledAt,
      durationMin: appt.DurationMin,
      status: appt.AppointmentStatuses?.Code || 'UNKNOWN',
      modality: appt.Modality,
      cancelReason: appt.CancelReason,
      cancelledBy: appt.Users_Appointments_CancelledByUserIdToUsers ? {
        id: appt.Users_Appointments_CancelledByUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_CancelledByUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_CancelledByUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_CancelledByUserIdToUsers.Email,
      } : null,
      doctor: appt.DoctorProfiles?.Users ? {
        id: appt.DoctorProfiles.Users.Id.toString(),
        name: `${appt.DoctorProfiles.Users.FirstName || ''} ${appt.DoctorProfiles.Users.LastName1 || ''}`.trim(),
        specialty: 'General',
        email: appt.DoctorProfiles.Users.Email,
      } : null,
      patient: appt.Users_Appointments_PatientUserIdToUsers ? {
        id: appt.Users_Appointments_PatientUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_PatientUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_PatientUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_PatientUserIdToUsers.Email,
      } : null,
      slot: appt.AvailabilitySlots ? {
        id: appt.AvailabilitySlots.Id.toString(),
        startAt: appt.AvailabilitySlots.StartAt,
        endAt: appt.AvailabilitySlots.EndAt,
      } : null,
    }));
  }

  async getAll(userId: bigint, role: 'DOCTOR'|'PATIENT', page: number = 1, limit: number = 10, order: 'asc' | 'desc' = 'desc') {
    const where: any = {};

    // Si es paciente, filtra por sus citas
    if (role === 'PATIENT') {
      where.PatientUserId = userId;
    }
    // Si es doctor, filtra por sus citas
    else if (role === 'DOCTOR') {
      where.DoctorUserId = userId;
    }

    // Calcula el skip para la paginación
    const skip = (page - 1) * limit;

    // Obtiene el total de citas para la paginación
    const total = await this.prisma.appointments.count({ where });

    const appointments = await this.prisma.appointments.findMany({
      where,
      orderBy: [{ ScheduledAt: order }],
      skip,
      take: limit,
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
        Users_Appointments_PatientUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfiles: {
          select: {
            UserId: true,
            Bio: true,
            Users: {
              select: {
                Id: true,
                FirstName: true,
                LastName1: true,
                LastName2: true,
                Email: true,
              },
            },
          },
        },
        AvailabilitySlots: {
          select: {
            Id: true,
            StartAt: true,
            EndAt: true,
          },
        },
        Users_Appointments_CancelledByUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
      },
    });

    // Formatea la respuesta
    const data = appointments.map(appt => ({
      id: appt.Id.toString(),
      scheduledAt: appt.ScheduledAt,
      durationMin: appt.DurationMin,
      status: appt.AppointmentStatuses?.Code || 'UNKNOWN',
      modality: appt.Modality,
      cancelReason: appt.CancelReason,
      cancelledBy: appt.Users_Appointments_CancelledByUserIdToUsers ? {
        id: appt.Users_Appointments_CancelledByUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_CancelledByUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_CancelledByUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_CancelledByUserIdToUsers.Email,
      } : null,
      doctor: appt.DoctorProfiles?.Users ? {
        id: appt.DoctorProfiles.Users.Id.toString(),
        name: `${appt.DoctorProfiles.Users.FirstName || ''} ${appt.DoctorProfiles.Users.LastName1 || ''}`.trim(),
        specialty: 'General',
        email: appt.DoctorProfiles.Users.Email,
      } : null,
      patient: appt.Users_Appointments_PatientUserIdToUsers ? {
        id: appt.Users_Appointments_PatientUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_PatientUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_PatientUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_PatientUserIdToUsers.Email,
      } : null,
      slot: appt.AvailabilitySlots ? {
        id: appt.AvailabilitySlots.Id.toString(),
        startAt: appt.AvailabilitySlots.StartAt,
        endAt: appt.AvailabilitySlots.EndAt,
      } : null,
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async list(param: { doctorId?: string; patientId?: string; status?: string; from?: string; to?: string }) {
    const where: any = {};
    if (param.doctorId)  where.DoctorUserId  = BigInt(param.doctorId);
    if (param.patientId) where.PatientUserId = BigInt(param.patientId);

    // Convert status code to ID if provided
    if (param.status) {
      const statusId = await this.statusService.getStatusId(param.status as any);
      where.StatusId = statusId;
    }

    if (param.from) (where.ScheduledAt ??= {}).gte = new Date(param.from);
    if (param.to)   (where.ScheduledAt ??= {}).lte = new Date(param.to);

    return this.prisma.appointments.findMany({
      where,
      orderBy: [{ ScheduledAt: 'desc' }],
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
      },
    });
  }

  async getOne(id: bigint, requesterId: bigint, role: 'ADMIN'|'DOCTOR'|'PATIENT') {
    const appt = await this.prisma.appointments.findUnique({ where: { Id: id } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (role !== 'ADMIN' && appt.PatientUserId !== requesterId && appt.DoctorUserId !== requesterId)
      throw new ForbiddenException('Forbidden');
    return appt;
  }

  async updateStatus(id: bigint, actorId: bigint, role: 'ADMIN'|'DOCTOR'|'PATIENT', data: { Status: any; CancelReason?: string }) {
    const appt = await this.prisma.appointments.findUnique({ where: { Id: id } });
    if (!appt) throw new NotFoundException('Appointment not found');

    // Convert status code to ID
    const statusId = await this.statusService.getStatusId(data.Status);
    const cancelledStatusId = await this.statusService.getStatusId('CANCELLED');

    // reglas simples: PACIENTE puede cancelar su cita; DOCTOR puede confirmar/cancelar/completar; ADMIN todo
    if (role === 'PATIENT') {
      if (appt.PatientUserId !== actorId) throw new ForbiddenException('Forbidden');
      if (data.Status !== 'CANCELLED') throw new BadRequestException('Patients can only cancel');
    }
    if (role === 'DOCTOR') {
      if (appt.DoctorUserId !== actorId) throw new ForbiddenException('Forbidden');
    }

    return this.prisma.appointments.update({
      where: { Id: id },
      data: {
        StatusId: statusId,
        CancelReason: data.CancelReason ?? null,
        CancelledByUserId: statusId === cancelledStatusId ? actorId : null,
      },
    });
  }

    async cancelAppointment(
    id: bigint,
    userId: bigint,
    role: string,
    cancelReason?: string,
  ) {
    // Get status IDs
    const cancelledStatusId = await this.statusService.getStatusId('CANCELLED');
    const completedStatusId = await this.statusService.getStatusId('COMPLETED');

    // Buscar la cita
    const appointment = await this.prisma.appointments.findUnique({
      where: { Id: id },
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Verificar permisos: El paciente o doctor involucrado puede cancelar, o un admin
    const canCancel =
      role === 'ADMIN' ||
      (role === 'DOCTOR' && appointment.DoctorUserId === userId) ||
      (role === 'PATIENT' && appointment.PatientUserId === userId);

    if (!canCancel) {
      throw new ForbiddenException('You do not have permission to cancel this appointment');
    }

    // Verificar que la cita no esté ya cancelada o completada
    if (appointment.StatusId === cancelledStatusId) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    if (appointment.StatusId === completedStatusId) {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    // Actualizar la cita a cancelada
    const updatedAppointment = await this.prisma.appointments.update({
      where: { Id: id },
      data: {
        StatusId: cancelledStatusId,
        CancelledByUserId: userId,
        CancelReason: cancelReason || 'No reason provided',
        UpdatedAt: new Date(),
      },
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
      },
    });

    return {
      message: 'Appointment cancelled successfully',
      appointment: {
        id: updatedAppointment.Id.toString(),
        status: updatedAppointment.AppointmentStatuses?.Code || 'UNKNOWN',
        cancelReason: updatedAppointment.CancelReason,
      },
    };
  }

  async deleteAppointment(id: bigint, userId: bigint, role: string) {
    // Solo ADMIN puede eliminar cualquier cita, DOCTOR/PATIENT solo si son dueños
    const appointment = await this.prisma.appointments.findUnique({ where: { Id: id } });
    if (!appointment) throw new Error('Appointment not found');

    if (
      role === 'ADMIN' ||
      (role === 'DOCTOR' && appointment.DoctorUserId === userId) ||
      (role === 'PATIENT' && appointment.PatientUserId === userId)
    ) {
      await this.prisma.appointments.delete({ where: { Id: id } });
      return { message: 'Appointment deleted successfully' };
    } else {
      throw new Error('Unauthorized');
    }
  }

  async getDoctorAppointmentsByDate(userId: bigint, startDate?: string, endDate?: string) {
    const where: any = {
      DoctorUserId: userId,
    };

    // Si se proporciona startDate, filtrar desde esa fecha (inicio del día)
    if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      where.ScheduledAt = { ...where.ScheduledAt, gte: start };
    }

    // Si se proporciona endDate, filtrar hasta esa fecha (fin del día)
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      where.ScheduledAt = { ...where.ScheduledAt, lte: end };
    }

    const appointments = await this.prisma.appointments.findMany({
      where,
      orderBy: [{ ScheduledAt: 'asc' }],
      include: {
        AppointmentStatuses: {
          select: {
            Id: true,
            Code: true,
            Name: true,
            Color: true,
          },
        },
        Users_Appointments_PatientUserIdToUsers: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfiles: {
          select: {
            UserId: true,
            Bio: true,
            Users: {
              select: {
                Id: true,
                FirstName: true,
                LastName1: true,
                LastName2: true,
                Email: true,
              },
            },
          },
        },
        AvailabilitySlots: {
          select: {
            Id: true,
            StartAt: true,
            EndAt: true,
          },
        },
      },
    });

    // Formatea la respuesta
    return appointments.map(appt => ({
      id: appt.Id.toString(),
      scheduledAt: appt.ScheduledAt,
      durationMin: appt.DurationMin,
      status: appt.AppointmentStatuses?.Code || 'UNKNOWN',
      modality: appt.Modality,
      doctor: appt.DoctorProfiles?.Users ? {
        id: appt.DoctorProfiles.Users.Id.toString(),
        name: `${appt.DoctorProfiles.Users.FirstName || ''} ${appt.DoctorProfiles.Users.LastName1 || ''}`.trim(),
        specialty: 'General',
        email: appt.DoctorProfiles.Users.Email,
      } : null,
      patient: appt.Users_Appointments_PatientUserIdToUsers ? {
        id: appt.Users_Appointments_PatientUserIdToUsers.Id.toString(),
        name: `${appt.Users_Appointments_PatientUserIdToUsers.FirstName || ''} ${appt.Users_Appointments_PatientUserIdToUsers.LastName1 || ''}`.trim(),
        email: appt.Users_Appointments_PatientUserIdToUsers.Email,
      } : null,
      slot: appt.AvailabilitySlots ? {
        id: appt.AvailabilitySlots.Id.toString(),
        startAt: appt.AvailabilitySlots.StartAt,
        endAt: appt.AvailabilitySlots.EndAt,
      } : null,
    }));
  }
}
