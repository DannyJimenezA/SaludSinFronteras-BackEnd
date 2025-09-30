import { IsEnum, IsOptional, IsString } from 'class-validator';
export class UpdateAppointmentStatusDto {
  @IsEnum(['CONFIRMED','CANCELLED','RESCHEDULED','COMPLETED','NO_SHOW'])
  Status!: 'CONFIRMED'|'CANCELLED'|'RESCHEDULED'|'COMPLETED'|'NO_SHOW';

  @IsOptional()
  @IsString()
  CancelReason?: string;
}
