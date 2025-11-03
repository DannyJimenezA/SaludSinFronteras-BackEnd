// src/users/users.service.ts
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { Email: email } });
  }

findById(id: bigint) {
  return this.prisma.users.findUnique({ where: { Id: id } });
}
  async updateMe(id: number, data: Partial<{
    FullName?: string;
    FirstName?: string;
    LastName1?: string;
    LastName2?: string;
    Phone?: string;
    Gender?: string;
    DateOfBirth?: string;
    Identification?: string;
    NationalityId?: string;
    ResidenceCountryId?: string;
    PrimaryLanguage?: string;
    Timezone?: string;
  }>) {
    // Preparar los datos para actualizar, filtrando undefined
    const updateData: any = {};
    if (data.FullName !== undefined) updateData.FullName = data.FullName;
    if (data.FirstName !== undefined) updateData.FirstName = data.FirstName;
    if (data.LastName1 !== undefined) updateData.LastName1 = data.LastName1;
    if (data.LastName2 !== undefined) updateData.LastName2 = data.LastName2;
    if (data.Phone !== undefined) updateData.Phone = data.Phone;
    if (data.Gender !== undefined) updateData.Gender = data.Gender;
    if (data.DateOfBirth !== undefined) updateData.DateOfBirth = new Date(data.DateOfBirth);
    if (data.Identification !== undefined) updateData.Identification = data.Identification;
    if (data.NationalityId !== undefined) updateData.NationalityId = data.NationalityId ? BigInt(data.NationalityId) : null;
    if (data.ResidenceCountryId !== undefined) updateData.ResidenceCountryId = data.ResidenceCountryId ? BigInt(data.ResidenceCountryId) : null;
    if (data.PrimaryLanguage !== undefined) updateData.PrimaryLanguage = data.PrimaryLanguage;
    if (data.Timezone !== undefined) updateData.Timezone = data.Timezone;

    const user = await this.prisma.users.update({
      where: { Id: id },
      data: updateData
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    // Buscar el usuario y su auth
    const userAuth = await this.prisma.usersAuth.findUnique({
      where: { UserId: userId }
    });

    if (!userAuth) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar la contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, userAuth.PasswordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar la contraseña
    await this.prisma.usersAuth.update({
      where: { UserId: userId },
      data: { PasswordHash: hashedPassword }
    });

    return { message: 'Contraseña actualizada exitosamente' };
  }
}
