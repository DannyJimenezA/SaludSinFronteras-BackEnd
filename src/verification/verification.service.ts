import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import {
  VerificationResponseDto,
  PendingDoctorDto,
} from './dto/verification-response.dto';

/**
 * VerificationService - Gestión del sistema de verificación de doctores
 *
 * Flujo de verificación:
 * 1. Doctor sube documentos de certificación (submitVerification)
 * 2. ADMIN revisa documentos y aprueba/rechaza (reviewVerification)
 * 3. Doctor obtiene badge de "Verificado" si es aprobado
 *
 * Estados posibles:
 * - "pending": Esperando revisión del admin
 * - "approved": Verificado, puede aparecer con badge
 * - "rejected": Rechazado, debe volver a enviar documentos
 */
@Injectable()
export class VerificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Doctor envía sus documentos de certificación para verificación
   *
   * @param doctorUserId - ID del doctor que envía los documentos
   * @param dto - URLs de documentos y notas opcionales
   * @returns Perfil de doctor actualizado con estado "pending"
   */
  async submitVerification(
    doctorUserId: bigint,
    dto: SubmitVerificationDto,
  ): Promise<VerificationResponseDto> {
    // Verificar que el usuario es un doctor
    const user = await this.prisma.users.findUnique({
      where: { Id: doctorUserId },
    });

    if (!user || user.Role !== 'DOCTOR') {
      throw new ForbiddenException('Solo los doctores pueden enviar verificaciones');
    }

    // Verificar que existe un perfil de doctor
    const doctorProfile = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: doctorUserId },
      include: {
        Countries: true,
      },
    });

    if (!doctorProfile) {
      throw new NotFoundException(
        'No se encontró el perfil de doctor. Crea un perfil primero.',
      );
    }

    // No permitir reenvío si ya está aprobado
    if (doctorProfile.VerificationStatus === 'approved') {
      throw new BadRequestException('Ya estás verificado. No puedes enviar nuevos documentos.');
    }

    // Actualizar el perfil con los documentos
    const updated = await this.prisma.doctorProfiles.update({
      where: { UserId: doctorUserId },
      data: {
        CertificationDocuments: JSON.stringify(dto.CertificationDocuments),
        VerificationNotes: dto.Notes || null,
        VerificationStatus: 'pending',
        UpdatedAt: new Date(),
      },
      include: {
        Countries: true,
        Users: true,
      },
    });

    return this.formatVerificationResponse(updated);
  }

  /**
   * ADMIN revisa y aprueba/rechaza la verificación de un doctor
   *
   * @param doctorUserId - ID del doctor a revisar
   * @param adminUserId - ID del admin que realiza la revisión
   * @param dto - Acción (approve/reject) y notas
   * @returns Perfil de doctor actualizado
   */
  async reviewVerification(
    doctorUserId: bigint,
    adminUserId: bigint,
    dto: ReviewVerificationDto,
  ): Promise<VerificationResponseDto> {
    // Verificar que el doctor existe
    const doctorProfile = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: doctorUserId },
      include: {
        Countries: true,
        Users: true,
      },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor no encontrado');
    }

    // Verificar que hay documentos para revisar
    if (!doctorProfile.CertificationDocuments) {
      throw new BadRequestException(
        'El doctor no ha enviado documentos de certificación aún',
      );
    }

    // Validar que si rechaza, debe incluir razón
    if (dto.Action === 'reject' && !dto.RejectionReason) {
      throw new BadRequestException(
        'Debes proporcionar una razón de rechazo (RejectionReason)',
      );
    }

    // Actualizar el perfil según la acción
    const newStatus = dto.Action === 'approve' ? 'approved' : 'rejected';
    const verifiedAt = dto.Action === 'approve' ? new Date() : null;

    const updated = await this.prisma.doctorProfiles.update({
      where: { UserId: doctorUserId },
      data: {
        VerificationStatus: newStatus,
        VerificationNotes: dto.AdminNotes || null,
        RejectionReason: dto.Action === 'reject' ? dto.RejectionReason : null,
        VerifiedAt: verifiedAt,
        VerifiedByAdminId: dto.Action === 'approve' ? adminUserId : null,
        UpdatedAt: new Date(),
      },
      include: {
        Countries: true,
        Users: true,
      },
    });

    return this.formatVerificationResponse(updated);
  }

  /**
   * Obtener el estado de verificación de un doctor específico
   *
   * @param doctorUserId - ID del doctor
   * @returns Estado de verificación completo
   */
  async getVerificationStatus(
    doctorUserId: bigint,
  ): Promise<VerificationResponseDto> {
    const doctorProfile = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: doctorUserId },
      include: {
        Countries: true,
        Users: true,
      },
    });

    if (!doctorProfile) {
      throw new NotFoundException('Perfil de doctor no encontrado');
    }

    return this.formatVerificationResponse(doctorProfile);
  }

  /**
   * Listar todos los doctores pendientes de verificación (ADMIN)
   *
   * @returns Array de doctores con estado "pending"
   */
  async getPendingVerifications(): Promise<PendingDoctorDto[]> {
    const pendingDoctors = await this.prisma.doctorProfiles.findMany({
      where: {
        VerificationStatus: 'pending',
        CertificationDocuments: {
          not: null,
        },
      },
      include: {
        Users: true,
      },
      orderBy: {
        UpdatedAt: 'asc', // Los más antiguos primero
      },
    });

    return pendingDoctors.map((profile) => ({
      UserId: profile.UserId,
      DoctorName: `${profile.Users.FirstName} ${profile.Users.LastName1}`,
      Email: profile.Users.Email,
      LicenseNumber: profile.LicenseNumber,
      SubmittedAt: profile.UpdatedAt,
      DocumentsCount: profile.CertificationDocuments
        ? JSON.parse(profile.CertificationDocuments).length
        : 0,
    }));
  }

  /**
   * Listar todos los doctores verificados (aprobados)
   *
   * @returns Array de doctores con estado "approved"
   */
  async getVerifiedDoctors(): Promise<VerificationResponseDto[]> {
    const verifiedDoctors = await this.prisma.doctorProfiles.findMany({
      where: {
        VerificationStatus: 'approved',
      },
      include: {
        Countries: true,
        Users: true,
      },
      orderBy: {
        VerifiedAt: 'desc', // Los más recientes primero
      },
    });

    return verifiedDoctors.map((profile) => this.formatVerificationResponse(profile));
  }

  /**
   * Listar todos los doctores rechazados
   *
   * @returns Array de doctores con estado "rejected"
   */
  async getRejectedDoctors(): Promise<VerificationResponseDto[]> {
    const rejectedDoctors = await this.prisma.doctorProfiles.findMany({
      where: {
        VerificationStatus: 'rejected',
      },
      include: {
        Countries: true,
        Users: true,
      },
      orderBy: {
        UpdatedAt: 'desc',
      },
    });

    return rejectedDoctors.map((profile) => this.formatVerificationResponse(profile));
  }

  /**
   * Formatea un DoctorProfile a VerificationResponseDto
   */
  private formatVerificationResponse(profile: any): VerificationResponseDto {
    return {
      UserId: profile.UserId,
      DoctorName: `${profile.Users.FirstName} ${profile.Users.LastName1}`,
      Email: profile.Users.Email,
      LicenseNumber: profile.LicenseNumber,
      LicenseCountry: profile.Countries.Name,
      MedicalSchool: profile.MedicalSchool || undefined,
      YearsExperience: profile.YearsExperience || undefined,

      VerificationStatus: profile.VerificationStatus,
      CertificationDocuments: profile.CertificationDocuments
        ? JSON.parse(profile.CertificationDocuments)
        : undefined,
      VerificationNotes: profile.VerificationNotes || undefined,
      RejectionReason: profile.RejectionReason || undefined,

      VerifiedAt: profile.VerifiedAt || undefined,
      VerifiedByAdminId: profile.VerifiedByAdminId || undefined,
      SubmittedAt: profile.CreatedAt,
      UpdatedAt: profile.UpdatedAt,
    };
  }
}
