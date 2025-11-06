// src/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    try {
      this.logger.log(`Intentando enviar email de verificación a: ${email}`);
      this.logger.log(`MAIL_HOST: ${process.env.MAIL_HOST}`);
      this.logger.log(`MAIL_USER: ${process.env.MAIL_USER}`);
      this.logger.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);

      await this.mailerService.sendMail({
      to: email,
      subject: 'Activa tu cuenta - Salud Sin Fronteras',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bienvenido a Salud Sin Fronteras</h1>
            </div>
            <div class="content">
              <h2>Hola ${firstName},</h2>
              <p>Gracias por registrarte en Salud Sin Fronteras. Para activar tu cuenta, haz clic en el siguiente botón:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Activar Cuenta</a>
              </div>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #4CAF50;">${verificationUrl}</p>
              <p><strong>Importante:</strong> Este enlace expirará en 15 minutos. Si no activas tu cuenta en este tiempo, deberás registrarte nuevamente.</p>
            </div>
            <div class="footer">
              <p>Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
              <p>&copy; 2025 Salud Sin Fronteras. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      });

      this.logger.log(`Email de verificación enviado exitosamente a: ${email}`);
    } catch (error) {
      this.logger.error(`Error al enviar email de verificación a ${email}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string, firstName: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Recuperación de Contraseña - Salud Sin Fronteras',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
            .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Recuperación de Contraseña</h1>
            </div>
            <div class="content">
              <h2>Hola ${firstName},</h2>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Salud Sin Fronteras.</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #2196F3;">${resetUrl}</p>
              <div class="warning">
                <strong>Importante:</strong> Este enlace expirará en 1 hora por razones de seguridad.
              </div>
              <p>Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá sin cambios.</p>
            </div>
            <div class="footer">
              <p>Por tu seguridad, nunca compartas este enlace con nadie.</p>
              <p>&copy; 2025 Salud Sin Fronteras. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: '¡Cuenta Activada! - Salud Sin Fronteras',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>¡Cuenta Activada!</h1>
            </div>
            <div class="content">
              <h2>¡Hola ${firstName}!</h2>
              <p>Tu cuenta ha sido activada exitosamente. Ya puedes acceder a todos nuestros servicios.</p>
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/login" class="button">Iniciar Sesión</a>
              </div>
              <p>Estamos emocionados de tenerte con nosotros. Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Salud Sin Fronteras. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
  }
}
