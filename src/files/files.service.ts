import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}
  private UPLOAD_DIR = path.join(process.cwd(), 'uploads');

  async save(ownerUserId: bigint, file: Express.Multer.File) {
    if (!fs.existsSync(this.UPLOAD_DIR)) fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const filename = `${Date.now()}_${file.originalname}`;
    const full = path.join(this.UPLOAD_DIR, filename);
    fs.writeFileSync(full, file.buffer);

    return this.prisma.files.create({
      data: {
        OwnerUserId: ownerUserId,
        StorageUrl: `/uploads/${filename}`,
        MimeType: file.mimetype,
        SizeBytes: BigInt(file.size),
        Checksum: checksum,
      },
    });
  }
}
