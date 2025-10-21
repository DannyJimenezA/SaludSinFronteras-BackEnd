import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordResponseDto } from './dto/medical-record-response.dto';

@Injectable()
export class MedicalRecordsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Crear un nuevo historial médico
   * Los campos sensibles son cifrados con AES-256 antes de guardarse
   *
   * @param doctorUserId - ID del doctor que crea el historial
   * @param dto - Datos del historial
   */
  async create(
    doctorUserId: bigint,
    dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    // Verificar que el paciente existe
    const patient = await this.prisma.users.findUnique({
      where: { Id: BigInt(dto.PatientUserId) },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    // Si se especifica una cita, verificar que existe y pertenece al doctor
    if (dto.AppointmentId) {
      const appointment = await this.prisma.appointments.findUnique({
        where: { Id: BigInt(dto.AppointmentId) },
      });

      if (!appointment) {
        throw new NotFoundException('Cita no encontrada');
      }

      if (appointment.DoctorUserId !== doctorUserId) {
        throw new ForbiddenException(
          'Solo puedes crear historiales para tus propias citas',
        );
      }
    }

    // 🔐 Cifrar campos sensibles
    const diagnosisEnc = this.encryption.encrypt(dto.Diagnosis);
    const prescriptionsEnc = dto.Prescriptions
      ? this.encryption.encrypt(dto.Prescriptions)
      : null;
    const recommendationsEnc = dto.Recommendations
      ? this.encryption.encrypt(dto.Recommendations)
      : null;

    // Guardar en BD con campos cifrados
    const record = await this.prisma.medicalRecords.create({
      data: {
        PatientUserId: BigInt(dto.PatientUserId),
        DoctorUserId: doctorUserId,
        AppointmentId: dto.AppointmentId ? BigInt(dto.AppointmentId) : null,
        DiagnosisEnc: diagnosisEnc.encrypted,
        PrescriptionsEnc: prescriptionsEnc?.encrypted || null,
        RecommendationsEnc: recommendationsEnc?.encrypted || null,
        EncryptionIV: diagnosisEnc.iv, // Mismo IV para todos los campos
        FilesJson: dto.Files || [],
      },
      include: {
        Patient: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
        Doctor: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
      },
    });

    // Retornar con campos descifrados
    return this.decryptRecord(record);
  }

  /**
   * Buscar historiales médicos por paciente
   *
   * @param patientUserId - ID del paciente
   * @param requesterId - ID del usuario que hace la petición
   * @param role - Rol del usuario (ADMIN, DOCTOR, PATIENT)
   */
  async findByPatient(
    patientUserId: bigint,
    requesterId: bigint,
    role: string,
  ): Promise<MedicalRecordResponseDto[]> {
    // Verificar permisos
    if (role === 'PATIENT' && patientUserId !== requesterId) {
      throw new ForbiddenException(
        'No puedes acceder a historiales de otros pacientes',
      );
    }

    const records = await this.prisma.medicalRecords.findMany({
      where: { PatientUserId: patientUserId },
      orderBy: { CreatedAt: 'desc' },
      include: {
        Doctor: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
        Appointment: {
          select: {
            Id: true,
            ScheduledAt: true,
          },
        },
      },
    });

    // Descifrar todos los registros
    return records.map((record) => this.decryptRecord(record));
  }

  /**
   * Obtener un historial médico por ID
   *
   * @param id - ID del historial
   * @param requesterId - ID del usuario que hace la petición
   * @param role - Rol del usuario
   */
  async findOne(
    id: bigint,
    requesterId: bigint,
    role: string,
  ): Promise<MedicalRecordResponseDto> {
    const record = await this.prisma.medicalRecords.findUnique({
      where: { Id: id },
      include: {
        Patient: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
        Doctor: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
        Appointment: {
          select: {
            Id: true,
            ScheduledAt: true,
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('Historial médico no encontrado');
    }

    // Verificar permisos
    const isPatient = record.PatientUserId === requesterId;
    const isDoctor = record.DoctorUserId === requesterId;
    const isAdmin = role === 'ADMIN';

    if (!isPatient && !isDoctor && !isAdmin) {
      throw new ForbiddenException(
        'No tienes permisos para ver este historial',
      );
    }

    return this.decryptRecord(record);
  }

  /**
   * Actualizar un historial médico
   * Solo el doctor autor puede actualizar
   *
   * @param id - ID del historial
   * @param doctorUserId - ID del doctor que actualiza
   * @param dto - Datos a actualizar
   */
  async update(
    id: bigint,
    doctorUserId: bigint,
    dto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    const existing = await this.prisma.medicalRecords.findUnique({
      where: { Id: id },
    });

    if (!existing) {
      throw new NotFoundException('Historial médico no encontrado');
    }

    if (existing.DoctorUserId !== doctorUserId) {
      throw new ForbiddenException(
        'Solo el doctor autor puede actualizar este historial',
      );
    }

    // Preparar datos a actualizar
    const updates: any = {
      UpdatedAt: new Date(),
    };

    // 🔐 Re-cifrar campos si se proporcionan (con nuevo IV)
    if (dto.Diagnosis) {
      const enc = this.encryption.encrypt(dto.Diagnosis);
      updates.DiagnosisEnc = enc.encrypted;
      updates.EncryptionIV = enc.iv; // Nuevo IV
    }

    if (dto.Prescriptions !== undefined) {
      if (dto.Prescriptions) {
        // Re-usar el IV actual o crear uno nuevo si se actualizó el Diagnosis
        const iv = updates.EncryptionIV || existing.EncryptionIV;
        const enc = this.encryption.encrypt(dto.Prescriptions);
        updates.PrescriptionsEnc = enc.encrypted;
        if (!updates.EncryptionIV) {
          updates.EncryptionIV = enc.iv;
        }
      } else {
        updates.PrescriptionsEnc = null;
      }
    }

    if (dto.Recommendations !== undefined) {
      if (dto.Recommendations) {
        const iv = updates.EncryptionIV || existing.EncryptionIV;
        const enc = this.encryption.encrypt(dto.Recommendations);
        updates.RecommendationsEnc = enc.encrypted;
        if (!updates.EncryptionIV) {
          updates.EncryptionIV = enc.iv;
        }
      } else {
        updates.RecommendationsEnc = null;
      }
    }

    if (dto.Files !== undefined) {
      updates.FilesJson = dto.Files;
    }

    const updated = await this.prisma.medicalRecords.update({
      where: { Id: id },
      data: updates,
      include: {
        Patient: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
        Doctor: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            Email: true,
          },
        },
      },
    });

    return this.decryptRecord(updated);
  }

  /**
   * Eliminar un historial médico
   * Solo ADMIN o el doctor autor pueden eliminar
   *
   * @param id - ID del historial
   * @param requesterId - ID del usuario que elimina
   * @param role - Rol del usuario
   */
  async delete(id: bigint, requesterId: bigint, role: string): Promise<void> {
    const record = await this.prisma.medicalRecords.findUnique({
      where: { Id: id },
    });

    if (!record) {
      throw new NotFoundException('Historial médico no encontrado');
    }

    // Solo ADMIN o el doctor autor pueden eliminar
    if (role !== 'ADMIN' && record.DoctorUserId !== requesterId) {
      throw new ForbiddenException('Sin permisos para eliminar este historial');
    }

    await this.prisma.medicalRecords.delete({ where: { Id: id } });
  }

  /**
   * Descifra los campos sensibles de un registro
   *
   * @param record - Registro de BD con campos cifrados
   * @returns Registro con campos descifrados
   */
  private decryptRecord(record: any): MedicalRecordResponseDto {
    const iv = record.EncryptionIV;

    try {
      return {
        Id: record.Id,
        PatientUserId: record.PatientUserId,
        DoctorUserId: record.DoctorUserId,
        AppointmentId: record.AppointmentId,

        // 🔓 Descifrar campos sensibles
        Diagnosis: this.encryption.decrypt(record.DiagnosisEnc, iv),
        Prescriptions: record.PrescriptionsEnc
          ? this.encryption.decrypt(record.PrescriptionsEnc, iv)
          : null,
        Recommendations: record.RecommendationsEnc
          ? this.encryption.decrypt(record.RecommendationsEnc, iv)
          : null,
        Files: Array.isArray(record.FilesJson) ? record.FilesJson : [],

        CreatedAt: record.CreatedAt,
        UpdatedAt: record.UpdatedAt,

        // Incluir relaciones si están presentes
        ...(record.Patient && { Patient: record.Patient }),
        ...(record.Doctor && { Doctor: record.Doctor }),
        ...(record.Appointment && { Appointment: record.Appointment }),
      };
    } catch (error) {
      throw new BadRequestException(
        'Error al descifrar el historial médico. Datos corruptos.',
      );
    }
  }
}
