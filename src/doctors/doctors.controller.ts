import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';
import { AssignSpecialtiesDto } from './dto/assign-specialties.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private doctors: DoctorsService) {}

  // Endpoint público para obtener doctores aprobados (para pacientes que quieren agendar)
  @Get('approved')
  getApprovedDoctors(
    @Query('specialtyId') specialtyId?: string,
    @Query('search') search?: string,
  ) {
    return this.doctors.getApprovedDoctors(
      specialtyId ? BigInt(specialtyId) : undefined,
      search,
    );
  }

  // Endpoint público para obtener slots disponibles de un doctor específico
  @Get(':doctorId/available-slots')
  getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.doctors.getAvailableSlots(
      BigInt(doctorId),
      startDate,
      endDate,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Get('me/profile')
  me(@Req() req: any) {
    return this.doctors.getProfile(BigInt(req.user.sub));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Patch('me/profile')
  upsert(@Req() req: any, @Body() dto: UpsertDoctorDto) {
    return this.doctors.upsertProfile(BigInt(req.user.sub), dto);
  }

  // Endpoint para que el doctor asigne/actualice sus especialidades
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @Post('me/specialties')
  assignMySpecialties(@Req() req: any, @Body() dto: AssignSpecialtiesDto) {
    return this.doctors.assignSpecialties(BigInt(req.user.sub), dto);
  }

  // Endpoint para que el admin asigne especialidades a un doctor específico
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':doctorId/specialties')
  assignSpecialties(
    @Param('doctorId') doctorId: string,
    @Body() dto: AssignSpecialtiesDto,
  ) {
    return this.doctors.assignSpecialties(BigInt(doctorId), dto);
  }

  // Endpoint para obtener perfil de doctor con especialidades
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR', 'ADMIN')
  @Get(':doctorId/profile-with-specialties')
  getProfileWithSpecialties(@Param('doctorId') doctorId: string) {
    return this.doctors.getProfileWithSpecialties(BigInt(doctorId));
  }

  // Endpoint para eliminar una especialidad de un doctor
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':doctorId/specialties/:specialtyId')
  removeSpecialty(
    @Param('doctorId') doctorId: string,
    @Param('specialtyId') specialtyId: string,
  ) {
    return this.doctors.removeSpecialty(BigInt(doctorId), BigInt(specialtyId));
  }
}
