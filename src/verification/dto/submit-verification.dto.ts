import {
  IsArray,
  IsString,
  IsOptional,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';

/**
 * DTO para que un doctor envíe sus documentos de certificación
 *
 * El doctor debe subir entre 1 y 10 documentos (títulos, licencias, certificados)
 * para ser verificado por un administrador.
 */
export class SubmitVerificationDto {
  /**
   * URLs de los documentos de certificación
   *
   * Ejemplos:
   * - uploads/licenses/medical-license-12345.pdf
   * - uploads/certificates/specialty-certificate.pdf
   * - uploads/diplomas/medical-degree.pdf
   *
   * Mínimo: 1 documento
   * Máximo: 10 documentos
   */
  @IsArray()
  @ArrayMinSize(1, {
    message: 'Debes subir al menos 1 documento de certificación',
  })
  @ArrayMaxSize(10, {
    message: 'No puedes subir más de 10 documentos',
  })
  @IsString({ each: true })
  CertificationDocuments: string[];

  /**
   * Notas adicionales del doctor (opcional)
   *
   * Puede incluir información relevante sobre su experiencia,
   * especialidades, o aclaraciones sobre los documentos.
   */
  @IsString()
  @IsOptional()
  Notes?: string;
}
