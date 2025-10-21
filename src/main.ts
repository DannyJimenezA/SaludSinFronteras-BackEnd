import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // 🆕 Helmet para seguridad de headers HTTP
  app.use(helmet());

  // Interceptores globales
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Pipes de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true, // 🆕 Rechazar propiedades no permitidas
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
  console.log(`📁 Archivos estáticos en http://localhost:${port}/uploads`);
  console.log(`🔐 Cifrado AES-256: ${process.env.ENCRYPTION_SECRET ? '✅ Configurado' : '⚠️  No configurado'}`);
}
bootstrap();
