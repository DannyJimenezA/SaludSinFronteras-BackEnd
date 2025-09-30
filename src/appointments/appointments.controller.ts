import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private svc: AppointmentsService) {}

  // Paciente crea cita
  @Roles('PATIENT')
  @Post()
  create(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    return this.svc.createForPatient(BigInt(req.user.sub), dto);
  }

  // Listado filtrado
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get()
  list(@Query('doctorId') doctorId?: string, @Query('patientId') patientId?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.list({ doctorId, patientId, status, from, to });
  }

  // Detalle
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.svc.getOne(BigInt(id), BigInt(req.user.sub), req.user.role);
  }

  // Cambiar estado
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Patch(':id/status')
  status(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateAppointmentStatusDto) {
    return this.svc.updateStatus(BigInt(id), BigInt(req.user.sub), req.user.role, dto);
  }

    @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.svc.deleteAppointment(BigInt(id), BigInt(req.user.sub), req.user.role);
  }
}
