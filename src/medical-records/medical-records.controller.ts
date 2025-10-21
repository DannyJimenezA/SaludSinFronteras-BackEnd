import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditLog } from '../common/decorators/audit-log.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

/**
 * Controlador de Historiales Médicos
 *
 * Todos los endpoints están protegidos con:
 * - JwtAuthGuard: Requiere autenticación
 * - RolesGuard: Valida roles específicos
 * - @AuditLog: Registra accesos en DataAccessLogs (cumplimiento HIPAA/GDPR)
 *
 * Los campos sensibles (Diagnosis, Prescriptions, Recommendations) son
 * automáticamente cifrados/descifrados por el servicio.
 */
@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}

  /**
   * Crear un nuevo historial médico
   *
   * Solo doctores pueden crear historiales.
   * Los campos sensibles son automáticamente cifrados con AES-256.
   *
   * @param user - Usuario del JWT (doctor)
   * @param dto - Datos del historial
   * @returns Historial creado con campos descifrados
   *
   * @example
   * POST /medical-records
   * Body:
   * {
   *   "PatientUserId": 1,
   *   "AppointmentId": 5,
   *   "Diagnosis": "Hipertensión arterial estadio 1",
   *   "Prescriptions": "Losartán 50mg cada 12 horas",
   *   "Recommendations": "Dieta baja en sodio, ejercicio diario",
   *   "Files": ["/uploads/medical-records/study-123.pdf"]
   * }
   */
  @Post()
  @Roles('DOCTOR')
  @AuditLog('MedicalRecord')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.service.create(BigInt(user.sub), dto);
  }

  /**
   * Obtener historiales médicos de un paciente
   *
   * Permisos:
   * - ADMIN: Puede ver cualquier historial
   * - DOCTOR: Puede ver todos los historiales
   * - PATIENT: Solo puede ver sus propios historiales
   *
   * Los datos son automáticamente descifrados antes de retornarse.
   * Cada acceso se registra en DataAccessLogs para auditoría.
   *
   * @param user - Usuario del JWT
   * @param patientId - ID del paciente
   * @returns Array de historiales descifrados
   *
   * @example
   * GET /medical-records/patient/1
   */
  @Get('patient/:patientId')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @AuditLog('MedicalRecord')
  async getByPatient(
    @CurrentUser() user: JwtUser,
    @Param('patientId') patientId: string,
  ) {
    return this.service.findByPatient(
      BigInt(patientId),
      BigInt(user.sub),
      user.role,
    );
  }

  /**
   * Obtener un historial médico por ID
   *
   * Permisos:
   * - ADMIN: Puede ver cualquier historial
   * - DOCTOR: Puede ver el historial si fue el autor
   * - PATIENT: Puede ver el historial si es el paciente
   *
   * @param user - Usuario del JWT
   * @param id - ID del historial
   * @returns Historial descifrado
   *
   * @example
   * GET /medical-records/1
   */
  @Get(':id')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  @AuditLog('MedicalRecord')
  async getOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.service.findOne(BigInt(id), BigInt(user.sub), user.role);
  }

  /**
   * Actualizar un historial médico
   *
   * Solo el doctor autor puede actualizar el historial.
   * Los campos actualizados son re-cifrados con un nuevo IV.
   *
   * @param user - Usuario del JWT (doctor)
   * @param id - ID del historial
   * @param dto - Datos a actualizar
   * @returns Historial actualizado descifrado
   *
   * @example
   * PATCH /medical-records/1
   * Body:
   * {
   *   "Diagnosis": "Hipertensión arterial estadio 2",
   *   "Prescriptions": "Losartán 100mg cada 12 horas"
   * }
   */
  @Patch(':id')
  @Roles('DOCTOR')
  @AuditLog('MedicalRecord')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return this.service.update(BigInt(id), BigInt(user.sub), dto);
  }

  /**
   * Eliminar un historial médico
   *
   * Permisos:
   * - ADMIN: Puede eliminar cualquier historial
   * - DOCTOR: Solo puede eliminar sus propios historiales
   *
   * IMPORTANTE: Esta acción es irreversible y se registra en auditoría.
   *
   * @param user - Usuario del JWT
   * @param id - ID del historial
   * @returns Confirmación de eliminación
   *
   * @example
   * DELETE /medical-records/1
   */
  @Delete(':id')
  @Roles('ADMIN', 'DOCTOR')
  @AuditLog('MedicalRecord')
  @HttpCode(HttpStatus.OK)
  async delete(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    await this.service.delete(BigInt(id), BigInt(user.sub), user.role);
    return {
      message: 'Historial médico eliminado exitosamente',
      id,
    };
  }
}
