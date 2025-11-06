import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CurrentUser,
  JwtUser,
} from '../common/decorators/current-user.decorator';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { FilesService } from '../files/files.service';

/**
 * VerificationController - Endpoints para verificación de doctores
 *
 * Flujo:
 * 1. DOCTOR sube documentos: POST /verification/submit
 * 2. ADMIN lista pendientes: GET /verification/pending
 * 3. ADMIN revisa: POST /verification/review/:doctorId
 * 4. DOCTOR consulta estado: GET /verification/status
 *
 * Estados:
 * - pending: Esperando revisión
 * - approved: Verificado (badge visible)
 * - rejected: Rechazado (debe reenviar)
 */
@Controller('verification')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Doctor envía documentos de certificación
   *
   * El doctor sube entre 1-10 documentos (licencias, títulos, certificados)
   * para ser verificado por un administrador.
   *
   * @param user - Doctor autenticado
   * @param dto - URLs de documentos y notas opcionales
   * @returns Estado de verificación actualizado
   *
   * @example
   * POST /verification/submit
   * Authorization: Bearer {doctorToken}
   * Body: {
   *   "CertificationDocuments": [
   *     "uploads/licenses/medical-license.pdf",
   *     "uploads/diplomas/medical-degree.pdf"
   *   ],
   *   "Notes": "Licencia médica vigente hasta 2030"
   * }
   */
  /**
   * Doctor sube un documento de verificación
   *
   * Sube un archivo (PDF, JPG, PNG) y retorna la URL para usarla
   * en el endpoint /verification/submit
   *
   * @param user - Doctor autenticado
   * @param file - Archivo a subir
   * @returns URL del archivo subido
   *
   * @example
   * POST /verification/upload-document
   * Authorization: Bearer {doctorToken}
   * Content-Type: multipart/form-data
   * Body: file (FormData)
   *
   * Response: {
   *   "url": "uploads/verification/doc-12345.pdf"
   * }
   */
  @Post('upload-document')
  @Roles('DOCTOR')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const savedFile = await this.filesService.save(BigInt(user.sub), file);
    return {
      url: savedFile.StorageUrl,
      fileId: savedFile.Id.toString(),
    };
  }

  @Post('submit')
  @Roles('DOCTOR')
  @HttpCode(HttpStatus.OK)
  async submitVerification(
    @CurrentUser() user: JwtUser,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.verificationService.submitVerification(BigInt(user.sub), dto);
  }

  /**
   * Doctor consulta su propio estado de verificación
   *
   * Muestra:
   * - Estado actual (pending/approved/rejected)
   * - Documentos enviados
   * - Notas del admin (si las hay)
   * - Razón de rechazo (si fue rechazado)
   *
   * @param user - Doctor autenticado
   * @returns Estado de verificación completo
   *
   * @example
   * GET /verification/status
   * Authorization: Bearer {doctorToken}
   */
  @Get('status')
  @Roles('DOCTOR')
  async getMyVerificationStatus(@CurrentUser() user: JwtUser) {
    return this.verificationService.getVerificationStatus(BigInt(user.sub));
  }

  /**
   * ADMIN lista todos los doctores pendientes de verificación
   *
   * Retorna solo doctores con:
   * - VerificationStatus = "pending"
   * - CertificationDocuments no null
   *
   * Ordenados por antigüedad (los más antiguos primero).
   *
   * @returns Array de doctores pendientes
   *
   * @example
   * GET /verification/pending
   * Authorization: Bearer {adminToken}
   *
   * Response:
   * [
   *   {
   *     "UserId": "5",
   *     "DoctorName": "Dr. Juan Pérez",
   *     "Email": "doctor@example.com",
   *     "LicenseNumber": "MED-12345",
   *     "SubmittedAt": "2025-10-20T10:00:00Z",
   *     "DocumentsCount": 3
   *   }
   * ]
   */
  @Get('pending')
  @Roles('ADMIN')
  async getPendingVerifications() {
    return this.verificationService.getPendingVerifications();
  }

  /**
   * ADMIN lista todos los doctores verificados (aprobados)
   *
   * @returns Array de doctores con estado "approved"
   *
   * @example
   * GET /verification/approved
   * Authorization: Bearer {adminToken}
   */
  @Get('approved')
  @Roles('ADMIN')
  async getVerifiedDoctors() {
    return this.verificationService.getVerifiedDoctors();
  }

  /**
   * ADMIN lista todos los doctores rechazados
   *
   * @returns Array de doctores con estado "rejected"
   *
   * @example
   * GET /verification/rejected
   * Authorization: Bearer {adminToken}
   */
  @Get('rejected')
  @Roles('ADMIN')
  async getRejectedDoctors() {
    return this.verificationService.getRejectedDoctors();
  }

  /**
   * ADMIN consulta el estado de verificación de un doctor específico
   *
   * @param doctorId - ID del doctor
   * @returns Estado de verificación completo
   *
   * @example
   * GET /verification/doctor/5
   * Authorization: Bearer {adminToken}
   */
  @Get('doctor/:doctorId')
  @Roles('ADMIN')
  async getDoctorVerificationStatus(@Param('doctorId') doctorId: string) {
    return this.verificationService.getVerificationStatus(BigInt(doctorId));
  }

  /**
   * ADMIN aprueba o rechaza la verificación de un doctor
   *
   * Acción "approve":
   * - Cambia VerificationStatus a "approved"
   * - Establece VerifiedAt y VerifiedByAdminId
   * - Doctor obtiene badge de "Verificado"
   *
   * Acción "reject":
   * - Cambia VerificationStatus a "rejected"
   * - Guarda RejectionReason
   * - Doctor puede volver a enviar documentos
   *
   * @param doctorId - ID del doctor a revisar
   * @param user - Admin autenticado
   * @param dto - Acción (approve/reject), notas y razón de rechazo
   * @returns Estado de verificación actualizado
   *
   * @example
   * POST /verification/review/5
   * Authorization: Bearer {adminToken}
   * Body (aprobar): {
   *   "Action": "approve",
   *   "AdminNotes": "Documentos verificados correctamente. Licencia vigente."
   * }
   *
   * Body (rechazar): {
   *   "Action": "reject",
   *   "AdminNotes": "Documentos de baja calidad",
   *   "RejectionReason": "Las imágenes están borrosas y no se puede leer el número de licencia. Por favor, envía fotos de mejor calidad."
   * }
   */
  @Post('review/:doctorId')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async reviewVerification(
    @Param('doctorId') doctorId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.verificationService.reviewVerification(
      BigInt(doctorId),
      BigInt(user.sub),
      dto,
    );
  }
}
