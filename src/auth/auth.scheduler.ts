// src/auth/auth.scheduler.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthScheduler {
  private readonly logger = new Logger(AuthScheduler.name);

  constructor(private prisma: PrismaService) {}

  // Ejecutar cada 5 minutos
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupUnverifiedAccounts() {
    this.logger.log('Iniciando limpieza de cuentas no verificadas...');

    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    try {
      // Buscar usuarios no verificados creados hace más de 15 minutos
      const unverifiedUsers = await this.prisma.users.findMany({
        where: {
          IsActive: false,
          Status: 'pending',
          CreatedAt: {
            lte: fifteenMinutesAgo,
          },
        },
        include: {
          UsersAuth: true,
        },
      });

      // Filtrar solo los que no han verificado su email
      const usersToDelete = unverifiedUsers.filter(
        (user) => user.UsersAuth && !user.UsersAuth.EmailVerifiedAt,
      );

      if (usersToDelete.length === 0) {
        this.logger.log('No hay cuentas no verificadas para eliminar');
        return;
      }

      this.logger.log(`Eliminando ${usersToDelete.length} cuenta(s) no verificada(s)`);

      // Eliminar las cuentas
      for (const user of usersToDelete) {
        try {
          // Eliminar primero UsersAuth (por la clave foránea)
          await this.prisma.usersAuth.delete({
            where: { UserId: user.Id },
          });

          // Eliminar el usuario
          await this.prisma.users.delete({
            where: { Id: user.Id },
          });

          this.logger.log(`Usuario eliminado: ${user.Email}`);
        } catch (error) {
          this.logger.error(`Error eliminando usuario ${user.Email}:`, error);
        }
      }

      this.logger.log(
        `Limpieza completada. ${usersToDelete.length} cuenta(s) eliminada(s)`,
      );
    } catch (error) {
      this.logger.error('Error en la limpieza de cuentas no verificadas:', error);
    }
  }
}
