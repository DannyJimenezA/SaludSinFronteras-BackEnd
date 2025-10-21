import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { FilesModule } from '../files/files.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TranslationService } from '../common/services/translation.service';

@Module({
  imports: [FilesModule, PrismaModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, TranslationService],
  exports: [MessagesGateway],
})
export class MessagesModule {}
