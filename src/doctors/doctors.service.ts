import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: bigint) {
    const doc = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: userId },
    });
    if (!doc) throw new NotFoundException('Doctor profile not found');
    return doc;
  }

  async upsertProfile(userId: bigint, data: UpsertDoctorDto) {
    // 1) valida rol
    const user = await this.prisma.users.findUnique({ where: { Id: userId } });
    if (!user || user.Role !== 'DOCTOR') {
      throw new ForbiddenException('Only doctors can update profile');
    }

    // 2) ¿ya existe el perfil?
    const existing = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: userId },
    });

    if (!existing) {
      // CREATE (checked create con relaciones)
      if (!data.LicenseNumber?.trim()) {
        throw new BadRequestException('LicenseNumber is required');
      }
      if (data.LicenseCountryId == null) {
        throw new BadRequestException('LicenseCountryId is required');
      }

      return this.prisma.doctorProfiles.create({
        data: {
          LicenseNumber: data.LicenseNumber,
          Bio: data.Bio ?? null,
          YearsExperience: data.YearsExperience ?? null,
          Users: { connect: { Id: userId } },
          Countries: { connect: { Id: BigInt(data.LicenseCountryId) } },
        },
      });
    }

    // UPDATE
    return this.prisma.doctorProfiles.update({
      where: { UserId: userId },
      data: {
        LicenseNumber: data.LicenseNumber ?? undefined,
        Bio: data.Bio ?? undefined,
        YearsExperience: data.YearsExperience ?? undefined,
        ...(data.LicenseCountryId != null
          ? { Countries: { connect: { Id: BigInt(data.LicenseCountryId) } } }
          : {}),
      },
    });
  }
}
