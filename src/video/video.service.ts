import { ForbiddenException, Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

@Injectable()
export class VideoService {
  private roomClient: RoomServiceClient;

  constructor(private prisma: PrismaService) {
    const host = process.env.LIVEKIT_HOST;
    const key = process.env.LIVEKIT_API_KEY;
    const secret = process.env.LIVEKIT_API_SECRET;

    if (!host || !key || !secret) {
      throw new Error('[Video] Faltan LIVEKIT_HOST / LIVEKIT_API_KEY / LIVEKIT_API_SECRET en .env');
    }
    this.roomClient = new RoomServiceClient(host, key, secret);
  }

  async ensureRoom(appointmentId: bigint, actorId: bigint, role: 'ADMIN'|'DOCTOR'|'PATIENT') {
    const appt = await this.prisma.appointments.findUnique({ where: { Id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (role !== 'ADMIN' && appt.PatientUserId !== actorId && appt.DoctorUserId !== actorId) {
      throw new ForbiddenException('Forbidden');
    }

    const roomName = appt.SfuRoomId ?? `appt_${appointmentId.toString()}`;
    if (!appt.SfuRoomId) {
      try {
        await this.roomClient.createRoom({
          name: roomName,
          metadata: JSON.stringify({ appointmentId: appointmentId.toString() }),
        });
      } catch (e) {
        // si ya existe en LiveKit, lo ignoramos
      }
      await this.prisma.appointments.update({ where: { Id: appointmentId }, data: { SfuRoomId: roomName } });
    }
    return { AppointmentId: appointmentId.toString(), RoomName: roomName };
  }

  async getJoinToken(
    appointmentId: bigint,
    actor: { id: bigint; role: 'ADMIN'|'DOCTOR'|'PATIENT'; name?: string },
  ) {
    const appt = await this.prisma.appointments.findUnique({ where: { Id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (actor.role !== 'ADMIN' && appt.PatientUserId !== actor.id && appt.DoctorUserId !== actor.id) {
      throw new ForbiddenException('Forbidden');
    }

    const { RoomName } = await this.ensureRoom(appointmentId, actor.id, actor.role);

    // genera JWT (string)
    const at = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, {
      identity: `${actor.role}_${actor.id.toString()}`,
      name: actor.name ?? undefined,
      ttl: 60 * 60,
    });
    at.addGrant({ roomJoin: true, room: RoomName, canPublish: true, canSubscribe: true });

    let jwt: string;
    try {
      jwt = await at.toJwt();                   // <— STRING
    } catch (err) {
      throw new InternalServerErrorException('Failed to sign LiveKit token');
    }

    // log de sanidad (no imprime el token completo)
    console.log('[LiveKit] token sample:', jwt.slice(0, 20), '...');

    return {
      roomName: RoomName,
      token: jwt,                               // <— devuelve string
      url: process.env.LIVEKIT_WS_URL,
    };
  }

  async endRoom(appointmentId: bigint, actorId: bigint, role: 'ADMIN'|'DOCTOR'|'PATIENT') {
    const appt = await this.prisma.appointments.findUnique({ where: { Id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (role !== 'ADMIN' && appt.DoctorUserId !== actorId) {
      throw new ForbiddenException('Only doctor or admin can end room');
    }
    if (appt.SfuRoomId) {
      try { await this.roomClient.deleteRoom(appt.SfuRoomId); } catch {}
      await this.prisma.appointments.update({ where: { Id: appointmentId }, data: { SfuRoomId: null } });
    }
    return { ok: true };
  }
}
