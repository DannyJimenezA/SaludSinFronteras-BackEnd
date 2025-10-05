import { IsOptional, IsString } from 'class-validator';
export class SendMessageDto {
  @IsString()
  Content!: string;

  @IsOptional()
  @IsString()
  Language?: string; // ISO (ej. 'es','en')
}
