import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  ArrayMaxSize,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear un nuevo historial médico
 *
 * Los campos Diagnosis, Prescriptions y Recommendations serán
 * cifrados automáticamente con AES-256 antes de guardarse en BD
 */
export class CreateMedicalRecordDto {
  /**
   * ID del paciente al que pertenece el historial
   */
  @IsNumber()
  @Type(() => Number)
  PatientUserId: number;

  /**
   * ID de la cita relacionada (opcional)
   * Si se proporciona, el historial quedará vinculado a una cita específica
   */
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  AppointmentId?: number;

  /**
   * Diagnóstico del paciente
   * Este campo será CIFRADO con AES-256 antes de guardarse
   *
   * @example "Hipertensión arterial estadio 1, diabetes mellitus tipo 2 controlada"
   */
  @IsString()
  @IsNotEmpty({ message: 'El diagnóstico es obligatorio' })
  @MinLength(10, { message: 'El diagnóstico debe tener al menos 10 caracteres' })
  Diagnosis: string;

  /**
   * Prescripciones médicas
   * Este campo será CIFRADO con AES-256 antes de guardarse
   *
   * @example "Losartán 50mg cada 12 horas por 30 días\nMetformina 850mg cada 8 horas con alimentos"
   */
  @IsString()
  @IsOptional()
  Prescriptions?: string;

  /**
   * Recomendaciones médicas
   * Este campo será CIFRADO con AES-256 antes de guardarse
   *
   * @example "Dieta baja en sodio, ejercicio cardiovascular 30 min diarios, control glucémico mensual"
   */
  @IsString()
  @IsOptional()
  Recommendations?: string;

  /**
   * URLs de archivos adjuntos (estudios, imágenes, etc.)
   * Máximo 10 archivos por historial
   *
   * @example ["/uploads/medical-records/study-123.pdf", "/uploads/medical-records/xray-456.jpg"]
   */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Máximo 10 archivos permitidos' })
  @IsOptional()
  Files?: string[];
}
