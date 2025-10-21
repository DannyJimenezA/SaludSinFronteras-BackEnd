import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { I18nModule, QueryResolver, AcceptLanguageResolver } from 'nestjs-i18n';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AppointmentNotesModule } from './appointment-notes/appointment-notes.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { TranslationModule } from './translation/translatio.module';
import { VideoModule } from './video/video.module';
import { MailModule } from './mail/mail.module';

// 🆕 Importaciones de Fase 1
import { CommonModule } from './common/common.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

// 🆕 Importaciones de Fase 2
import { MedicalRecordsModule } from './medical-records/medical-records.module';

@Module({
  imports: [
    // Archivos estáticos
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // 🆕 Rate Limiting (100 requests por minuto)
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto en milisegundos
        limit: 100, // 100 requests por minuto
      },
    ]),

    // 🆕 Internacionalización (i18n)
    I18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] }, // ?lang=en
        AcceptLanguageResolver, // Header Accept-Language
      ],
    }),

    // Tareas programadas
    ScheduleModule.forRoot(),

    // 🆕 Módulo común (global)
    CommonModule,

    // Módulos existentes
    PrismaModule,
    MailModule,
    UsersModule,
    AuthModule,
    DoctorsModule,
    AvailabilityModule,
    AppointmentsModule,
    AppointmentNotesModule,
    ConversationsModule,
    MessagesModule,
    TranslationModule,
    VideoModule,

    // 🆕 Módulos de Fase 2
    MedicalRecordsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 🆕 Interceptor global de auditoría
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
