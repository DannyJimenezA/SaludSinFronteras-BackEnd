/**
 * Interfaz para la respuesta de verificación de un doctor
 */
export interface VerificationResponseDto {
  UserId: string | bigint;
  DoctorName: string;
  Email: string;
  LicenseNumber: string;
  LicenseCountry: string;
  MedicalSchool?: string;
  YearsExperience?: number;

  // Estado de verificación
  VerificationStatus: 'pending' | 'approved' | 'rejected';
  CertificationDocuments?: string[]; // Array de URLs
  VerificationNotes?: string;
  RejectionReason?: string;

  // Metadata de verificación
  VerifiedAt?: Date;
  VerifiedByAdminId?: string | bigint;
  SubmittedAt: Date; // CreatedAt del DoctorProfile
  UpdatedAt: Date;
}

/**
 * Interfaz para listar doctores pendientes (versión resumida)
 */
export interface PendingDoctorDto {
  UserId: string | bigint;
  DoctorName: string;
  Email: string;
  LicenseNumber: string;
  SubmittedAt: Date;
  DocumentsCount: number;
}
