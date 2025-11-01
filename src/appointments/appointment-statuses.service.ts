import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AppointmentStatusCode =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'RESCHEDULED'
  | 'NO_SHOW';

@Injectable()
export class AppointmentStatusesService {
  // Cache for status lookups
  private statusCache = new Map<string, bigint>();

  constructor(private prisma: PrismaService) {}

  /**
   * Get status ID by code
   * Uses cache to avoid repeated database queries
   */
  async getStatusId(code: AppointmentStatusCode): Promise<bigint> {
    // Check cache first
    if (this.statusCache.has(code)) {
      return this.statusCache.get(code)!;
    }

    // Query database
    const status = await this.prisma.appointmentStatuses.findUnique({
      where: { Code: code },
      select: { Id: true },
    });

    if (!status) {
      throw new Error(`Appointment status '${code}' not found`);
    }

    // Cache the result
    this.statusCache.set(code, status.Id);
    return status.Id;
  }

  /**
   * Get multiple status IDs by codes
   */
  async getStatusIds(codes: AppointmentStatusCode[]): Promise<bigint[]> {
    return Promise.all(codes.map(code => this.getStatusId(code)));
  }

  /**
   * Initialize cache by loading all statuses
   */
  async initializeCache(): Promise<void> {
    const statuses = await this.prisma.appointmentStatuses.findMany({
      select: { Code: true, Id: true },
    });

    for (const status of statuses) {
      this.statusCache.set(status.Code, status.Id);
    }
  }

  /**
   * Get all appointment statuses
   */
  async getAllStatuses() {
    return this.prisma.appointmentStatuses.findMany({
      orderBy: { Id: 'asc' },
    });
  }
}
