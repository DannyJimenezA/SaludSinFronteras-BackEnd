import { Body, Controller, Delete, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { FilesService } from 'src/files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('conversations/:id/messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MessagesController {
  constructor(private svc: MessagesService,  private files: FilesService) {}

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get()
  list(@Param('id') id: string, @Req() req: any) {
    return this.svc.list(BigInt(id), BigInt(req.user.sub));
  }

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Post()
  send(@Param('id') id: string, @Req() req: any, @Body() dto: SendMessageDto) {
    return this.svc.send(BigInt(id), BigInt(req.user.sub), dto);
  }

  @Roles('ADMIN','DOCTOR','PATIENT')
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@Param('id') conversationId: string, @Req() req: any, @UploadedFile() file: Express.Multer.File) {
  // 1) guardar archivo
  const f = await this.files.save(BigInt(req.user.sub), file);
  // 2) crear message tipo 'file'
  return this.svc.send(BigInt(conversationId), BigInt(req.user.sub), {
    Content: f.StorageUrl, // o nombre mostrado
    Language: null,
  });
}

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Delete(':messageId')
  remove(@Param('id') id: string, @Param('messageId') mid: string, @Req() req: any) {
    return this.svc.deleteMessage(BigInt(id), BigInt(mid), BigInt(req.user.sub));
  }
}
