# 🔧 Configuración de APIs de Traducción

El sistema soporta múltiples proveedores de traducción. Aquí te explico cómo configurar cada uno.

---

## 📋 APIs Soportadas

### 1. **MyMemory Translation API** (Recomendado - Default)

✅ **Completamente GRATUITA**
✅ **Sin API Key requerida**
✅ **Sin límites estrictos**
✅ **Fácil de usar**
❌ **Calidad media** (adecuada para conversaciones simples)

#### Configuración (.env)

```bash
# MyMemory es el default, no necesitas configurar nada
# Pero si quieres ser explícito:
TRANSLATION_PROVIDER=mymemory
TRANSLATION_API_URL=https://api.mymemory.translated.net/get
```

#### Ejemplo de Request Manual

```bash
curl "https://api.mymemory.translated.net/get?q=Hello%20doctor&langpair=en|es"
```

**Respuesta:**
```json
{
  "responseData": {
    "translatedText": "Hola doctor"
  },
  "responseStatus": 200
}
```

#### Límites
- **1000 palabras/día** sin API key (muy generoso)
- Para más uso, puedes registrarte gratis en https://mymemory.translated.net/doc/

---

### 2. **LibreTranslate** (Mejor calidad)

✅ **Open Source**
✅ **Alta calidad**
✅ **Self-hosting disponible**
❌ **Instancia pública tiene límites estrictos**
❌ **Requiere configuración adicional**

#### Opción A: Usar instancia pública (con límites)

```bash
# .env
TRANSLATION_PROVIDER=libretranslate
TRANSLATION_API_URL=https://libretranslate.com/translate
```

**Límites**: ~10-20 requests/minuto desde la misma IP

#### Opción B: Self-hosting (Recomendado para producción)

**Paso 1: Instalar LibreTranslate con Docker**

```bash
# Opción 1: Docker simple
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate

# Opción 2: Docker con modelos específicos (más rápido)
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate --load-only en,es
```

**Paso 2: Configurar en .env**

```bash
TRANSLATION_PROVIDER=libretranslate
TRANSLATION_API_URL=http://localhost:5000/translate
```

**Paso 3: Verificar**

```bash
curl -X POST http://localhost:5000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "q": "Hello doctor",
    "source": "en",
    "target": "es"
  }'
```

#### Opción C: Usar servicio de LibreTranslate con API Key

Si registras una API key en https://libretranslate.com/:

```bash
TRANSLATION_PROVIDER=libretranslate
TRANSLATION_API_URL=https://libretranslate.com/translate
TRANSLATION_API_KEY=tu-api-key-aqui
```

---

### 3. **Google Cloud Translation API** (Mejor calidad pero de pago)

✅ **Excelente calidad**
✅ **Muy confiable**
❌ **REQUIERE PAGO** ($20/millón de caracteres)
❌ **Requiere configuración de Google Cloud**

#### Paso 1: Instalar SDK

```bash
npm install @google-cloud/translate
```

#### Paso 2: Modificar translation.service.ts

```typescript
import { Translate } from '@google-cloud/translate';

async translate(text: string, sourceLang: string, targetLang: string) {
  const translator = new Translate({
    key: process.env.GOOGLE_API_KEY,
  });

  const [translation] = await translator.translate(text, {
    from: sourceLang,
    to: targetLang,
  });

  return translation;
}
```

#### Paso 3: Configurar en .env

```bash
GOOGLE_API_KEY=tu-google-api-key
```

---

### 4. **DeepL API** (Mejor calidad en general)

✅ **Mejor calidad de traducción**
✅ **Especializado en idiomas europeos**
❌ **REQUIERE PAGO** (tiene tier gratuito limitado)
❌ **Requiere registro**

#### Paso 1: Instalar SDK

```bash
npm install deepl-node
```

#### Paso 2: Modificar translation.service.ts

```typescript
import * as deepl from 'deepl-node';

async translate(text: string, sourceLang: string, targetLang: string) {
  const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

  const result = await translator.translateText(
    text,
    sourceLang as deepl.SourceLanguageCode,
    targetLang as deepl.TargetLanguageCode,
  );

  return result.text;
}
```

#### Paso 3: Configurar en .env

```bash
DEEPL_API_KEY=tu-deepl-api-key
```

**Tier gratuito**: 500,000 caracteres/mes
**Registrarse**: https://www.deepl.com/pro-api

---

## 🎯 ¿Cuál Elegir?

### Para Desarrollo y Testing
→ **MyMemory** (default, ya configurado)

### Para Producción con Presupuesto Limitado
→ **LibreTranslate Self-hosted** (instalar en tu servidor)

### Para Producción con Alta Calidad
→ **DeepL API** (mejor calidad-precio)

### Para Empresa con Presupuesto
→ **Google Cloud Translation API** (más confiable)

---

## 📊 Comparación de Calidad

Ejemplo: "I have been experiencing severe headaches for the past 3 days."

| API | Traducción al Español |
|-----|----------------------|
| **MyMemory** | "He estado experimentando dolores de cabeza severos durante los últimos 3 días." ⭐⭐⭐ |
| **LibreTranslate** | "He estado experimentando fuertes dolores de cabeza durante los últimos 3 días." ⭐⭐⭐⭐ |
| **Google Translate** | "He estado experimentando dolores de cabeza intensos durante los últimos 3 días." ⭐⭐⭐⭐⭐ |
| **DeepL** | "Llevo 3 días con fuertes dolores de cabeza." ⭐⭐⭐⭐⭐ |

---

## 🔍 Troubleshooting

### Error 400: Bad Request (LibreTranslate)

**Causa**: Instancia pública sobrecargada o formato incorrecto

**Solución 1**: Cambiar a MyMemory (más confiable)
```bash
TRANSLATION_PROVIDER=mymemory
```

**Solución 2**: Instalar LibreTranslate localmente
```bash
docker run -p 5000:5000 libretranslate/libretranslate
TRANSLATION_API_URL=http://localhost:5000/translate
```

### Error 429: Too Many Requests

**Causa**: Límite de requests excedido

**Solución**: Usar self-hosting o API comercial

### Traducciones de Baja Calidad

**Solución**: Implementar glosario médico

```typescript
// En translation.service.ts
private medicalTerms = {
  'headache': 'dolor de cabeza',
  'migraine': 'migraña',
  'fever': 'fiebre',
  'prescription': 'receta médica',
  // ... más términos
};

// Aplicar antes de traducir
async translate(text: string, sourceLang: string, targetLang: string) {
  let processedText = this.applyGlossary(text, sourceLang, targetLang);
  // ... continuar con traducción
}
```

---

## 🚀 Instalación Rápida de LibreTranslate (Recomendado)

Si quieres la mejor solución gratuita:

### Con Docker (Más fácil)

```bash
# 1. Instalar LibreTranslate
docker run -d \
  --name libretranslate \
  -p 5000:5000 \
  --restart unless-stopped \
  libretranslate/libretranslate \
  --load-only en,es,fr,de,pt

# 2. Configurar en .env
echo "TRANSLATION_PROVIDER=libretranslate" >> .env
echo "TRANSLATION_API_URL=http://localhost:5000/translate" >> .env

# 3. Reiniciar el servidor NestJS
npm run start:dev
```

### Con Python (Sin Docker)

```bash
# 1. Instalar LibreTranslate
pip install libretranslate

# 2. Ejecutar servidor
libretranslate --host 0.0.0.0 --port 5000 --load-only en,es

# 3. Configurar en .env (igual que arriba)
```

### Verificar Instalación

```bash
# Test rápido
curl -X POST http://localhost:5000/translate \
  -H "Content-Type: application/json" \
  -d '{"q": "Hello", "source": "en", "target": "es"}'

# Debería retornar: {"translatedText": "Hola"}
```

---

## 📝 Resumen de Configuración

```bash
# .env

# OPCIÓN 1: MyMemory (Default - Ya configurado)
# No necesitas configurar nada, ya funciona

# OPCIÓN 2: LibreTranslate Self-hosted
TRANSLATION_PROVIDER=libretranslate
TRANSLATION_API_URL=http://localhost:5000/translate

# OPCIÓN 3: Google Cloud Translation
GOOGLE_API_KEY=tu-google-api-key

# OPCIÓN 4: DeepL API
DEEPL_API_KEY=tu-deepl-api-key
```

---

## ✅ Verificar Funcionamiento

Después de configurar, prueba con:

```http
POST http://localhost:3000/conversations/1/messages
Authorization: Bearer {token}
Content-Type: application/json

{
  "Content": "Hello doctor! How are you?",
  "Language": "en"
}
```

Verifica en los logs del servidor:

```
[TranslationService] Traduciendo con mymemory: "Hello doctor! How are you?..." (en -> es)
[TranslationService] Traducción exitosa [mymemory]: en -> es (234ms)
```

---

**Mi Recomendación Personal:**

1. **Para empezar**: Usa **MyMemory** (ya configurado, funciona out-of-the-box)
2. **Para producción**: Instala **LibreTranslate con Docker** (toma 5 minutos)
3. **Para mejor calidad**: Usa **DeepL** con el tier gratuito (500k caracteres/mes)
