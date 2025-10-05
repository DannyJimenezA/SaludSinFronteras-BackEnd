import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TranslationService {
  constructor(private prisma: PrismaService) {}

  // Reemplaza este mock por un proveedor real (p.ej. DeepL, OpenAI, Google)
  private async translateText(text: string, targetLang: string) {
    // mock: agrega prefijo (para probar flujo)
    return `[${targetLang}] ${text}`;
  }

  async translateMessage(messageId: bigint, targetLanguage: string) {
    const msg = await this.prisma.messages.findUnique({ where: { Id: messageId } });
    if (!msg || !msg.Content) throw new NotFoundException('Message not found or empty');

    const content = await this.translateText(msg.Content, targetLanguage);
    return this.prisma.messageTranslations.upsert({
      where: { MessageId_Language: { MessageId: messageId, Language: targetLanguage } as any },
      update: { Content: content, Engine: 'mock', Confidence: 1.0 },
      create: { MessageId: messageId, Language: targetLanguage, Content: content, Engine: 'mock', Confidence: 1.0 },
    });
  }

  async getTranslations(messageId: bigint) {
    return this.prisma.messageTranslations.findMany({ where: { MessageId: messageId } });
  }
}
