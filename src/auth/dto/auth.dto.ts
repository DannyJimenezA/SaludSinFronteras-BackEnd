// src/auth/dto/auth.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() Email: string;
  @IsString() @MinLength(8) Password: string;
  @IsString() @IsNotEmpty() FullName: string;
  @IsString() @IsOptional() Role?: 'ADMIN' | 'DOCTOR' | 'PATIENT'; // fuerza PATIENT por defecto
}

export class LoginDto {
  @IsEmail() Email: string;
  @IsString() Password: string;
}
