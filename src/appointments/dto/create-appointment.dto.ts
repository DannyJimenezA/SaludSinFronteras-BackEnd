import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt() @Min(1) DoctorUserId!: number;
  @IsInt() @Min(1) SlotId!: number;               // MVP: reservar por slot existente
  @IsOptional() @IsString() Modality?: 'online'|'in_person'|'hybrid';
}
