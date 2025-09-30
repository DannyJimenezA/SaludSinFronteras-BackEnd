import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toUtcDate(s: string) {
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new BadRequestException('Invalid date format (use ISO 8601 UTC)');
  return d;
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async createSlot(doctorUserId: bigint, dto: { StartAt: string; EndAt: string; RRule?: string; IsRecurring?: string }) {
    // verificar doctor dueño
    const user = await this.prisma.users.findUnique({ where: { Id: doctorUserId } });
    if (!user || user.Role !== 'DOCTOR') throw new ForbiddenException('Only doctors can create availability');

    const start = toUtcDate(dto.StartAt);
    const end   = toUtcDate(dto.EndAt);
    if (!(start < end)) throw new BadRequestException('StartAt must be before EndAt');

    // anti-solapamiento (existe slot que cumple: existing.StartAt < end && existing.EndAt > start)
    const overlap = await this.prisma.availabilitySlots.findFirst({
      where: {
        DoctorUserId: doctorUserId,
        StartAt: { lt: end },
        EndAt:   { gt: start },
      },
      select: { Id: true },
    });
    if (overlap) throw new BadRequestException('Overlapping slot exists');

    return this.prisma.availabilitySlots.create({
      data: {
        DoctorUserId: doctorUserId,
        StartAt: start,
        EndAt: end,
        IsRecurring: false as any,
        RRule: dto.RRule ?? null,
      },
    });
  }

  async listForDoctor(doctorUserId: bigint, from?: string, to?: string) {
    const where: any = { DoctorUserId: doctorUserId };
    if (from) where.StartAt = { gte: toUtcDate(from) };
    if (to)   where.EndAt   = { lte: toUtcDate(to) };
    return this.prisma.availabilitySlots.findMany({
      where,
      orderBy: [{ StartAt: 'asc' }],
    });
  }

  async deleteSlot(doctorUserId: bigint, slotId: bigint) {
    const slot = await this.prisma.availabilitySlots.findUnique({ where: { Id: slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.DoctorUserId !== doctorUserId) throw new ForbiddenException('Cannot delete slot of another doctor');

    // blocking: si ya hay cita en este slot, no borrar (solo ejemplo simple)
    const appt = await this.prisma.appointments.findFirst({
      where: { SlotId: slotId, Status: { notIn: ['CANCELLED', 'NO_SHOW' ] as any } },
      select: { Id: true },
    });
    if (appt) throw new BadRequestException('Slot has appointments');

    await this.prisma.availabilitySlots.delete({ where: { Id: slotId } });
    return { ok: true };
  }
}
