// src/auth/dto/auth.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsNumber, IsDateString, IsBoolean } from 'class-validator';

export class RegisterDto {
  // Tipo de Identificación
  @IsNumber()
  @IsOptional()
  IdentificationTypeId?: number;

  // Número de Identificación
  @IsString()
  @IsOptional()
  Identification?: string;

  // Nombre
  @IsString()
  @IsNotEmpty()
  FirstName: string;

  // Primer Apellido
  @IsString()
  @IsNotEmpty()
  LastName1: string;

  // Segundo Apellido (opcional)
  @IsString()
  @IsOptional()
  LastName2?: string;

  // Género
  @IsNumber()
  @IsOptional()
  GenderId?: number;

  // Fecha de Nacimiento
  @IsDateString()
  @IsOptional()
  DateOfBirth?: string;

  // Lengua Nativa
  @IsNumber()
  @IsOptional()
  NativeLanguageId?: number;

  // Teléfono
  @IsString()
  @IsOptional()
  Phone?: string;

  // Nacionalidad
  @IsNumber()
  @IsOptional()
  NationalityId?: number;

  // País de Residencia
  @IsNumber()
  @IsOptional()
  ResidenceCountryId?: number;

  // Email
  @IsEmail()
  Email: string;

  // Password
  @IsString()
  @MinLength(8)
  Password: string;

  // Confirmación de Password
  @IsString()
  @MinLength(8)
  PasswordConfirm: string;

  // Rol
  @IsString()
  @IsOptional()
  Role?: 'ADMIN' | 'DOCTOR' | 'PATIENT';
}

export class LoginDto {
  @IsEmail()
  Email: string;

  @IsString()
  Password: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  Email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
