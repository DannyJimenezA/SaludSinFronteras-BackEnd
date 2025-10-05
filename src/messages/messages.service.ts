import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesGateway } from './messages.gateway';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService, private ws: MessagesGateway) {}
  

  async list(conversationId: bigint, userId: bigint) {
    // auth
    const cp = await this.prisma.conversationParticipants.findUnique({
      where: { ConversationId_UserId: { ConversationId: conversationId, UserId: userId } as any },
    }).catch(() => null);
    if (!cp) throw new ForbiddenException('Forbidden');

    return this.prisma.messages.findMany({
      where: { ConversationId: conversationId },
      orderBy: { CreatedAt: 'asc' },
    });
  }

  async send(conversationId: bigint, userId: bigint, dto: { Content: string; Language?: string }) {
    // auth
    const cp = await this.prisma.conversationParticipants.findUnique({
      where: { ConversationId_UserId: { ConversationId: conversationId, UserId: userId } as any },
    }).catch(() => null);
    if (!cp) throw new ForbiddenException('Forbidden');

    const msg = await this.prisma.messages.create({
      data: {
        ConversationId: conversationId,
        SenderUserId: userId,
        Type: 'text',
        Content: dto.Content,
        Language: dto.Language ?? null,
      },
    });

    // emite por WS
    this.ws.emitMessage(conversationId.toString(), {
      ...msg,
      Id: msg.Id.toString(),
      SenderUserId: msg.SenderUserId.toString(),
      ConversationId: msg.ConversationId.toString(),
    });

    return msg;
  }

  async deleteMessage(conversationId: bigint, messageId: bigint, actorId: bigint) {
    const msg = await this.prisma.messages.findUnique({ where: { Id: messageId } });
    if (!msg || msg.ConversationId !== conversationId) throw new NotFoundException('Message not found');
    if (msg.SenderUserId !== actorId) throw new ForbiddenException('Only author can delete');

    await this.prisma.messages.delete({ where: { Id: messageId } });
    // broadcast delete event
    this.ws.emitDelete(conversationId.toString(), messageId.toString());
    return { ok: true };
  }
}
