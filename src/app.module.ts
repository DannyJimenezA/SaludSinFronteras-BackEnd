import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AppointmentNotesModule } from './appointment-notes/appointment-notes.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, DoctorsModule, AvailabilityModule, AppointmentsModule, AppointmentNotesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
