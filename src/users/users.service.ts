// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { Email: email } });
  }

findById(id: bigint) {
  return this.prisma.users.findUnique({ where: { Id: id } });
}
  async updateMe(id: number, data: Partial<{ FullName?: string; Phone?: string }>) {
    // Preparar los datos para actualizar, filtrando undefined
    const updateData: any = {};
    if (data.FullName !== undefined) updateData.FullName = data.FullName;
    if (data.Phone !== undefined) updateData.Phone = data.Phone;
    // Note: Gender is not updated here as the schema uses GenderId (foreign key)

    const user = await this.prisma.users.update({
      where: { Id: id },
      data: updateData
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
