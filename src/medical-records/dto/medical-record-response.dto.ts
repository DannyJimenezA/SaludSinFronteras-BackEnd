/**
 * Interface para la respuesta de un historial médico
 *
 * Los campos cifrados (DiagnosisEnc, PrescriptionsEnc, etc.) son
 * automáticamente descifrados y expuestos como texto plano.
 * Los campos internos (EncryptionIV, *Enc) no se incluyen en la respuesta.
 */
export interface MedicalRecordResponseDto {
  Id: string | bigint;
  PatientUserId: string | bigint;
  DoctorUserId: string | bigint;
  AppointmentId?: string | bigint | null;

  // Campos descifrados (texto plano)
  Diagnosis: string;
  Prescriptions: string | null;
  Recommendations: string | null;
  Files: string[];

  // Metadata
  CreatedAt: Date;
  UpdatedAt: Date;

  // Relaciones opcionales
  Patient?: {
    Id: string | bigint;
    FirstName: string | null;
    LastName1: string | null;
    Email: string;
  };

  Doctor?: {
    Id: string | bigint;
    FirstName: string | null;
    LastName1: string | null;
    Email: string;
  };

  Appointment?: {
    Id: string | bigint;
    ScheduledAt: Date | null;
  };
}
