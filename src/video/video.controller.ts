import { Controller, Get, Param, Post, Delete, Req, UseGuards } from '@nestjs/common';
import { VideoService } from './video.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('appointments/:id/video')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VideoController {
  constructor(private video: VideoService) {}

  // Crea/asegura sala y guarda SfuRoomId
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Post()
  ensure(@Param('id') id: string, @Req() req: any) {
    return this.video.ensureRoom(BigInt(id), BigInt(req.user.sub), req.user.role);
  }

  // Obtiene token de ingreso
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get('token')
  token(@Param('id') id: string, @Req() req: any) {
    return this.video.getJoinToken(BigInt(id), {
      id: BigInt(req.user.sub),
      role: req.user.role,
      name: req.user.email,
    });
  }

  // (Opcional) Terminar sala
  @Roles('ADMIN','DOCTOR')
  @Delete()
  end(@Param('id') id: string, @Req() req: any) {
    return this.video.endRoom(BigInt(id), BigInt(req.user.sub), req.user.role);
  }
}
