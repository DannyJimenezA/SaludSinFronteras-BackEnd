/**
 * Interface para la respuesta de una suscripción
 */
export interface SubscriptionResponseDto {
  Id: string | bigint;
  UserId: string | bigint;
  PlanId: string | bigint;
  StartAt: Date;
  ExpiresAt: Date | null;
  IsActive: boolean;
  AutoRenew: boolean;
  CreatedAt: Date;
  UpdatedAt: Date;

  // Plan asociado
  Plan?: {
    Id: string | bigint;
    Name: string;
    PriceCents: number;
    Currency: string;
    FeaturesJson: string[];
    MaxAppointments: number | null;
  };
}

/**
 * Interface para un plan de suscripción
 */
export interface PlanResponseDto {
  Id: string | bigint;
  Name: string;
  PriceCents: number;
  Currency: string;
  FeaturesJson: string[];
  MaxAppointments: number | null;
  IsActive: boolean;
  CreatedAt: Date;

  // Precio formateado (helper)
  FormattedPrice?: string;
}
