import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class FilesService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}
  private UPLOAD_DIR = path.join(process.cwd(), 'uploads');

  async save(ownerUserId: bigint, file: Express.Multer.File) {
    const checksum = createHash('sha256').update(file.buffer).digest('hex');

    // Verificar si Cloudinary está configurado
    const useCloudinary =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'tu-cloud-name';

    let storageUrl: string;
    let publicId: string | undefined;

    if (useCloudinary) {
      // Subir a Cloudinary
      const uploadResult = await this.cloudinaryService.uploadFile(file, 'telemed');
      storageUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    } else {
      // Almacenamiento local (fallback)
      if (!fs.existsSync(this.UPLOAD_DIR)) fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
      const filename = `${Date.now()}_${file.originalname}`;
      const full = path.join(this.UPLOAD_DIR, filename);
      fs.writeFileSync(full, file.buffer);
      storageUrl = `/uploads/${filename}`;
    }

    return this.prisma.files.create({
      data: {
        OwnerUserId: ownerUserId,
        StorageUrl: storageUrl,
        MimeType: file.mimetype,
        SizeBytes: BigInt(file.size),
        Checksum: checksum,
      },
    });
  }

  /**
   * Elimina un archivo de Cloudinary o local
   * @param fileId - ID del archivo en la base de datos
   */
  async delete(fileId: bigint) {
    const file = await this.prisma.files.findUnique({ where: { Id: fileId } });
    if (!file) throw new Error('File not found');

    // Si es un archivo de Cloudinary, extraer el public_id y eliminarlo
    if (file.StorageUrl.includes('cloudinary.com')) {
      // Extraer public_id de la URL
      const urlParts = file.StorageUrl.split('/');
      const publicIdWithExtension = urlParts.slice(-2).join('/'); // folder/filename.ext
      const publicId = publicIdWithExtension.split('.')[0]; // Remover extensión

      await this.cloudinaryService.deleteFile(publicId);
    } else {
      // Eliminar archivo local
      const localPath = path.join(process.cwd(), file.StorageUrl);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    }

    // Eliminar registro de la base de datos
    await this.prisma.files.delete({ where: { Id: fileId } });
  }
}
