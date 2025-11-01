import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesGateway } from './messages.gateway';
import { TranslationService } from '../common/services/translation.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private ws: MessagesGateway,
    private translationService: TranslationService,
  ) {}
  

  async list(conversationId: bigint, userId: bigint) {
    // auth
    const cp = await this.prisma.conversationParticipants.findUnique({
      where: { ConversationId_UserId: { ConversationId: conversationId, UserId: userId } as any },
    }).catch(() => null);
    if (!cp) throw new ForbiddenException('Forbidden');

    // Obtener idioma nativo del usuario que está consultando
    const user = await this.prisma.users.findUnique({
      where: { Id: userId },
      include: {
        NativeLanguages: {
          select: { Code: true },
        },
      },
    });

    const userLanguageCode = user?.NativeLanguages?.Code || 'en';

    // Obtener mensajes con traducciones y datos del remitente
    const messages = await this.prisma.messages.findMany({
      where: { ConversationId: conversationId },
      orderBy: { CreatedAt: 'asc' },
      include: {
        MessageTranslations: {
          where: {
            Language: this.translationService.normalizeLanguageCode(userLanguageCode),
          },
        },
        Users: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
          },
        },
      },
    });

    // Formatear respuesta con mensaje original + traducción
    return messages.map((msg) => ({
      id: msg.Id.toString(),
      conversationId: msg.ConversationId.toString(),
      senderUserId: msg.SenderUserId.toString(),
      senderName: `${msg.Users.FirstName} ${msg.Users.LastName1 || ''} ${msg.Users.LastName2 || ''}`.trim(),
      type: msg.Type,
      content: msg.Content,
      language: msg.Language || undefined,
      createdAt: msg.CreatedAt.toISOString(),
      fileId: msg.FileId?.toString(),
      replyToMessageId: msg.ReplyToMessageId?.toString(),
      // Incluir traducción si existe
      translation: msg.MessageTranslations[0]?.Content || null,
      translationLanguage: msg.MessageTranslations[0]?.Language || null,
    }));
  }

  async send(conversationId: bigint, userId: bigint, dto: { Content: string; Language?: string }) {
    // auth
    const cp = await this.prisma.conversationParticipants.findUnique({
      where: { ConversationId_UserId: { ConversationId: conversationId, UserId: userId } as any },
    }).catch(() => null);
    if (!cp) throw new ForbiddenException('Forbidden');

    // Obtener el idioma del remitente
    const sender = await this.prisma.users.findUnique({
      where: { Id: userId },
      include: {
        NativeLanguages: {
          select: { Code: true },
        },
      },
    });

    const sourceLanguage = dto.Language || sender?.NativeLanguages?.Code || 'en';
    const normalizedSourceLang = this.translationService.normalizeLanguageCode(sourceLanguage);

    // Crear el mensaje original
    const msg = await this.prisma.messages.create({
      data: {
        ConversationId: conversationId,
        SenderUserId: userId,
        Type: 'text',
        Content: dto.Content,
        Language: normalizedSourceLang,
      },
    });

    // Obtener idiomas de todos los participantes de la conversación
    const participants = await this.prisma.conversationParticipants.findMany({
      where: { ConversationId: conversationId },
      include: {
        Users: {
          include: {
            NativeLanguages: {
              select: { Code: true },
            },
          },
        },
      },
    });

    const targetLanguages = participants
      .map((p) => p.Users.NativeLanguages?.Code)
      .filter((code): code is string => !!code)
      .map((code) => this.translationService.normalizeLanguageCode(code));

    // Traducir a los idiomas de los participantes
    const translations = await this.translationService.translateToMultiple(
      dto.Content,
      normalizedSourceLang,
      targetLanguages,
    );

    // Guardar traducciones en la base de datos
    const translationPromises: Promise<any>[] = [];
    const engineName = process.env.TRANSLATION_PROVIDER || 'MyMemory';

    translations.forEach((translatedText, targetLang) => {
      translationPromises.push(
        this.prisma.messageTranslations.create({
          data: {
            MessageId: msg.Id,
            Language: targetLang,
            Content: translatedText,
            Engine: engineName,
            IsAuto: true,
            GlossaryApplied: false,
          },
        }),
      );
    });

    await Promise.all(translationPromises);

    // Obtener el mensaje con todas sus traducciones para enviarlo por WS
    const msgWithTranslations = await this.prisma.messages.findUnique({
      where: { Id: msg.Id },
      include: {
        MessageTranslations: true,
      },
    });

    // Emitir mensaje por WebSocket con traducciones
    this.ws.emitMessage(conversationId.toString(), {
      Id: msg.Id.toString(),
      ConversationId: msg.ConversationId.toString(),
      SenderUserId: msg.SenderUserId.toString(),
      Type: msg.Type,
      Content: msg.Content,
      Language: msg.Language,
      CreatedAt: msg.CreatedAt,
      FileId: msg.FileId?.toString(),
      ReplyToMessageId: msg.ReplyToMessageId?.toString(),
      // Incluir todas las traducciones disponibles
      Translations: msgWithTranslations?.MessageTranslations.map((t) => ({
        Language: t.Language,
        Content: t.Content,
        Engine: t.Engine,
      })) || [],
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
