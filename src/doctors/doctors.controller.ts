import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpsertDoctorDto } from './dto/upsert-doctor.dto';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private doctors: DoctorsService) {}

  @Roles('DOCTOR')
  @Get('me/profile')
  me(@Req() req: any) {
    return this.doctors.getProfile(BigInt(req.user.sub));
  }

  @Roles('DOCTOR')
  @Patch('me/profile')
  upsert(@Req() req: any, @Body() dto: UpsertDoctorDto) {
    return this.doctors.upsertProfile(BigInt(req.user.sub), dto);
  }
}
