import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentNotesService {
  constructor(private prisma: PrismaService) {}

  async add(doctorUserId: bigint, appointmentId: bigint, dto: { Content: string }) {
    const appt = await this.prisma.appointments.findUnique({ where: { Id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.DoctorUserId !== doctorUserId) throw new ForbiddenException('Only assigned doctor can add notes');

    return this.prisma.appointmentNotes.create({
      data: {
        AppointmentId: appointmentId,
        DoctorUserId: doctorUserId,
        Content: dto.Content,
      },
    });
  }

  async list(actorId: bigint, role: 'ADMIN'|'DOCTOR'|'PATIENT', appointmentId: bigint) {
    const appt = await this.prisma.appointments.findUnique({ where: { Id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (role !== 'ADMIN' && appt.PatientUserId !== actorId && appt.DoctorUserId !== actorId)
      throw new ForbiddenException('Forbidden');

    return this.prisma.appointmentNotes.findMany({
      where: { AppointmentId: appointmentId },
      orderBy: [{ CreatedAt: 'asc' }],
    });
  }

  // 👇 NUEVO: eliminar nota
  async remove(actorId: bigint, role: 'ADMIN'|'DOCTOR'|'PATIENT', appointmentId: bigint, noteId: bigint) {
    // 1) existe la nota
    const note = await this.prisma.appointmentNotes.findUnique({ where: { Id: noteId } });
    if (!note) throw new NotFoundException('Note not found');

    // 2) pertenece a la cita indicada
    if (note.AppointmentId !== appointmentId) {
      throw new NotFoundException('Note not found in this appointment');
    }

    // 3) permisos: ADMIN o autor de la nota
    if (role !== 'ADMIN' && note.DoctorUserId !== actorId) {
      throw new ForbiddenException('Only the author doctor or admin can delete this note');
    }

    await this.prisma.appointmentNotes.delete({ where: { Id: noteId } });
    return { ok: true };
  }
}
