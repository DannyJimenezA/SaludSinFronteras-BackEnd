// import { ValidationPipe } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';
// import helmet from 'helmet';
// import { AppModule } from './app.module';
// import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';
// import { TransformInterceptor } from './common/interceptors/transform.interceptor';

// async function bootstrap() {
//   // const app = await NestFactory.create(AppModule, { cors: true });
// const app = await NestFactory.create(AppModule);

// app.enableCors({
//   origin: ['http://localhost:5173'], // tu frontend local
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//   credentials: true, // si usas cookies o tokens
// });

//   // 🆕 Helmet para seguridad de headers HTTP
//   app.use(helmet());

//   // Interceptores globales
//   app.useGlobalInterceptors(new BigIntSerializerInterceptor());
//   app.useGlobalInterceptors(new TransformInterceptor());

//   // Pipes de validación
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       transform: true,
//       forbidNonWhitelisted: true, // 🆕 Rechazar propiedades no permitidas
//     }),
//   );

//   const port = process.env.PORT ? Number(process.env.PORT) : 3000;
//   await app.listen(port, '0.0.0.0');

//   console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
//   console.log(`📁 Archivos estáticos en http://localhost:${port}/uploads`);
//   console.log(`🔐 Cifrado AES-256: ${process.env.ENCRYPTION_SECRET ? '✅ Configurado' : '⚠️  No configurado'}`);
// }
// bootstrap();


import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { BigIntSerializerInterceptor } from './common/interceptors/bigint-serializer.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 🟢 1. Habilitar CORS antes de Helmet
  app.enableCors({
    origin: [
      'http://localhost:5173',     // Frontend local
      'http://127.0.0.1:5173',     // Alternativa si Vite usa IP
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // 🟢 2. Helmet configurado para no bloquear recursos CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  // 🟢 3. Interceptores y Pipes
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 🟢 4. Puerto
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend corriendo en http://localhost:${port}`);
}
bootstrap();
