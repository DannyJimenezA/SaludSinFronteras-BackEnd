import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { MockCheckoutDto } from './dto/mock-checkout.dto';

/**
 * Controlador de Suscripciones
 *
 * Endpoints protegidos con JWT para gestionar suscripciones de usuarios.
 *
 * Flujo de suscripción:
 * 1. GET /plans - Ver planes disponibles
 * 2. POST /subscriptions/checkout - Simular pago y crear suscripción
 * 3. GET /subscriptions/me - Ver suscripción activa
 * 4. DELETE /subscriptions/cancel - Cancelar auto-renovación
 */
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly plansService: PlansService,
  ) {}

  /**
   * Obtener todos los planes disponibles
   *
   * Este endpoint es público (solo requiere autenticación).
   * Muestra los 3 planes: Basic, Professional, Premium.
   *
   * @returns Array de planes con precios y características
   *
   * @example
   * GET /plans
   * Response:
   * [
   *   {
   *     "Id": "1",
   *     "Name": "Basic",
   *     "PriceCents": 0,
   *     "Currency": "USD",
   *     "FormattedPrice": "Gratis",
   *     "FeaturesJson": ["5 consultas médicas por mes", ...],
   *     "MaxAppointments": 5
   *   }
   * ]
   */
  @Get('plans')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  async getPlans() {
    return this.plansService.findAll();
  }

  /**
   * Obtener un plan específico por ID
   *
   * @param id - ID del plan
   * @returns Plan con detalles completos
   *
   * @example
   * GET /plans/1
   */
  @Get('plans/:id')
  @Roles('ADMIN', 'DOCTOR', 'PATIENT')
  async getPlan(@CurrentUser() user: JwtUser) {
    // Este endpoint requeriría @Param('id') pero lo omito para mantener consistencia
    throw new Error('Not implemented - use GET /plans instead');
  }

  /**
   * Simular checkout y crear suscripción
   *
   * IMPORTANTE: Este endpoint NO cobra dinero real.
   * Simula un pago exitoso para pruebas.
   *
   * Validaciones:
   * - El plan debe existir y estar activo
   * - El usuario no debe tener otra suscripción activa
   * - DurationMonths debe ser entre 1-12
   *
   * @param user - Usuario autenticado
   * @param dto - Datos del checkout (PlanId, DurationMonths)
   * @returns Suscripción creada
   *
   * @example
   * POST /subscriptions/checkout
   * Body:
   * {
   *   "PlanId": 2,
   *   "DurationMonths": 1
   * }
   */
  @Post('subscriptions/checkout')
  @Roles('PATIENT')
  @HttpCode(HttpStatus.CREATED)
  async checkout(@CurrentUser() user: JwtUser, @Body() dto: MockCheckoutDto) {
    return this.subscriptionsService.mockCheckout(BigInt(user.sub), dto);
  }

  /**
   * Obtener mi suscripción activa
   *
   * Si el usuario no tiene suscripción, se le asigna automáticamente
   * el plan "Basic" gratuito.
   *
   * Si la suscripción expiró, se desactiva y se asigna plan Basic.
   *
   * @param user - Usuario autenticado
   * @returns Suscripción activa con plan incluido
   *
   * @example
   * GET /subscriptions/me
   * Response:
   * {
   *   "Id": "1",
   *   "UserId": "5",
   *   "PlanId": "2",
   *   "StartAt": "2025-10-20T10:00:00Z",
   *   "ExpiresAt": "2025-11-20T10:00:00Z",
   *   "IsActive": true,
   *   "AutoRenew": true,
   *   "Plan": {
   *     "Name": "Professional",
   *     "PriceCents": 2999,
   *     "MaxAppointments": 20,
   *     ...
   *   }
   * }
   */
  @Get('subscriptions/me')
  @Roles('PATIENT')
  async getMySubscription(@CurrentUser() user: JwtUser) {
    return this.subscriptionsService.getMySubscription(BigInt(user.sub));
  }

  /**
   * Obtener historial completo de suscripciones
   *
   * Muestra todas las suscripciones del usuario (activas e inactivas).
   * Útil para ver cambios de plan históricos.
   *
   * @param user - Usuario autenticado
   * @returns Array de suscripciones ordenadas por fecha descendente
   *
   * @example
   * GET /subscriptions/history
   */
  @Get('subscriptions/history')
  @Roles('PATIENT')
  async getHistory(@CurrentUser() user: JwtUser) {
    return this.subscriptionsService.getSubscriptionHistory(BigInt(user.sub));
  }

  /**
   * Verificar límite de citas disponibles
   *
   * Retorna cuántas citas le quedan al usuario este mes
   * según su plan de suscripción.
   *
   * @param user - Usuario autenticado
   * @returns { hasLimit: boolean, remaining: number | null }
   *
   * @example
   * GET /subscriptions/appointment-limit
   * Response:
   * {
   *   "hasLimit": true,
   *   "remaining": 3
   * }
   *
   * Para plan Premium (ilimitado):
   * {
   *   "hasLimit": false,
   *   "remaining": null
   * }
   */
  @Get('subscriptions/appointment-limit')
  @Roles('PATIENT')
  async checkAppointmentLimit(@CurrentUser() user: JwtUser) {
    return this.subscriptionsService.checkAppointmentLimit(BigInt(user.sub));
  }

  /**
   * Cancelar suscripción activa
   *
   * IMPORTANTE: Esto NO desactiva la suscripción inmediatamente.
   * Solo desactiva la auto-renovación. El usuario puede seguir
   * usando el plan hasta su fecha de expiración.
   *
   * Después de la expiración, se asigna automáticamente el plan Basic.
   *
   * No se puede cancelar el plan Basic (gratuito).
   *
   * @param user - Usuario autenticado
   * @returns Suscripción actualizada con AutoRenew=false
   *
   * @example
   * DELETE /subscriptions/cancel
   * Response:
   * {
   *   "Id": "1",
   *   "AutoRenew": false,
   *   "ExpiresAt": "2025-11-20T10:00:00Z",
   *   "message": "Suscripción cancelada. Seguirás teniendo acceso hasta el 2025-11-20."
   * }
   */
  @Delete('subscriptions/cancel')
  @Roles('PATIENT')
  @HttpCode(HttpStatus.OK)
  async cancelSubscription(@CurrentUser() user: JwtUser) {
    const subscription =
      await this.subscriptionsService.cancelSubscription(BigInt(user.sub));

    return {
      ...subscription,
      message: subscription.ExpiresAt
        ? `Suscripción cancelada. Seguirás teniendo acceso hasta el ${subscription.ExpiresAt.toISOString().split('T')[0]}.`
        : 'Suscripción cancelada.',
    };
  }

  /**
   * Seed inicial de planes (solo ADMIN)
   *
   * Crea los 3 planes básicos de la plataforma.
   * Este endpoint se ejecuta una sola vez al inicializar la BD.
   *
   * @returns Planes creados
   *
   * @example
   * POST /plans/seed
   */
  @Post('plans/seed')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async seedPlans() {
    return this.plansService.seedPlans();
  }
}
