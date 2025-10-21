import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserFiltersDto,
  UserListItemDto,
  UserDetailDto,
} from '../dto/user-management.dto';

/**
 * UsersManagementService - Gestión de usuarios por ADMIN
 *
 * Funcionalidades:
 * - Listar usuarios con filtros
 * - Ver detalles de un usuario
 * - Banear/desbanear usuarios
 * - Eliminar usuarios
 */
@Injectable()
export class UsersManagementService {
  constructor(private prisma: PrismaService) {}

  /**
   * Listar usuarios con filtros opcionales
   *
   * @param filters - Filtros de búsqueda (rol, verificación, búsqueda por texto)
   * @param page - Número de página (default: 1)
   * @param limit - Elementos por página (default: 20)
   * @returns Lista de usuarios paginada
   */
  async listUsers(
    filters: UserFiltersDto = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ users: UserListItemDto[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    // Construir condiciones de filtro
    const where: any = {};

    if (filters.role) {
      where.Role = filters.role;
    }

    if (filters.search) {
      where.OR = [
        { FirstName: { contains: filters.search } },
        { LastName1: { contains: filters.search } },
        { Email: { contains: filters.search } },
      ];
    }

    // Filtro de verificación de email
    if (filters.isEmailVerified !== undefined) {
      where.UsersAuth = filters.isEmailVerified
        ? { EmailVerifiedAt: { not: null } }
        : { EmailVerifiedAt: null };
    }

    // Ejecutar consultas en paralelo
    const [users, total] = await Promise.all([
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { CreatedAt: 'desc' },
        include: {
          UsersAuth: {
            select: {
              EmailVerifiedAt: true,
              IsBanned: true,
              BanReason: true,
            },
          },
          DoctorProfiles: {
            select: {
              VerificationStatus: true,
              LicenseNumber: true,
            },
          },
        },
      }),
      this.prisma.users.count({ where }),
    ]);

    // Filtro adicional para estado de verificación de doctor (post-query)
    let filteredUsers = users;
    if (filters.verificationStatus && filters.role === 'DOCTOR') {
      filteredUsers = users.filter(
        (u) =>
          u.DoctorProfiles?.VerificationStatus === filters.verificationStatus,
      );
    }

    const formattedUsers: UserListItemDto[] = filteredUsers.map((user) => ({
      id: user.Id,
      email: user.Email,
      fullName: `${user.FirstName} ${user.LastName1}${user.LastName2 ? ' ' + user.LastName2 : ''}`,
      role: user.Role,
      isEmailVerified: !!user.UsersAuth?.EmailVerifiedAt,
      isBanned: user.UsersAuth?.IsBanned || false,
      banReason: user.UsersAuth?.BanReason || undefined,
      createdAt: user.CreatedAt,
      verificationStatus: user.DoctorProfiles?.VerificationStatus,
      licenseNumber: user.DoctorProfiles?.LicenseNumber,
    }));

    return {
      users: formattedUsers,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener detalles completos de un usuario
   *
   * @param userId - ID del usuario
   * @returns Información detallada del usuario con estadísticas
   */
  async getUserDetails(userId: bigint): Promise<UserDetailDto> {
    const user = await this.prisma.users.findUnique({
      where: { Id: userId },
      include: {
        UsersAuth: {
          select: {
            EmailVerifiedAt: true,
            IsBanned: true,
            BanReason: true,
            LastLogin: true,
          },
        },
        DoctorProfiles: {
          select: {
            VerificationStatus: true,
            LicenseNumber: true,
          },
        },
        Subscription: {
          where: { IsActive: true },
          include: {
            Plan: {
              select: {
                Name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Obtener estadísticas del usuario
    const [totalAppointments, totalMedicalRecords] = await Promise.all([
      user.Role === 'DOCTOR'
        ? this.prisma.appointments.count({
            where: { DoctorUserId: userId },
          })
        : this.prisma.appointments.count({
            where: { PatientUserId: userId },
          }),
      user.Role === 'PATIENT'
        ? this.prisma.medicalRecords.count({
            where: { PatientUserId: userId },
          })
        : 0,
    ]);

    const activeSubscription = user.Subscription;

    return {
      id: user.Id,
      email: user.Email,
      fullName: `${user.FirstName} ${user.LastName1}${user.LastName2 ? ' ' + user.LastName2 : ''}`,
      firstName: user.FirstName,
      lastName1: user.LastName1,
      lastName2: user.LastName2 || undefined,
      role: user.Role,
      phone: user.Phone || undefined,
      birthDate: user.DateOfBirth || undefined,
      isEmailVerified: !!user.UsersAuth?.EmailVerifiedAt,
      isBanned: user.UsersAuth?.IsBanned || false,
      banReason: user.UsersAuth?.BanReason || undefined,
      verificationStatus: user.DoctorProfiles?.VerificationStatus,
      licenseNumber: user.DoctorProfiles?.LicenseNumber,
      totalAppointments,
      totalMedicalRecords: totalMedicalRecords > 0 ? totalMedicalRecords : undefined,
      activeSubscription: activeSubscription
        ? {
            planName: activeSubscription.Plan.Name,
            expiresAt: activeSubscription.ExpiresAt || undefined,
          }
        : undefined,
      lastLogin: user.UsersAuth?.LastLogin || undefined,
      createdAt: user.CreatedAt,
      updatedAt: user.UpdatedAt,
    };
  }

  /**
   * Banear a un usuario
   *
   * @param userId - ID del usuario a banear
   * @param reason - Razón del ban
   * @returns Usuario actualizado
   */
  async banUser(userId: bigint, reason: string): Promise<{ message: string }> {
    const user = await this.prisma.users.findUnique({
      where: { Id: userId },
      select: { Role: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No permitir banear a otros admins
    if (user.Role === 'ADMIN') {
      throw new Error('No puedes banear a otros administradores');
    }

    await this.prisma.usersAuth.update({
      where: { UserId: userId },
      data: {
        IsBanned: true,
        BanReason: reason,
      },
    });

    return {
      message: `Usuario baneado exitosamente. Razón: ${reason}`,
    };
  }

  /**
   * Desbanear a un usuario
   *
   * @param userId - ID del usuario a desbanear
   * @returns Usuario actualizado
   */
  async unbanUser(userId: bigint): Promise<{ message: string }> {
    await this.prisma.usersAuth.update({
      where: { UserId: userId },
      data: {
        IsBanned: false,
        BanReason: null,
      },
    });

    return {
      message: 'Usuario desbaneado exitosamente',
    };
  }

  /**
   * Eliminar a un usuario permanentemente
   *
   * ADVERTENCIA: Esta acción es irreversible.
   * Se eliminan en cascada todos los datos relacionados.
   *
   * @param userId - ID del usuario a eliminar
   * @returns Mensaje de confirmación
   */
  async deleteUser(userId: bigint): Promise<{ message: string }> {
    const user = await this.prisma.users.findUnique({
      where: { Id: userId },
      select: { Role: true, Email: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No permitir eliminar a otros admins
    if (user.Role === 'ADMIN') {
      throw new Error('No puedes eliminar a otros administradores');
    }

    // Eliminar en orden (respetando foreign keys)
    await this.prisma.$transaction(async (tx) => {
      // Eliminar registros relacionados
      await tx.dataAccessLogs.deleteMany({ where: { UserId: userId } });
      await tx.usersMfa.deleteMany({ where: { UserId: userId } });
      await tx.subscriptions.deleteMany({ where: { UserId: userId } });
      await tx.medicalRecords.deleteMany({
        where: {
          OR: [{ PatientUserId: userId }, { DoctorUserId: userId }],
        },
      });
      await tx.userLanguages.deleteMany({ where: { UserId: userId } });
      await tx.doctorProfiles.deleteMany({ where: { UserId: userId } });

      // Actualizar appointments (no eliminar, solo desasociar)
      await tx.appointments.updateMany({
        where: { PatientUserId: userId },
        data: { PatientUserId: null },
      });
      await tx.appointments.updateMany({
        where: { DoctorUserId: userId },
        data: { DoctorUserId: null },
      });

      await tx.availabilitySlots.deleteMany({ where: { DoctorUserId: userId } });
      await tx.conversationParticipants.deleteMany({ where: { UserId: userId } });
      await tx.messages.deleteMany({ where: { SenderUserId: userId } });
      await tx.files.deleteMany({ where: { OwnerUserId: userId } });
      await tx.videoSessionParticipants.deleteMany({ where: { UserId: userId } });
      await tx.transcriptionSegments.deleteMany({ where: { UserId: userId } });
      await tx.consentLogs.deleteMany({ where: { UserId: userId } });
      await tx.auditLogs.deleteMany({ where: { ActorUserId: userId } });

      // Eliminar autenticación
      await tx.usersAuth.delete({ where: { UserId: userId } });

      // Finalmente eliminar el usuario
      await tx.users.delete({ where: { Id: userId } });
    });

    return {
      message: `Usuario ${user.Email} eliminado permanentemente junto con todos sus datos`,
    };
  }
}
