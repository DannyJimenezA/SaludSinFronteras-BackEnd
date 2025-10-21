import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanResponseDto } from './dto/subscription-response.dto';

/**
 * PlansService - Gestión de planes de suscripción
 *
 * Este servicio maneja los planes disponibles en la plataforma.
 * Los planes se crean mediante el método seedPlans() y no se
 * modifican después (son estáticos).
 */
@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtener todos los planes activos
   * Ordenados por precio ascendente
   */
  async findAll(): Promise<PlanResponseDto[]> {
    const plans = await this.prisma.plans.findMany({
      where: { IsActive: true },
      orderBy: { PriceCents: 'asc' },
    });

    return plans.map((plan) => this.formatPlan(plan));
  }

  /**
   * Obtener un plan por ID
   */
  async findOne(id: bigint): Promise<PlanResponseDto> {
    const plan = await this.prisma.plans.findUnique({
      where: { Id: id },
    });

    if (!plan) {
      throw new NotFoundException('Plan no encontrado');
    }

    return this.formatPlan(plan);
  }

  /**
   * Obtener un plan por nombre
   */
  async findByName(name: string): Promise<PlanResponseDto | null> {
    const plan = await this.prisma.plans.findUnique({
      where: { Name: name },
    });

    return plan ? this.formatPlan(plan) : null;
  }

  /**
   * Seed inicial de planes
   *
   * Este método crea los 3 planes básicos de la plataforma.
   * Se ejecuta una sola vez al inicializar la aplicación.
   *
   * Planes:
   * - Basic: Gratis, 5 consultas/mes
   * - Professional: $29.99/mes, 20 consultas/mes
   * - Premium: $99.99/mes, ilimitado
   */
  async seedPlans(): Promise<{ message: string; plans: PlanResponseDto[] }> {
    const plansData = [
      {
        Name: 'Basic',
        PriceCents: 0, // Gratis
        Currency: 'USD',
        FeaturesJson: [
          '5 consultas médicas por mes',
          'Chat de texto con doctores',
          'Acceso a historial médico básico',
          'Soporte por email',
        ],
        MaxAppointments: 5,
        IsActive: true,
      },
      {
        Name: 'Professional',
        PriceCents: 2999, // $29.99
        Currency: 'USD',
        FeaturesJson: [
          '20 consultas médicas por mes',
          'Videollamadas HD con doctores',
          'Historial médico completo cifrado',
          'Traducción automática de mensajes',
          'Recordatorios de citas',
          'Soporte prioritario 24/7',
          'Descuentos en medicamentos',
        ],
        MaxAppointments: 20,
        IsActive: true,
      },
      {
        Name: 'Premium',
        PriceCents: 9999, // $99.99
        Currency: 'USD',
        FeaturesJson: [
          'Consultas médicas ilimitadas',
          'Videollamadas HD con grabación',
          'Historial médico avanzado con IA',
          'Traducción en tiempo real (voz y texto)',
          'Segunda opinión médica incluida',
          'Atención prioritaria 24/7',
          'Consultas de emergencia',
          'Descuentos premium en medicamentos',
          'Acceso a especialistas internacionales',
          'Exportación de historiales en PDF',
        ],
        MaxAppointments: null, // Ilimitado
        IsActive: true,
      },
    ];

    const createdPlans: PlanResponseDto[] = [];

    for (const planData of plansData) {
      const plan = await this.prisma.plans.upsert({
        where: { Name: planData.Name },
        update: {}, // No actualizar si ya existe
        create: planData,
      });

      createdPlans.push(this.formatPlan(plan));
    }

    return {
      message: `${createdPlans.length} planes creados/verificados exitosamente`,
      plans: createdPlans,
    };
  }

  /**
   * Formatea un plan para la respuesta
   * Agrega el precio formateado como helper
   */
  private formatPlan(plan: any): PlanResponseDto {
    const priceInDollars = plan.PriceCents / 100;
    const formattedPrice =
      plan.PriceCents === 0
        ? 'Gratis'
        : `$${priceInDollars.toFixed(2)} ${plan.Currency}/mes`;

    return {
      Id: plan.Id,
      Name: plan.Name,
      PriceCents: plan.PriceCents,
      Currency: plan.Currency,
      FeaturesJson: Array.isArray(plan.FeaturesJson)
        ? plan.FeaturesJson
        : JSON.parse(plan.FeaturesJson || '[]'),
      MaxAppointments: plan.MaxAppointments,
      IsActive: plan.IsActive,
      CreatedAt: plan.CreatedAt,
      FormattedPrice: formattedPrice,
    };
  }
}
