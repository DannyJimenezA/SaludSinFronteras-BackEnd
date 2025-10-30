import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-status.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';

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

  // Obtener próximas citas del usuario autenticado (paciente o doctor)
  // IMPORTANTE: Esta ruta debe estar ANTES de @Get(':id') para evitar que "upcoming" sea interpretado como un ID
  @Roles('DOCTOR','PATIENT')
  @Get('upcoming')
  getUpcoming(@Req() req: any, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.svc.getUpcoming(BigInt(req.user.sub), req.user.role, limitNum);
  }

  // Obtener citas pasadas del usuario autenticado (paciente o doctor)
  @Roles('DOCTOR','PATIENT')
  @Get('past')
  getPast(@Req() req: any, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.svc.getPast(BigInt(req.user.sub), req.user.role, limitNum);
  }

  // Obtener citas canceladas del usuario autenticado (paciente o doctor)
  @Roles('DOCTOR','PATIENT')
  @Get('cancelled')
  getCancelled(@Req() req: any, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.svc.getCancelled(BigInt(req.user.sub), req.user.role, limitNum);
  }

  // Obtener todas las citas del usuario autenticado con paginación y ordenamiento
  @Roles('DOCTOR','PATIENT')
  @Get('all')
  getAll(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('order') order?: 'asc' | 'desc'
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const orderBy = order || 'desc';
    return this.svc.getAll(BigInt(req.user.sub), req.user.role, pageNum, limitNum, orderBy);
  }

  // Listado filtrado
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get()
  list(@Query('doctorId') doctorId?: string, @Query('patientId') patientId?: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.list({ doctorId, patientId, status, from, to });
  }

  // Detalle - debe estar DESPUÉS de rutas específicas como 'upcoming'
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

  // Cancelar cita
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any, @Body() dto: CancelAppointmentDto) {
    return this.svc.cancelAppointment(
      BigInt(id),
      BigInt(req.user.sub),
      req.user.role,
      dto.CancelReason,
    );
  }

  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.svc.deleteAppointment(BigInt(id), BigInt(req.user.sub), req.user.role);
  }
}
