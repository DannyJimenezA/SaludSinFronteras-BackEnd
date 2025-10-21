import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor() {
    // Leer desde variable de entorno (32 bytes = 256 bits)
    const secret = process.env.ENCRYPTION_SECRET || 'default-secret-key-change-me!!';
    // Asegurar que la clave tenga exactamente 32 caracteres
    this.key = Buffer.from(secret.padEnd(32, '0').substring(0, 32));
  }

  /**
   * Cifra un texto con AES-256-CBC
   * @param text - Texto plano a cifrar
   * @returns { encrypted: string, iv: string } - Texto cifrado y IV en formato hex
   */
  encrypt(text: string): { encrypted: string; iv: string } {
    if (!text) {
      throw new Error('El texto a cifrar no puede estar vacío');
    }

    const iv = randomBytes(16); // IV aleatorio de 16 bytes
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted,
      iv: iv.toString('hex'),
    };
  }

  /**
   * Descifra un texto con AES-256-CBC
   * @param encrypted - Texto cifrado en hex
   * @param ivHex - IV en formato hex
   * @returns string - Texto plano descifrado
   */
  decrypt(encrypted: string, ivHex: string): string {
    if (!encrypted || !ivHex) {
      throw new Error('El texto cifrado y el IV son requeridos');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Verifica si el servicio de cifrado está configurado correctamente
   */
  isConfigured(): boolean {
    return process.env.ENCRYPTION_SECRET !== undefined;
  }
}
