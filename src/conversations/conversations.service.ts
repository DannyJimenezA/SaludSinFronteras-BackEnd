import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async ensureForAppointment(appointmentId: bigint, creatorId: bigint) {
    // trae cita y determina participantes
    const appt = await this.prisma.appointments.findUnique({ where: { Id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (![appt.PatientUserId, appt.DoctorUserId].includes(creatorId))
      throw new ForbiddenException('Forbidden');

    let conv = await this.prisma.conversations.findFirst({
      where: { AppointmentId: appointmentId },
    });
    if (!conv) {
      conv = await this.prisma.conversations.create({
        data: { AppointmentId: appointmentId, CreatedBy: creatorId },
      });
      await this.prisma.conversationParticipants.createMany({
        data: [
          { ConversationId: conv.Id, UserId: appt.PatientUserId },
          { ConversationId: conv.Id, UserId: appt.DoctorUserId },
        ],
        skipDuplicates: true,
      });
    }
    return conv;
  }

  async listMine(userId: bigint) {
    return this.prisma.conversations.findMany({
      where: { ConversationParticipants: { some: { UserId: userId } } },
      orderBy: { CreatedAt: 'desc' },
    });
  }

  async getOne(userId: bigint, id: bigint) {
    const c = await this.prisma.conversations.findUnique({ where: { Id: id } });
    if (!c) throw new NotFoundException('Conversation not found');
    const member = await this.prisma.conversationParticipants.findUnique({
      where: { ConversationId_UserId: { ConversationId: id, UserId: userId } as any },
    }).catch(() => null);
    if (!member) throw new ForbiddenException('Forbidden');
    return c;
  }
}
