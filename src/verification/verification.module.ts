import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * VerificationModule
 *
 * Módulo que gestiona la verificación de doctores mediante documentos.
 *
 * Funcionalidades:
 * - Doctores suben documentos de certificación
 * - Admins aprueban/rechazan verificaciones
 * - Badge de "Verificado" para doctores aprobados
 *
 * Endpoints:
 * - POST /verification/submit (DOCTOR)
 * - GET /verification/status (DOCTOR)
 * - GET /verification/pending (ADMIN)
 * - GET /verification/approved (ADMIN)
 * - GET /verification/rejected (ADMIN)
 * - GET /verification/doctor/:doctorId (ADMIN)
 * - POST /verification/review/:doctorId (ADMIN)
 */
@Module({
  imports: [PrismaModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
