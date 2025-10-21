import { Module } from '@nestjs/common';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * MedicalRecordsModule - Módulo de Historiales Médicos
 *
 * Características:
 * - Cifrado automático AES-256 de campos sensibles
 * - Auditoría automática de accesos (HIPAA/GDPR)
 * - Control de acceso basado en roles
 * - Integración con citas médicas
 *
 * Dependencias:
 * - PrismaModule: Acceso a base de datos
 * - CommonModule (global): EncryptionService, AuditService
 */
@Module({
  imports: [PrismaModule],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
