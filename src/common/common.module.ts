import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './services/encryption.service';
import { AuditService } from './services/audit.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * CommonModule - Módulo global para servicios compartidos
 *
 * Este módulo exporta servicios que pueden ser utilizados
 * en toda la aplicación sin necesidad de importar el módulo
 * en cada lugar.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [EncryptionService, AuditService],
  exports: [EncryptionService, AuditService],
})
export class CommonModule {}
