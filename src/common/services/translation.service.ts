import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * TranslationService - Servicio de traducción automática
 *
 * Usa LibreTranslate (API gratuita y de código abierto) para traducir mensajes.
 * Fallback: Si la API falla, retorna null y el mensaje se envía sin traducción.
 *
 * IMPORTANTE: Usa instancia pública gratuita. Para producción, considera:
 * - Self-hosting LibreTranslate
 * - Usar Google Cloud Translation API
 * - Usar DeepL API (más preciso pero de pago)
 */
@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  // API de traducción (default: MyMemory - completamente gratuita)
  // Alternativas:
  // - LibreTranslate: https://libretranslate.com/translate
  // - Google Translate (no oficial): https://translate.googleapis.com/translate_a/single
  private readonly apiUrl = process.env.TRANSLATION_API_URL || 'https://api.mymemory.translated.net/get';
  private readonly apiKey = process.env.TRANSLATION_API_KEY || null;
  private readonly provider = process.env.TRANSLATION_PROVIDER || 'mymemory'; // 'mymemory' | 'libretranslate'

  /**
   * Traduce un texto de un idioma a otro
   *
   * @param text - Texto a traducir
   * @param sourceLang - Código ISO 639-1 del idioma origen (ej: 'en', 'es', 'fr')
   * @param targetLang - Código ISO 639-1 del idioma destino
   * @returns Texto traducido o null si falla
   */
  async translate(
    text: string,
    sourceLang: string,
    targetLang: string,
  ): Promise<string | null> {
    // Si los idiomas son iguales, no traducir
    if (sourceLang === targetLang) {
      return null;
    }

    // Si el texto está vacío, no traducir
    if (!text || text.trim().length === 0) {
      return null;
    }

    try {
      const startTime = Date.now();

      this.logger.debug(
        `Traduciendo con ${this.provider}: "${text.substring(0, 50)}..." (${sourceLang} -> ${targetLang})`,
      );

      let translatedText: string;

      if (this.provider === 'mymemory') {
        // MyMemory Translation API (completamente gratuita)
        const response = await axios.get(this.apiUrl, {
          params: {
            q: text,
            langpair: `${sourceLang}|${targetLang}`,
          },
          timeout: 10000,
        });

        if (response.data.responseStatus !== 200) {
          throw new Error(response.data.responseDetails || 'Translation failed');
        }

        translatedText = response.data.responseData.translatedText;
      } else {
        // LibreTranslate (requiere instancia propia o API key)
        const payload: any = {
          q: text,
          source: sourceLang,
          target: targetLang,
          format: 'text',
        };

        if (this.apiKey) {
          payload.api_key = this.apiKey;
        }

        const response = await axios.post(this.apiUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });

        translatedText = response.data.translatedText;
      }

      const latencyMs = Date.now() - startTime;

      this.logger.log(
        `Traducción exitosa [${this.provider}]: ${sourceLang} -> ${targetLang} (${latencyMs}ms)`,
      );

      return translatedText;
    } catch (error) {
      // Log detallado del error
      if (error.response) {
        this.logger.error(
          `Error al traducir de ${sourceLang} a ${targetLang}: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      } else {
        this.logger.error(
          `Error al traducir de ${sourceLang} a ${targetLang}: ${error.message}`,
        );
      }
      return null; // Retornar null en caso de error, no lanzar excepción
    }
  }

  /**
   * Detecta automáticamente el idioma de un texto
   *
   * @param text - Texto a analizar
   * @returns Código ISO 639-1 del idioma detectado o null si falla
   */
  async detectLanguage(text: string): Promise<string | null> {
    if (!text || text.trim().length === 0) {
      return null;
    }

    try {
      const response = await axios.post(
        this.apiUrl.replace('/translate', '/detect'),
        {
          q: text,
          api_key: this.apiKey,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000,
        },
      );

      const detectedLang = response.data[0]?.language;
      this.logger.log(`Idioma detectado: ${detectedLang}`);

      return detectedLang || null;
    } catch (error) {
      this.logger.error(`Error al detectar idioma: ${error.message}`);
      return null;
    }
  }

  /**
   * Traduce un mensaje a múltiples idiomas de los participantes de una conversación
   *
   * @param text - Texto a traducir
   * @param sourceLang - Idioma del mensaje original
   * @param targetLanguages - Lista de idiomas destino de los participantes
   * @returns Map con traducciones { 'es': 'Hola', 'fr': 'Bonjour', ... }
   */
  async translateToMultiple(
    text: string,
    sourceLang: string,
    targetLanguages: string[],
  ): Promise<Map<string, string>> {
    const translations = new Map<string, string>();

    // Filtrar idiomas únicos y diferentes al origen
    const uniqueTargets = Array.from(
      new Set(targetLanguages.filter((lang) => lang !== sourceLang)),
    );

    // Traducir en paralelo a todos los idiomas
    await Promise.all(
      uniqueTargets.map(async (targetLang) => {
        const translated = await this.translate(text, sourceLang, targetLang);
        if (translated) {
          translations.set(targetLang, translated);
        }
      }),
    );

    return translations;
  }

  /**
   * Mapeo de códigos de idioma de la BD a códigos ISO 639-1
   * Ajusta según los códigos que uses en tu tabla NativeLanguages
   */
  normalizeLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'es': 'es',    // Español
      'en': 'en',    // Inglés
      'fr': 'fr',    // Francés
      'de': 'de',    // Alemán
      'pt': 'pt',    // Portugués
      'it': 'it',    // Italiano
      'zh': 'zh',    // Chino
      'ja': 'ja',    // Japonés
      'ko': 'ko',    // Coreano
      'ar': 'ar',    // Árabe
      'ru': 'ru',    // Ruso
      'hi': 'hi',    // Hindi
      'es-CR': 'es', // Español Costa Rica
      'en-US': 'en', // Inglés USA
      'en-GB': 'en', // Inglés UK
    };

    return mapping[code] || code;
  }
}
