import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentStatusesService } from './appointment-statuses.service';
import { JobsModule } from 'src/jobs/jobs.module';

@Module({
  imports: [JobsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentStatusesService],
  exports: [AppointmentsService, AppointmentStatusesService],
})
export class AppointmentsModule {}
