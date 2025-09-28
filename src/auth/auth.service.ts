// src/auth/auth.service.ts
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.users.findUnique({ where: { Email: dto.Email } });
    if (exists) throw new BadRequestException('Email already registered');

    const hash = await bcrypt.hash(dto.Password, 10);
    const role = dto.Role ?? 'PATIENT';

    const user = await this.prisma.users.create({
      data: {
        Email: dto.Email,
        FullName: dto.FullName,
        Role: role,
        Status: 'active',
        // Guardamos el hash en un campo que no existe en tu tabla.
        // Sugerencia: crea UsersAuth (tabla aparte) o un campo PasswordHash.
        // Para avanzar rápido, crea tabla UsersAuth:
      },
    });

    // Crea UsersAuth si no la tienes (ver nota más abajo)
    await this.prisma.$executeRawUnsafe(`
      INSERT INTO UsersAuth (UserId, PasswordHash, CreatedAt)
      VALUES (${user.Id}, '${hash}', NOW(3))
    `);

    return this.issueTokens(user.Id, user.Email, user.Role as any);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.users.findUnique({ where: { Email: dto.Email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Trae hash
    const auth = await this.prisma.usersAuth.findUnique({ where: { UserId: user.Id } });
    if (!auth) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.Password, (auth as any).PasswordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user.Id, user.Email, user.Role as any);
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
