import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AppointmentNotesService } from './appointment-notes.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('appointments/:id/notes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentNotesController {
  constructor(private svc: AppointmentNotesService) {}

  @Roles('DOCTOR')
  @Post()
  add(@Param('id') id: string, @Req() req: any, @Body() dto: CreateNoteDto) {
    return this.svc.add(BigInt(req.user.sub), BigInt(id), dto);
  }

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get()
  list(@Param('id') id: string, @Req() req: any) {
    return this.svc.list(BigInt(req.user.sub), req.user.role, BigInt(id));
  }

  // 👇 NUEVO: eliminar una nota concreta
  @Roles('ADMIN','DOCTOR')
  @Delete(':noteId')
  remove(@Param('id') id: string, @Param('noteId') noteId: string, @Req() req: any) {
    return this.svc.remove(BigInt(req.user.sub), req.user.role, BigInt(id), BigInt(noteId));
  }
}
