import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Cancel reason must be shorter than or equal to 255 characters' })
  CancelReason?: string;
}
