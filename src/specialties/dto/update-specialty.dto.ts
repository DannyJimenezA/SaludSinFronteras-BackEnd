import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateSpecialtyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  Name!: string;
}
