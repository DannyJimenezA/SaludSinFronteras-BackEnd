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
    const conversations = await this.prisma.conversations.findMany({
      where: { ConversationParticipants: { some: { UserId: userId } } },
      orderBy: { CreatedAt: 'desc' },
      include: {
        ConversationParticipants: {
          include: {
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
        Messages: {
          orderBy: { CreatedAt: 'desc' },
          take: 1,
          include: {
            Users: {
              select: {
                FirstName: true,
                LastName1: true,
                LastName2: true,
              },
            },
          },
        },
      },
    });

    // Formatear la respuesta
    return conversations.map((conv) => {
      const otherParticipants = conv.ConversationParticipants.filter(
        (p) => p.UserId !== userId,
      ).map((p) => ({
        userId: p.UserId.toString(),
        name: `${p.Users.FirstName} ${p.Users.LastName1 || ''} ${p.Users.LastName2 || ''}`.trim(),
        email: p.Users.Email,
      }));

      const lastMessage = conv.Messages[0]
        ? {
            content: conv.Messages[0].Content,
            createdAt: conv.Messages[0].CreatedAt.toISOString(),
            senderName: `${conv.Messages[0].Users.FirstName} ${conv.Messages[0].Users.LastName1 || ''} ${conv.Messages[0].Users.LastName2 || ''}`.trim(),
          }
        : undefined;

      return {
        id: conv.Id.toString(),
        appointmentId: conv.AppointmentId?.toString(),
        createdBy: conv.CreatedBy?.toString(),
        createdAt: conv.CreatedAt.toISOString(),
        participants: otherParticipants,
        lastMessage,
      };
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
