import { Module } from '@nestjs/common';
import { AppointmentNotesService } from './appointment-notes.service';
import { AppointmentNotesController } from './appointment-notes.controller';

@Module({
  controllers: [AppointmentNotesController],
  providers: [AppointmentNotesService],
})
export class AppointmentNotesModule {}
