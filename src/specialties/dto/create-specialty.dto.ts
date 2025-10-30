import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSpecialtyDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  Name!: string;
}
