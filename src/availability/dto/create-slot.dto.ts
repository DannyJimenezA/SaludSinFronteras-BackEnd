import { IsISO8601, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateSlotDto {
  @IsISO8601() StartAt!: string;   // ISO en UTC, ej: "2025-10-12T14:00:00Z"
  @IsISO8601() EndAt!: string;     // ISO en UTC

  @ValidateIf((o) => o.IsRecurring === '1' || o.IsRecurring === 'true')
  @IsString()
  @IsOptional()
  RRule?: string;                  // RRULE opcional si vas a usar recurrencia

  @IsOptional()
  @IsString()
  IsRecurring?: '0'|'1'|'true'|'false'; // opcional en MVP (solo single slots)
}
