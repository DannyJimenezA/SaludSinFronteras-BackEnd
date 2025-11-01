import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { AppointmentStatusesService } from '../appointments/appointment-statuses.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DoctorsService, AppointmentStatusesService],
  controllers: [DoctorsController]
})
export class DoctorsModule {}
