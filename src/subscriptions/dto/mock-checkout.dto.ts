import { IsNumber, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para simular un checkout de suscripción
 *
 * Este DTO se usa para "comprar" un plan sin integrar un
 * sistema de pagos real (Stripe, PayPal, etc.)
 */
export class MockCheckoutDto {
  /**
   * ID del plan que se desea contratar
   *
   * @example 1 (Basic), 2 (Professional), 3 (Premium)
   */
  @IsNumber()
  @Type(() => Number)
  PlanId: number;

  /**
   * Duración de la suscripción en meses
   *
   * @default 1
   * @example 1 (mensual), 3 (trimestral), 12 (anual)
   */
  @IsInt()
  @Min(1, { message: 'La duración mínima es 1 mes' })
  @Max(12, { message: 'La duración máxima es 12 meses' })
  @IsOptional()
  @Type(() => Number)
  DurationMonths?: number;
}
