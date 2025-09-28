import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpsertDoctorDto {
  @IsString()
  @IsNotEmpty()
  LicenseNumber!: string;

  @IsInt()
  @Min(1)
  LicenseCountryId!: number;

  @IsOptional()
  @IsString()
  Bio?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  YearsExperience?: number;
}
