// src/mail/mail.module.ts
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: parseInt(process.env.MAIL_PORT || '465'),
        secure: true, // true for 465 (SSL), false for 587 (TLS)
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
          ciphers: 'SSLv3', // Compatibilidad con Gmail
        },
        connectionTimeout: 60000, // 60 segundos
        greetingTimeout: 60000, // 60 segundos
        socketTimeout: 60000, // 60 segundos
      },
      defaults: {
        from: `"Salud Sin Fronteras" <${process.env.MAIL_FROM}>`,
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
