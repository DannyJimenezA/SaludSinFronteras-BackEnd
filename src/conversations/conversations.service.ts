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

  /**
   * Obtiene o crea una conversación única entre un paciente y un doctor.
   * Solo permite crear la conversación si existe al menos una cita entre ellos.
   */
  async ensureWithDoctor(patientUserId: bigint, doctorUserId: bigint) {
    // Verificar que existe al menos una cita entre el paciente y el doctor
    const appointment = await this.prisma.appointments.findFirst({
      where: {
        PatientUserId: patientUserId,
        DoctorUserId: doctorUserId,
      },
    });

    if (!appointment) {
      throw new ForbiddenException('No tienes citas con este doctor');
    }

    // Buscar una conversación existente entre el paciente y el doctor (sin AppointmentId)
    // Buscar todas las conversaciones sin AppointmentId y filtrar manualmente
    const allUniqueConversations = await this.prisma.conversations.findMany({
      where: {
        AppointmentId: null,
      },
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

    // Buscar la conversación que tiene exactamente estos dos participantes
    const existingConversation = allUniqueConversations.find(conv => {
      if (conv.ConversationParticipants.length !== 2) return false;
      const participantIds = conv.ConversationParticipants.map(p => p.UserId);
      return participantIds.includes(patientUserId) && participantIds.includes(doctorUserId);
    });

    if (existingConversation) {
      return this.formatConversation(existingConversation, patientUserId);
    }

    // Si no existe, crear una nueva conversación única
    const newConversation = await this.prisma.conversations.create({
      data: {
        AppointmentId: null, // No vinculada a una cita específica
        CreatedBy: patientUserId,
      },
      include: {
        ConversationParticipants: true,
      },
    });

    // Agregar participantes
    await this.prisma.conversationParticipants.createMany({
      data: [
        { ConversationId: newConversation.Id, UserId: patientUserId },
        { ConversationId: newConversation.Id, UserId: doctorUserId },
      ],
      skipDuplicates: true,
    });

    // Recargar la conversación con participantes
    const conversationWithParticipants = await this.prisma.conversations.findUnique({
      where: { Id: newConversation.Id },
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

    return this.formatConversation(conversationWithParticipants, patientUserId);
  }

  /**
   * Obtiene o crea una conversación única entre un doctor y un paciente.
   * Similar a ensureWithDoctor pero desde la perspectiva del doctor.
   * Solo permite crear la conversación si existe al menos una cita entre ellos.
   */
  async ensureWithPatient(doctorUserId: bigint, patientUserId: bigint) {
    // Verificar que existe al menos una cita entre el doctor y el paciente
    const appointment = await this.prisma.appointments.findFirst({
      where: {
        DoctorUserId: doctorUserId,
        PatientUserId: patientUserId,
      },
    });

    if (!appointment) {
      throw new ForbiddenException('No tienes citas con este paciente');
    }

    // Buscar una conversación existente entre el doctor y el paciente (sin AppointmentId)
    // Buscar todas las conversaciones sin AppointmentId y filtrar manualmente
    const allUniqueConversations = await this.prisma.conversations.findMany({
      where: {
        AppointmentId: null,
      },
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

    // Buscar la conversación que tiene exactamente estos dos participantes
    const existingConversation = allUniqueConversations.find(conv => {
      if (conv.ConversationParticipants.length !== 2) return false;
      const participantIds = conv.ConversationParticipants.map(p => p.UserId);
      return participantIds.includes(doctorUserId) && participantIds.includes(patientUserId);
    });

    if (existingConversation) {
      return this.formatConversation(existingConversation, doctorUserId);
    }

    // Si no existe, crear una nueva conversación única
    const newConversation = await this.prisma.conversations.create({
      data: {
        AppointmentId: null, // No vinculada a una cita específica
        CreatedBy: doctorUserId,
      },
      include: {
        ConversationParticipants: true,
      },
    });

    // Agregar participantes
    await this.prisma.conversationParticipants.createMany({
      data: [
        { ConversationId: newConversation.Id, UserId: doctorUserId },
        { ConversationId: newConversation.Id, UserId: patientUserId },
      ],
      skipDuplicates: true,
    });

    // Recargar la conversación con participantes
    const conversationWithParticipants = await this.prisma.conversations.findUnique({
      where: { Id: newConversation.Id },
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

    return this.formatConversation(conversationWithParticipants, doctorUserId);
  }

  /**
   * Formatea una conversación al formato esperado por el frontend
   */
  private formatConversation(conv: any, currentUserId: bigint) {
    const otherParticipants = conv.ConversationParticipants.filter(
      (p) => p.UserId !== currentUserId,
    ).map((p) => ({
      userId: p.Users.Id.toString(),
      name: `${p.Users.FirstName} ${p.Users.LastName1 || ''} ${p.Users.LastName2 || ''}`.trim(),
      email: p.Users.Email,
    }));

    const lastMessage = conv.Messages && conv.Messages[0]
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
  }
}
