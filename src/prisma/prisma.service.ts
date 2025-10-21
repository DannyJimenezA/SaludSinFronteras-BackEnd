// src/prisma/prisma.service.ts
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Configurar zona horaria de MySQL a Costa Rica (UTC-6)
    await this.$executeRawUnsafe(`SET time_zone = '-06:00'`);
  }

  async enableShutdownHooks(app: INestApplication) {
    // ✅ usa el evento del proceso y evitas el typing de Prisma.$on
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
