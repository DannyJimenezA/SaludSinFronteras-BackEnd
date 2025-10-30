import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { UpdateSpecialtyDto } from './dto/update-specialty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('specialties')
export class SpecialtiesController {
  constructor(private specialties: SpecialtiesService) {}

  // Endpoint público para obtener todas las especialidades
  @Get()
  getAll() {
    return this.specialties.getAll();
  }

  // Endpoint público para obtener una especialidad por ID
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.specialties.getById(BigInt(id));
  }

  // Endpoint protegido - Solo ADMIN puede crear especialidades
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateSpecialtyDto) {
    return this.specialties.create(dto);
  }

  // Endpoint protegido - Solo ADMIN puede actualizar especialidades
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.specialties.update(BigInt(id), dto);
  }

  // Endpoint protegido - Solo ADMIN puede eliminar especialidades
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.specialties.delete(BigInt(id));
  }
}
