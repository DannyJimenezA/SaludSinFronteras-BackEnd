import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class JobsService implements OnModuleDestroy {
  private conn?: IORedis;
  readonly reminders: Queue;
  private worker: Worker;
  private events: QueueEvents;

  constructor() {
    const url = process.env.REDIS_URL;

    if (!url) {
      // Fallback simple en memoria (opcional). Si prefieres, lanza error aquí.
      console.warn('[Jobs] REDIS_URL no definido. Usa Upstash o instala Redis local. Activando fallback en memoria...');
      // Si no quieres fallback, arroja: throw new Error('REDIS_URL is required');
    }

    // Upstash/Redis con ioredis:
    // - maxRetriesPerRequest / enableReadyCheck recomendados por BullMQ en serverless
    // - El prefijo rediss:// usa TLS automáticamente
    this.conn = new IORedis(url!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // tls: { rejectUnauthorized: false }, // no suele ser necesario en Upstash
      lazyConnect: true,
    });

    this.conn.on('error', (e) => console.error('[Redis] error', e?.message));
    this.conn.on('connect', () => console.log('[Redis] connected'));
    this.conn.connect().catch((e) => console.error('[Redis] connect failed', e?.message));

    this.reminders = new Queue('reminders', { connection: this.conn });
    this.worker = new Worker(
      'reminders',
      async (job) => {
        // Aquí enviarías email/SMS/push.
        console.log('[REMINDER]', job.name, { appointmentId: job.data.appointmentId });
      },
      { connection: this.conn }
    );
    this.events = new QueueEvents('reminders', { connection: this.conn });

    this.worker.on('failed', (job, err) => console.error('[REMINDER][FAILED]', job?.name, err?.message));
    this.worker.on('completed', (job) => console.log('[REMINDER][DONE]', job?.name, job?.id));
  }

  async scheduleReminder(appointmentId: bigint, when: Date, label: string) {
    const delay = Math.max(0, when.getTime() - Date.now());
    await this.reminders.add(
      label,
      { appointmentId: appointmentId.toString() },
      { delay, removeOnComplete: true, removeOnFail: true }
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.reminders?.close();
    await this.events?.close();
    await this.conn?.quit();
  }
}
