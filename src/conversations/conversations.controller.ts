import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private svc: ConversationsService) {}

  // crea/asegura la conversación de una cita
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Post('from-appointment/:appointmentId')
  ensure(@Param('appointmentId') apptId: string, @Req() req: any) {
    return this.svc.ensureForAppointment(BigInt(apptId), BigInt(req.user.sub));
  }

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get('mine')
  mine(@Req() req: any) {
    return this.svc.listMine(BigInt(req.user.sub));
  }

  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.getOne(BigInt(req.user.sub), BigInt(id));
  }

  // Obtiene o crea una conversación única con un doctor específico
  @Roles('PATIENT')
  @Post('with-doctor/:doctorId')
  ensureWithDoctor(@Param('doctorId') doctorId: string, @Req() req: any) {
    const patientUserId = BigInt(req.user.sub);
    const doctorUserId = BigInt(doctorId);
    return this.svc.ensureWithDoctor(patientUserId, doctorUserId);
  }

  // Obtiene o crea una conversación única con un paciente específico
  @Roles('DOCTOR')
  @Post('with-patient/:patientId')
  ensureWithPatient(@Param('patientId') patientId: string, @Req() req: any) {
    const doctorUserId = BigInt(req.user.sub);
    const patientUserId = BigInt(patientId);
    return this.svc.ensureWithPatient(doctorUserId, patientUserId);
  }
}
