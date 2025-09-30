import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateSlotDto } from './dto/create-slot.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private svc: AvailabilityService) {}

  // doctor crea su disponibilidad
  @Roles('DOCTOR')
  @Post('doctors/me/availability')
  createMine(@Req() req: any, @Body() dto: CreateSlotDto) {
    return this.svc.createSlot(BigInt(req.user.sub), dto);
  }

  // listar disponibilidad de un doctor para pacientes/otros
  @Roles('ADMIN','DOCTOR','PATIENT')
  @Get('doctors/:id/availability')
  list(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.listForDoctor(BigInt(id), from, to);
  }

  // doctor borra su slot
  @Roles('DOCTOR')
  @Delete('availability/:slotId')
  remove(@Req() req: any, @Param('slotId') slotId: string) {
    return this.svc.deleteSlot(BigInt(req.user.sub), BigInt(slotId));
  }
}
