import { IsArray, IsInt, ArrayMinSize } from 'class-validator';

export class AssignSpecialtiesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one specialty is required' })
  @IsInt({ each: true, message: 'Each specialty ID must be an integer' })
  SpecialtyIds!: number[];
}
