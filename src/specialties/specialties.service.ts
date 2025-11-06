import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';

@Injectable()
export class SpecialtiesService {
  constructor(private prisma: PrismaService) {}

  async getAll() {
    const specialties = await this.prisma.specialties.findMany({
      orderBy: {
        Name: 'asc',
      },
    });

    return specialties.map((specialty) => ({
      Id: specialty.Id.toString(),
      Name: specialty.Name,
    }));
  }

  async getById(id: bigint) {
    const specialty = await this.prisma.specialties.findUnique({
      where: { Id: id },
    });

    if (!specialty) {
      throw new NotFoundException('Specialty not found');
    }

    return {
      id: specialty.Id.toString(),
      name: specialty.Name,
    };
  }

  async create(dto: CreateSpecialtyDto) {
    // Verificar si ya existe una especialidad con ese nombre
    const existing = await this.prisma.specialties.findUnique({
      where: { Name: dto.Name },
    });

    if (existing) {
      throw new ConflictException('Specialty with this name already exists');
    }

    const specialty = await this.prisma.specialties.create({
      data: {
        Name: dto.Name,
      },
    });

    return {
      id: specialty.Id.toString(),
      name: specialty.Name,
    };
  }

  async update(id: bigint, dto: UpdateSpecialtyDto) {
    // Verificar que la especialidad existe
    const existing = await this.prisma.specialties.findUnique({
      where: { Id: id },
    });

    if (!existing) {
      throw new NotFoundException('Specialty not found');
    }

    // Verificar que el nuevo nombre no está en uso (excepto por esta misma especialidad)
    const nameInUse = await this.prisma.specialties.findUnique({
      where: { Name: dto.Name },
    });

    if (nameInUse && nameInUse.Id !== id) {
      throw new ConflictException('Specialty with this name already exists');
    }

    const specialty = await this.prisma.specialties.update({
      where: { Id: id },
      data: {
        Name: dto.Name,
      },
    });

    return {
      id: specialty.Id.toString(),
      name: specialty.Name,
    };
  }

  async delete(id: bigint) {
    // Verificar que la especialidad existe
    const existing = await this.prisma.specialties.findUnique({
      where: { Id: id },
      include: {
        DoctorProfileSpecialties: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Specialty not found');
    }

    // Verificar que no hay doctores con esta especialidad
    if (existing.DoctorProfileSpecialties.length > 0) {
      throw new ConflictException(
        'Cannot delete specialty with associated doctors. Remove doctors first.',
      );
    }

    await this.prisma.specialties.delete({
      where: { Id: id },
    });

    return { message: 'Specialty deleted successfully' };
  }
}
