// src/auth/auth.service.ts
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.users.findUnique({ where: { Email: dto.Email } });
    if (exists) throw new BadRequestException('Email ya registrado');

    // 🆕 Validar que la cédula no esté duplicada
    if (dto.Identification) {
      const identificationExists = await this.prisma.users.findUnique({
        where: { Identification: dto.Identification },
      });
      if (identificationExists) {
        throw new BadRequestException('La cédula ya está registrada');
      }
    }

    // Validar que las contraseñas coincidan
    if (dto.Password !== dto.PasswordConfirm) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    // Validar que FirstName y LastName1 no estén vacíos
    if (!dto.FirstName || dto.FirstName.trim() === '') {
      throw new BadRequestException('El nombre es requerido');
    }
    if (!dto.LastName1 || dto.LastName1.trim() === '') {
      throw new BadRequestException('El primer apellido es requerido');
    }

    const hash = await bcrypt.hash(dto.Password, 10);
    const role = dto.Role ?? 'PATIENT';
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Crear el usuario con los nuevos campos
    const user = await this.prisma.users.create({
      data: {
        IdentificationTypeId: dto.IdentificationTypeId ? BigInt(dto.IdentificationTypeId) : null,
        Identification: dto.Identification,
        FirstName: dto.FirstName.trim(),
        LastName1: dto.LastName1.trim(),
        LastName2: dto.LastName2?.trim(),
        GenderId: dto.GenderId ? BigInt(dto.GenderId) : null,
        DateOfBirth: dto.DateOfBirth ? new Date(dto.DateOfBirth) : null,
        NativeLanguageId: dto.NativeLanguageId ? BigInt(dto.NativeLanguageId) : null,
        Phone: dto.Phone,
        NationalityId: dto.NationalityId ? BigInt(dto.NationalityId) : null,
        ResidenceCountryId: dto.ResidenceCountryId ? BigInt(dto.ResidenceCountryId) : null,
        Email: dto.Email,
        IsActive: false, // La cuenta inicia inactiva hasta verificar email
        Role: role,
        // Campos legacy para compatibilidad
        FullName: `${dto.FirstName.trim()} ${dto.LastName1.trim()}${dto.LastName2 ? ' ' + dto.LastName2.trim() : ''}`,
        Status: 'pending',
      },
    });

    // Crear UsersAuth con token de verificación
    await this.prisma.usersAuth.create({
      data: {
        UserId: user.Id,
        PasswordHash: hash,
        EmailVerificationToken: verificationToken,
        EmailVerifiedAt: null,
      },
    });

    // Enviar correo de verificación
    await this.mailService.sendVerificationEmail(
      user.Email,
      verificationToken,
      user.FirstName,
    );

    return {
      message: 'Usuario registrado. Por favor verifica tu correo electrónico para activar tu cuenta.',
      email: user.Email,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.users.findUnique({ where: { Email: dto.Email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Verificar que la cuenta esté activa
    if (!user.IsActive) {
      throw new UnauthorizedException('Cuenta no activada. Por favor verifica tu correo electrónico.');
    }

    // Trae hash
    const auth = await this.prisma.usersAuth.findUnique({ where: { UserId: user.Id } });
    if (!auth) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.Password, auth.PasswordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.Id, user.Email, user.Role as any);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const auth = await this.prisma.usersAuth.findFirst({
      where: {
        EmailVerificationToken: dto.token,
      },
      include: {
        Users: true,
      },
    });

    if (!auth) {
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    // Verificar que el usuario no esté ya verificado
    if (auth.EmailVerifiedAt) {
      throw new BadRequestException('Esta cuenta ya ha sido verificada');
    }

    // Activar la cuenta
    await this.prisma.users.update({
      where: { Id: auth.UserId },
      data: {
        IsActive: true,
        Status: 'active',
      },
    });

    // Actualizar UsersAuth
    await this.prisma.usersAuth.update({
      where: { UserId: auth.UserId },
      data: {
        EmailVerifiedAt: new Date(),
        EmailVerificationToken: null, // Limpiar el token
      },
    });

    // Enviar correo de bienvenida
    await this.mailService.sendWelcomeEmail(auth.Users.Email, auth.Users.FirstName);

    return {
      message: 'Cuenta activada exitosamente. Ya puedes iniciar sesión.',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.users.findUnique({
      where: { Email: dto.Email },
    });

    // No revelar si el email existe o no (seguridad)
    if (!user) {
      return {
        message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1); // Expira en 1 hora

    await this.prisma.usersAuth.update({
      where: { UserId: user.Id },
      data: {
        PasswordResetToken: resetToken,
        PasswordResetExpiry: resetExpiry,
      },
    });

    await this.mailService.sendPasswordResetEmail(user.Email, resetToken, user.FirstName);

    return {
      message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const auth = await this.prisma.usersAuth.findFirst({
      where: {
        PasswordResetToken: dto.token,
        PasswordResetExpiry: {
          gte: new Date(), // Token no expirado
        },
      },
    });

    if (!auth) {
      throw new BadRequestException('Token de recuperación inválido o expirado');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.usersAuth.update({
      where: { UserId: auth.UserId },
      data: {
        PasswordHash: newHash,
        PasswordResetToken: null,
        PasswordResetExpiry: null,
      },
    });

    return {
      message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    };
  }

private async issueTokens(
  sub: number | bigint,
  email: string,
  role: 'ADMIN'|'DOCTOR'|'PATIENT'
) {
  const subject = typeof sub === 'bigint' ? sub.toString() : String(sub);

  const access = await this.jwt.signAsync(
    { sub: subject, email, role },
    { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_TTL || '15m' },
  );

  const refresh = await this.jwt.signAsync(
    { sub: subject, email, role, type: 'refresh' },
    { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_TTL || '7d' },
  );

  return { access_token: access, refresh_token: refresh };
}


  async refresh(token: string) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub:number; email:string; role:any; type:string }>(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      if (payload.type !== 'refresh') throw new UnauthorizedException();
      return this.issueTokens(payload.sub, payload.email, payload.role);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
