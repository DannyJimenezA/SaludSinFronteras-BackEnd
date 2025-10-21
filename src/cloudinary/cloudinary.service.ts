// src/cloudinary/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor() {
    // Configurar Cloudinary con las credenciales del .env
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Sube un archivo a Cloudinary desde un buffer
   * @param file - Archivo de Multer con buffer
   * @param folder - Carpeta en Cloudinary (opcional)
   * @returns URL pública del archivo
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'telemed',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto', // Detecta automáticamente el tipo (imagen, video, pdf, etc.)
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Elimina un archivo de Cloudinary
   * @param publicId - ID público del archivo en Cloudinary
   */
  async deleteFile(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  /**
   * Obtiene información de un archivo
   * @param publicId - ID público del archivo
   */
  async getFileInfo(publicId: string): Promise<any> {
    return cloudinary.api.resource(publicId);
  }
}
