import {
  IsString,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  MinLength,
} from 'class-validator';

/**
 * DTO para actualizar un historial médico existente
 *
 * Todos los campos son opcionales. Solo se actualizarán los campos proporcionados.
 * Los campos sensibles serán re-cifrados con un nuevo IV.
 */
export class UpdateMedicalRecordDto {
  /**
   * Diagnóstico actualizado
   * Este campo será RE-CIFRADO con un nuevo IV si se proporciona
   *
   * @example "Hipertensión arterial estadio 2, diabetes mellitus tipo 2 descompensada"
   */
  @IsString()
  @MinLength(10, { message: 'El diagnóstico debe tener al menos 10 caracteres' })
  @IsOptional()
  Diagnosis?: string;

  /**
   * Prescripciones actualizadas
   * Este campo será RE-CIFRADO con un nuevo IV si se proporciona
   *
   * @example "Losartán 100mg cada 12 horas por 30 días\nMetformina 1000mg cada 8 horas con alimentos\nAtorvastatin 20mg cada noche"
   */
  @IsString()
  @IsOptional()
  Prescriptions?: string;

  /**
   * Recomendaciones actualizadas
   * Este campo será RE-CIFRADO con un nuevo IV si se proporciona
   *
   * @example "Dieta DASH estricta, ejercicio supervisado, control glucémico semanal, consulta con nutricionista"
   */
  @IsString()
  @IsOptional()
  Recommendations?: string;

  /**
   * URLs de archivos actualizados
   * Reemplaza completamente la lista anterior de archivos
   * Máximo 10 archivos
   *
   * @example ["/uploads/medical-records/study-789.pdf", "/uploads/medical-records/blood-test-2024.pdf"]
   */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Máximo 10 archivos permitidos' })
  @IsOptional()
  Files?: string[];
}
