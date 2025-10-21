import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PlansService } from './plans.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * SubscriptionsModule
 *
 * Módulo que gestiona planes y suscripciones de usuarios.
 *
 * Servicios:
 * - PlansService: Gestión de planes disponibles (Basic, Professional, Premium)
 * - SubscriptionsService: Gestión de suscripciones de usuarios
 *
 * Endpoints:
 * - GET /plans - Listar planes disponibles
 * - POST /plans/seed - Seed inicial de planes (ADMIN)
 * - POST /subscriptions/checkout - Simular checkout
 * - GET /subscriptions/me - Ver mi suscripción activa
 * - GET /subscriptions/history - Ver historial de suscripciones
 * - GET /subscriptions/appointment-limit - Verificar límite de citas
 * - DELETE /subscriptions/cancel - Cancelar auto-renovación
 */
@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PlansService],
  exports: [SubscriptionsService, PlansService],
})
export class SubscriptionsModule {}
