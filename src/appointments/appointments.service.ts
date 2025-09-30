import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service'; 

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService, private jobs: JobsService) {}

  async createForPatient(patientUserId: bigint, dto: { DoctorUserId: number; SlotId: number; Modality?: any }) {
    const doctorId = BigInt(dto.DoctorUserId);
    const slotId   = BigInt(dto.SlotId);

    // valida doctor y slot
    const slot = await this.prisma.availabilitySlots.findUnique({ where: { Id: slotId } });
    if (!slot || slot.DoctorUserId !== doctorId) throw new BadRequestException('Slot/Doctor mismatch');

    // el slot no debe tener cita activa
    const exists = await this.prisma.appointments.findFirst({
      where: {
        SlotId: slotId,
        Status: { notIn: ['CANCELLED','NO_SHOW'] as any },
      },
      select: { Id: true },
    });
    if (exists) throw new BadRequestException('Slot already booked');

    // el paciente no debe tener otra cita en el mismo horario (colisión)
    const collision = await this.prisma.appointments.findFirst({
      where: {
        PatientUserId: patientUserId,
        Status: { notIn: ['CANCELLED','NO_SHOW'] as any },
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
        Status: 'PENDING' as any,
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

  async list(param: { doctorId?: string; patientId?: string; status?: string; from?: string; to?: string }) {
    const where: any = {};
    if (param.doctorId)  where.DoctorUserId  = BigInt(param.doctorId);
    if (param.patientId) where.PatientUserId = BigInt(param.patientId);
    if (param.status)    where.Status        = param.status as any;
    if (param.from) (where.ScheduledAt ??= {}).gte = new Date(param.from);
    if (param.to)   (where.ScheduledAt ??= {}).lte = new Date(param.to);

    return this.prisma.appointments.findMany({
      where,
      orderBy: [{ ScheduledAt: 'desc' }],
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
        Status: data.Status,
        CancelReason: data.CancelReason ?? null,
        CancelledByUserId: data.Status === 'CANCELLED' ? actorId : null,
      },
    });
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
}
