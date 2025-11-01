import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from './plans.service';
import { MockCheckoutDto } from './dto/mock-checkout.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';

/**
 * SubscriptionsService - Gestión de suscripciones de usuarios
 *
 * Simula un sistema de pagos sin usar servicios externos.
 * En producción, esto se integraría con Stripe/PayPal/etc.
 *
 * Flujo:
 * 1. mockCheckout(): Simula pago y crea suscripción
 * 2. getMySubscription(): Obtiene suscripción activa del usuario
 * 3. cancelSubscription(): Cancela auto-renovación
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private plansService: PlansService,
  ) {}

  /**
   * Simula checkout y crea suscripción
   *
   * Este método simula un pago exitoso sin cobrar dinero real.
   * En producción, aquí se integraría Stripe/PayPal.
   *
   * @param userId - ID del usuario que suscribe
   * @param dto - Datos del checkout (PlanId, DurationMonths)
   * @returns Suscripción creada con plan incluido
   */
  async mockCheckout(
    userId: bigint,
    dto: MockCheckoutDto,
  ): Promise<SubscriptionResponseDto> {
    // Verificar que el plan existe y está activo
    const plan = await this.plansService.findOne(BigInt(dto.PlanId));

    if (!plan.IsActive) {
      throw new BadRequestException('El plan seleccionado no está disponible');
    }

    // Verificar si el usuario ya tiene una suscripción activa
    const existingSubscription = await this.prisma.subscriptions.findFirst({
      where: {
        UserId: userId,
        IsActive: true,
      },
    });

    if (existingSubscription) {
      throw new ConflictException(
        'Ya tienes una suscripción activa. Cancélala primero para cambiar de plan.',
      );
    }

    // Calcular fechas de inicio y expiración
    const startAt = new Date();
    const durationMonths = dto.DurationMonths || 1;

    // Si es plan gratuito (Basic), no expira
    const expiresAt =
      plan.PriceCents === 0
        ? null
        : new Date(
            startAt.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000,
          );

    // Crear la suscripción
    const subscription = await this.prisma.subscriptions.create({
      data: {
        UserId: userId,
        PlanId: BigInt(dto.PlanId),
        StartAt: startAt,
        ExpiresAt: expiresAt,
        IsActive: true,
        AutoRenew: plan.PriceCents > 0, // Solo auto-renovar planes de pago
      },
      include: {
        Plans: true,
      },
    });

    return this.formatSubscription(subscription);
  }

  /**
   * Obtener la suscripción activa del usuario
   *
   * Si el usuario no tiene suscripción, se le asigna automáticamente
   * el plan "Basic" (gratuito).
   *
   * @param userId - ID del usuario
   * @returns Suscripción activa con plan incluido
   */
  async getMySubscription(userId: bigint): Promise<SubscriptionResponseDto> {
    let subscription = await this.prisma.subscriptions.findFirst({
      where: {
        UserId: userId,
        IsActive: true,
      },
      include: {
        Plans: true,
      },
    });

    // Si no tiene suscripción, asignar plan Basic gratuito
    if (!subscription) {
      const basicPlan = await this.plansService.findByName('Basic');

      if (!basicPlan) {
        throw new NotFoundException(
          'Plan Basic no encontrado. Ejecuta el seed de planes primero.',
        );
      }

      subscription = await this.prisma.subscriptions.create({
        data: {
          UserId: userId,
          PlanId: BigInt(basicPlan.Id),
          StartAt: new Date(),
          ExpiresAt: null, // Plan gratuito no expira
          IsActive: true,
          AutoRenew: false,
        },
        include: {
          Plans: true,
        },
      });
    }

    // Verificar si la suscripción expiró
    if (
      subscription.ExpiresAt &&
      subscription.ExpiresAt < new Date() &&
      subscription.IsActive
    ) {
      // Desactivar suscripción expirada
      subscription = await this.prisma.subscriptions.update({
        where: { Id: subscription.Id },
        data: { IsActive: false },
        include: { Plans: true },
      });

      // Asignar plan Basic automáticamente
      const basicPlan = await this.plansService.findByName('Basic');
      subscription = await this.prisma.subscriptions.create({
        data: {
          UserId: userId,
          PlanId: BigInt(basicPlan!.Id),
          StartAt: new Date(),
          ExpiresAt: null,
          IsActive: true,
          AutoRenew: false,
        },
        include: { Plans: true },
      });
    }

    return this.formatSubscription(subscription);
  }

  /**
   * Cancelar suscripción activa
   *
   * Esto NO desactiva inmediatamente la suscripción, solo
   * desactiva la auto-renovación. La suscripción sigue activa
   * hasta su fecha de expiración.
   *
   * @param userId - ID del usuario
   * @returns Suscripción actualizada
   */
  async cancelSubscription(userId: bigint): Promise<SubscriptionResponseDto> {
    const subscription = await this.prisma.subscriptions.findFirst({
      where: {
        UserId: userId,
        IsActive: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No tienes una suscripción activa');
    }

    // Si es plan gratuito (Basic), no se puede cancelar
    const plan = await this.plansService.findOne(subscription.PlanId);
    if (plan.PriceCents === 0) {
      throw new BadRequestException('No puedes cancelar el plan gratuito');
    }

    // Desactivar auto-renovación
    const updated = await this.prisma.subscriptions.update({
      where: { Id: subscription.Id },
      data: {
        AutoRenew: false,
        UpdatedAt: new Date(),
      },
      include: {
        Plans: true,
      },
    });

    return this.formatSubscription(updated);
  }

  /**
   * Obtener historial de suscripciones del usuario
   *
   * @param userId - ID del usuario
   * @returns Array de todas las suscripciones (activas e inactivas)
   */
  async getSubscriptionHistory(
    userId: bigint,
  ): Promise<SubscriptionResponseDto[]> {
    const subscriptions = await this.prisma.subscriptions.findMany({
      where: { UserId: userId },
      orderBy: { CreatedAt: 'desc' },
      include: {
        Plans: true,
      },
    });

    return subscriptions.map((sub) => this.formatSubscription(sub));
  }

  /**
   * Verificar límite de citas del usuario
   *
   * Retorna cuántas citas le quedan disponibles este mes
   * según su plan de suscripción.
   *
   * @param userId - ID del usuario
   * @returns { hasLimit: boolean, remaining: number | null }
   */
  async checkAppointmentLimit(
    userId: bigint,
  ): Promise<{ hasLimit: boolean; remaining: number | null }> {
    const subscription = await this.getMySubscription(userId);

    // Plan ilimitado (Premium)
    if (subscription.Plan && subscription.Plan.MaxAppointments === null) {
      return {
        hasLimit: false,
        remaining: null,
      };
    }

    const maxAppointments = subscription.Plan?.MaxAppointments || 0;

    // Contar citas del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const appointmentsThisMonth = await this.prisma.appointments.count({
      where: {
        PatientUserId: userId,
        ScheduledAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const remaining = Math.max(0, maxAppointments - appointmentsThisMonth);

    return {
      hasLimit: true,
      remaining,
    };
  }

  /**
   * Formatea una suscripción para la respuesta
   */
  private formatSubscription(subscription: any): SubscriptionResponseDto {
    return {
      Id: subscription.Id,
      UserId: subscription.UserId,
      PlanId: subscription.PlanId,
      StartAt: subscription.StartAt,
      ExpiresAt: subscription.ExpiresAt,
      IsActive: subscription.IsActive,
      AutoRenew: subscription.AutoRenew,
      CreatedAt: subscription.CreatedAt,
      UpdatedAt: subscription.UpdatedAt,

      // Incluir plan si está presente
      ...(subscription.Plan && {
        Plan: {
          Id: subscription.Plan.Id,
          Name: subscription.Plan.Name,
          PriceCents: subscription.Plan.PriceCents,
          Currency: subscription.Plan.Currency,
          FeaturesJson: Array.isArray(subscription.Plan.FeaturesJson)
            ? subscription.Plan.FeaturesJson
            : JSON.parse(subscription.Plan.FeaturesJson || '[]'),
          MaxAppointments: subscription.Plan.MaxAppointments,
        },
      }),
    };
  }
}
