import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { AppointmentStatusesService } from '../appointments/appointment-statuses.service';

@Module({
  controllers: [AvailabilityController],
  providers: [AvailabilityService, AppointmentStatusesService],
})
export class AvailabilityModule {}
