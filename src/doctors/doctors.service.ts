import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentStatusesService } from '../appointments/appointment-statuses.service';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';
import { AssignSpecialtiesDto } from './dto/assign-specialties.dto';

@Injectable()
export class DoctorsService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private statusService: AppointmentStatusesService,
  ) {}

  async onModuleInit() {
    await this.statusService.initializeCache();
  }

  async getApprovedDoctors(specialtyId?: bigint, search?: string) {
    const doctors = await this.prisma.doctorProfiles.findMany({
      where: {
        VerificationStatus: 'approved',
        ...(specialtyId
          ? {
              DoctorProfileSpecialties: {
                some: { SpecialtyId: specialtyId },
              },
            }
          : {}),
        ...(search
          ? {
              Users: {
                OR: [
                  { FirstName: { contains: search } },
                  { LastName1: { contains: search } },
                  { LastName2: { contains: search } },
                ],
              },
            }
          : {}),
      },
      include: {
        Users: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfileSpecialties: {
          include: {
            Specialties: true,
          },
        },
        Countries: {
          select: {
            Id: true,
            Name: true,
            Iso2: true,
          },
        },
      },
      orderBy: {
        Users: {
          FirstName: 'asc',
        },
      },
    });

    return doctors.map((doc) => ({
      userId: doc.UserId.toString(),
      firstName: doc.Users.FirstName,
      lastName: `${doc.Users.LastName1 || ''} ${doc.Users.LastName2 || ''}`.trim(),
      email: doc.Users.Email,
      licenseNumber: doc.LicenseNumber,
      licenseCountry: doc.Countries.Name,
      yearsExperience: doc.YearsExperience,
      bio: doc.Bio,
      specialties: doc.DoctorProfileSpecialties.map((dps) => ({
        id: dps.Specialties.Id.toString(),
        name: dps.Specialties.Name,
      })),
    }));
  }

  async getAvailableSlots(
    doctorUserId: bigint,
    startDate?: string,
    endDate?: string,
  ) {
    // Validar que el doctor existe y está aprobado
    const doctor = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: doctorUserId },
      include: {
        Users: {
          select: {
            FirstName: true,
            LastName1: true,
            LastName2: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (doctor.VerificationStatus !== 'approved') {
      throw new ForbiddenException('Doctor is not approved');
    }

    // Definir rango de fechas (por defecto: hoy hasta 30 días en el futuro)
    const now = new Date();
    const start = startDate ? new Date(startDate) : now;
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Obtener todos los slots del doctor en el rango de fechas
    const slots = await this.prisma.availabilitySlots.findMany({
      where: {
        DoctorUserId: doctorUserId,
        StartAt: { gte: start },
        EndAt: { lte: end },
      },
      include: {
        Appointments: {
          select: {
            Id: true,
            StatusId: true,
            AppointmentStatuses: {
              select: {
                Code: true,
              },
            },
          },
        },
      },
      orderBy: {
        StartAt: 'asc',
      },
    });

    // Filtrar slots disponibles (sin cita o con cita cancelada)
    const cancelledStatusIds = await this.statusService.getStatusIds([
      'CANCELLED',
      'NO_SHOW',
    ]);
    const availableSlots = slots.filter((slot) => {
      // Si no hay appointments, está disponible
      if (slot.Appointments.length === 0) return true;

      // Si todas las appointments están canceladas, está disponible
      return slot.Appointments.every((apt) =>
        cancelledStatusIds.includes(apt.StatusId),
      );
    });

    return {
      doctor: {
        userId: doctor.UserId.toString(),
        name: `${doctor.Users.FirstName} ${doctor.Users.LastName1 || ''} ${doctor.Users.LastName2 || ''}`.trim(),
      },
      slots: availableSlots.map((slot) => ({
        id: slot.Id.toString(),
        startAt: slot.StartAt.toISOString(),
        endAt: slot.EndAt.toISOString(),
        isRecurring: slot.IsRecurring,
      })),
    };
  }

  async getProfile(userId: bigint) {
    const doc = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: userId },
      include: {
        Users: {
          select: {
            Id: true,
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfileSpecialties: {
          include: {
            Specialties: {
              select: {
                Id: true,
                Name: true,
              },
            },
          },
        },
      },
    });
    if (!doc) throw new NotFoundException('Doctor profile not found');

    // Formatear la respuesta para el frontend
    const fullName = `${doc.Users.FirstName || ''} ${doc.Users.LastName1 || ''} ${doc.Users.LastName2 || ''}`.trim();
    const specialty = doc.DoctorProfileSpecialties.length > 0
      ? doc.DoctorProfileSpecialties[0].Specialties.Name
      : 'General';

    return {
      UserId: doc.UserId.toString(),
      FullName: fullName,
      Specialty: specialty,
      Bio: doc.Bio,
      LicenseNumber: doc.LicenseNumber,
      LicenseCountryId: doc.LicenseCountryId,
      YearsExperience: doc.YearsExperience,
      VerificationStatus: doc.VerificationStatus,
      Specialties: doc.DoctorProfileSpecialties.map(dps => ({
        Id: dps.Specialties.Id.toString(),
        Name: dps.Specialties.Name,
      })),
    };
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

  async assignSpecialties(doctorUserId: bigint, dto: AssignSpecialtiesDto) {
    // Verificar que el doctor existe
    const doctor = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: doctorUserId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    // Verificar que todas las especialidades existen
    const specialties = await this.prisma.specialties.findMany({
      where: {
        Id: { in: dto.SpecialtyIds.map((id) => BigInt(id)) },
      },
    });

    if (specialties.length !== dto.SpecialtyIds.length) {
      throw new BadRequestException('One or more specialties do not exist');
    }

    // Eliminar especialidades existentes del doctor
    await this.prisma.doctorProfileSpecialties.deleteMany({
      where: { DoctorUserId: doctorUserId },
    });

    // Crear nuevas relaciones
    await this.prisma.doctorProfileSpecialties.createMany({
      data: dto.SpecialtyIds.map((specialtyId) => ({
        DoctorUserId: doctorUserId,
        SpecialtyId: BigInt(specialtyId),
      })),
    });

    // Retornar perfil actualizado con especialidades
    return this.getProfileWithSpecialties(doctorUserId);
  }

  async getProfileWithSpecialties(doctorUserId: bigint) {
    const doctor = await this.prisma.doctorProfiles.findUnique({
      where: { UserId: doctorUserId },
      include: {
        Users: {
          select: {
            FirstName: true,
            LastName1: true,
            LastName2: true,
            Email: true,
          },
        },
        DoctorProfileSpecialties: {
          include: {
            Specialties: true,
          },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return {
      userId: doctor.UserId.toString(),
      name: `${doctor.Users.FirstName} ${doctor.Users.LastName1 || ''} ${doctor.Users.LastName2 || ''}`.trim(),
      email: doctor.Users.Email,
      licenseNumber: doctor.LicenseNumber,
      yearsExperience: doctor.YearsExperience,
      bio: doctor.Bio,
      verificationStatus: doctor.VerificationStatus,
      specialties: doctor.DoctorProfileSpecialties.map((dps) => ({
        id: dps.Specialties.Id.toString(),
        name: dps.Specialties.Name,
      })),
    };
  }

  async removeSpecialty(doctorUserId: bigint, specialtyId: bigint) {
    // Verificar que la relación existe
    const relation = await this.prisma.doctorProfileSpecialties.findUnique({
      where: {
        DoctorUserId_SpecialtyId: {
          DoctorUserId: doctorUserId,
          SpecialtyId: specialtyId,
        },
      },
    });

    if (!relation) {
      throw new NotFoundException(
        'This doctor does not have this specialty assigned',
      );
    }

    // Eliminar la relación
    await this.prisma.doctorProfileSpecialties.delete({
      where: {
        DoctorUserId_SpecialtyId: {
          DoctorUserId: doctorUserId,
          SpecialtyId: specialtyId,
        },
      },
    });

    return { message: 'Specialty removed successfully' };
  }
}
