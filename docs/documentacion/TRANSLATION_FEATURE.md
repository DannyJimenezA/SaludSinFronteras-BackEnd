# 🌐 Traducción Automática de Mensajes

## Descripción

Esta funcionalidad implementa **traducción automática en tiempo real** de mensajes en las conversaciones entre pacientes y doctores. Cuando un paciente con idioma nativo inglés envía un mensaje, el doctor que habla español recibirá:

1. **El mensaje original en inglés**
2. **La traducción automática al español**

Y viceversa. Esto elimina la barrera del idioma en las consultas médicas de telemedicina.

---

## 🎯 Características Principales

### ✅ Traducción Bidireccional
- Los mensajes se traducen automáticamente al idioma nativo de cada participante
- Se guardan todas las traducciones en la base de datos
- Las traducciones se envían en tiempo real por WebSocket

### ✅ Soporte Multi-idioma
- Inglés ↔ Español
- Español ↔ Francés
- Inglés ↔ Alemán
- Y más de 20 idiomas soportados por LibreTranslate

### ✅ API Gratuita
- Usa **LibreTranslate** (open source)
- Sin costos de traducción
- Opción de self-hosting para mayor privacidad

### ✅ Detección Automática
- Si el usuario no especifica el idioma, el sistema usa su idioma nativo configurado
- Opción de detectar automáticamente el idioma del mensaje

---

## 📋 Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│                    MENSAJERÍA                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. Usuario envía mensaje en su idioma                 │
│     POST /conversations/:id/messages                    │
│     { "Content": "Hello doctor!", "Language": "en" }    │
│                                                         │
│  2. MessagesService traduce el mensaje                  │
│     - Obtiene idiomas de todos los participantes        │
│     - Llama a TranslationService                        │
│     - Guarda traducciones en MessageTranslations        │
│                                                         │
│  3. TranslationService usa LibreTranslate API           │
│     - POST https://libretranslate.com/translate         │
│     - Retorna texto traducido                           │
│                                                         │
│  4. WebSocket emite mensaje con traducciones            │
│     socket.emit('message:new', {                        │
│       Content: "Hello doctor!",                         │
│       Language: "en",                                   │
│       Translations: [                                   │
│         { Language: "es", Content: "¡Hola doctor!" }    │
│       ]                                                 │
│     })                                                  │
│                                                         │
│  5. Clientes reciben mensaje original + traducciones   │
│     - Cada cliente muestra la traducción en su idioma   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Base de Datos

```sql
-- Tabla Messages (mensaje original)
CREATE TABLE Messages (
  Id BIGINT PRIMARY KEY,
  ConversationId BIGINT,
  SenderUserId BIGINT,
  Content LONGTEXT,           -- Texto original
  Language VARCHAR(10),       -- Idioma del mensaje original (ISO 639-1)
  CreatedAt DATETIME
);

-- Tabla MessageTranslations (traducciones)
CREATE TABLE MessageTranslations (
  Id BIGINT PRIMARY KEY,
  MessageId BIGINT,           -- FK a Messages
  Language VARCHAR(10),       -- Idioma de la traducción (ISO 639-1)
  Content LONGTEXT,           -- Texto traducido
  Engine VARCHAR(60),         -- Motor usado (ej: "LibreTranslate")
  Confidence DECIMAL(5,3),    -- Confianza de la traducción (0-1)
  LatencyMs INT,              -- Tiempo de traducción en ms
  IsAuto BOOLEAN,             -- TRUE = traducción automática
  GlossaryApplied BOOLEAN,    -- TRUE = se aplicó glosario médico
  CreatedAt DATETIME,

  UNIQUE(MessageId, Language) -- Un mensaje solo tiene una traducción por idioma
);

-- Tabla NativeLanguages (idiomas nativos de usuarios)
CREATE TABLE NativeLanguages (
  Id BIGINT PRIMARY KEY,
  Code VARCHAR(10) UNIQUE,    -- Código ISO 639-1 (ej: 'en', 'es', 'fr')
  Name VARCHAR(100)           -- Nombre del idioma (ej: 'English', 'Español')
);

-- Relación Users -> NativeLanguages
ALTER TABLE Users ADD COLUMN NativeLanguageId BIGINT;
ALTER TABLE Users ADD FOREIGN KEY (NativeLanguageId) REFERENCES NativeLanguages(Id);
```

---

## 🚀 Uso

### 1. Configurar Idiomas Nativos

Primero, inserta los idiomas soportados:

```sql
INSERT INTO NativeLanguages (Code, Name) VALUES
  ('en', 'English'),
  ('es', 'Español'),
  ('fr', 'Français'),
  ('de', 'Deutsch'),
  ('pt', 'Português'),
  ('it', 'Italiano');
```

### 2. Asignar Idioma Nativo a Usuarios

```sql
-- Paciente con idioma nativo inglés
UPDATE Users
SET NativeLanguageId = (SELECT Id FROM NativeLanguages WHERE Code = 'en')
WHERE Id = 1;

-- Doctor con idioma nativo español
UPDATE Users
SET NativeLanguageId = (SELECT Id FROM NativeLanguages WHERE Code = 'es')
WHERE Id = 2;
```

### 3. Enviar Mensaje con Traducción Automática

**Paciente envía mensaje en inglés:**

```http
POST http://localhost:3000/conversations/1/messages
Authorization: Bearer {patientToken}
Content-Type: application/json

{
  "Content": "Hello doctor! I have a headache.",
  "Language": "en"
}
```

**Respuesta:**

```json
{
  "Id": "123",
  "ConversationId": "1",
  "SenderUserId": "1",
  "Type": "text",
  "Content": "Hello doctor! I have a headache.",
  "Language": "en",
  "CreatedAt": "2025-01-15T10:00:00.000Z"
}
```

**WebSocket emite automáticamente:**

```javascript
socket.on('message:new', (data) => {
  console.log(data);
  // {
  //   Id: "123",
  //   Content: "Hello doctor! I have a headache.",
  //   Language: "en",
  //   Translations: [
  //     {
  //       Language: "es",
  //       Content: "¡Hola doctor! Tengo dolor de cabeza.",
  //       Engine: "LibreTranslate"
  //     }
  //   ]
  // }
});
```

### 4. Consultar Mensajes con Traducciones

**Doctor consulta mensajes (verá traducciones al español):**

```http
GET http://localhost:3000/conversations/1/messages
Authorization: Bearer {doctorToken}
```

**Respuesta:**

```json
[
  {
    "Id": "123",
    "Content": "Hello doctor! I have a headache.",
    "Language": "en",
    "SenderUserId": "1",
    "Translation": "¡Hola doctor! Tengo dolor de cabeza.",
    "TranslationLanguage": "es"
  }
]
```

---

## ⚙️ Configuración

### Variables de Entorno (Opcional)

```bash
# URL de la API de traducción (default: LibreTranslate público)
TRANSLATION_API_URL=https://libretranslate.com/translate

# API Key (opcional, solo si usas una instancia privada)
TRANSLATION_API_KEY=tu-api-key-aqui
```

### Self-Hosting LibreTranslate (Recomendado para Producción)

Para mayor privacidad y sin límites de uso:

```bash
# Usando Docker
docker run -ti --rm -p 5000:5000 libretranslate/libretranslate

# Luego configura en .env
TRANSLATION_API_URL=http://localhost:5000/translate
```

Más info: https://github.com/LibreTranslate/LibreTranslate

---

## 🔧 Personalización

### Agregar Glosario Médico

Para mejorar la precisión de términos médicos, puedes crear un glosario:

```typescript
// En translation.service.ts
private readonly medicalGlossary = {
  'headache': 'dolor de cabeza',
  'migraine': 'migraña',
  'fever': 'fiebre',
  'prescription': 'receta médica',
  // ... más términos
};

async translate(text: string, sourceLang: string, targetLang: string) {
  // Aplicar glosario antes de traducir
  let processedText = text;
  for (const [en, es] of Object.entries(this.medicalGlossary)) {
    processedText = processedText.replace(new RegExp(en, 'gi'), es);
  }

  // ... continuar con traducción normal
}
```

### Usar Otros Proveedores de Traducción

#### Google Cloud Translation API

```typescript
// npm install @google-cloud/translate
import { Translate } from '@google-cloud/translate';

async translate(text: string, sourceLang: string, targetLang: string) {
  const translate = new Translate({ key: process.env.GOOGLE_API_KEY });
  const [translation] = await translate.translate(text, {
    from: sourceLang,
    to: targetLang,
  });
  return translation;
}
```

#### DeepL API (más preciso)

```typescript
// npm install deepl-node
import * as deepl from 'deepl-node';

async translate(text: string, sourceLang: string, targetLang: string) {
  const translator = new deepl.Translator(process.env.DEEPL_API_KEY);
  const result = await translator.translateText(
    text,
    sourceLang,
    targetLang,
  );
  return result.text;
}
```

---

## 📊 Monitoreo

### Logs de Traducción

El servicio registra automáticamente:

```
[TranslationService] Traducción exitosa: en -> es (245ms)
[TranslationService] Traducción exitosa: es -> en (312ms)
[TranslationService] Error al traducir de en a fr: Network timeout
```

### Métricas en Base de Datos

```sql
-- Estadísticas de traducciones
SELECT
  Language,
  COUNT(*) as TotalTranslations,
  AVG(LatencyMs) as AvgLatencyMs,
  AVG(Confidence) as AvgConfidence
FROM MessageTranslations
WHERE IsAuto = 1
GROUP BY Language;

-- Mensajes más traducidos
SELECT
  m.Id,
  m.Content,
  m.Language as OriginalLang,
  COUNT(mt.Id) as TranslationCount
FROM Messages m
LEFT JOIN MessageTranslations mt ON m.Id = mt.MessageId
GROUP BY m.Id
ORDER BY TranslationCount DESC
LIMIT 10;
```

---

## 🧪 Pruebas

### Archivo de Pruebas

Usa el archivo `test-messages-translation.http` para probar todas las funcionalidades:

1. Crear conversación entre paciente (EN) y doctor (ES)
2. Enviar mensaje del paciente en inglés
3. Verificar que el doctor recibe la traducción en español
4. Enviar mensaje del doctor en español
5. Verificar que el paciente recibe la traducción en inglés

### Ejemplo de Prueba Manual

```bash
# 1. Paciente envía mensaje en inglés
curl -X POST http://localhost:3000/conversations/1/messages \
  -H "Authorization: Bearer {patientToken}" \
  -H "Content-Type: application/json" \
  -d '{"Content": "I have a fever", "Language": "en"}'

# 2. Doctor consulta mensajes (verá traducción al español)
curl http://localhost:3000/conversations/1/messages \
  -H "Authorization: Bearer {doctorToken}"

# Resultado esperado:
# [
#   {
#     "Content": "I have a fever",
#     "Language": "en",
#     "Translation": "Tengo fiebre",
#     "TranslationLanguage": "es"
#   }
# ]
```

---

## 🚨 Limitaciones y Consideraciones

### 1. Límites de la API Pública

- LibreTranslate público tiene límites de uso
- Para producción, usa una instancia privada o APIs comerciales

### 2. Precisión de Traducciones

- Las traducciones automáticas no son 100% precisas
- Términos médicos complejos pueden traducirse incorrectamente
- Se recomienda usar glosarios médicos especializados

### 3. Privacidad de Datos

- Al usar APIs externas, los mensajes se envían fuera de tu servidor
- Para cumplir con HIPAA/GDPR, usa self-hosting o APIs con certificaciones

### 4. Latencia

- La traducción puede tomar 200-500ms por mensaje
- Los mensajes se envían primero, la traducción es asíncrona
- Los clientes reciben el mensaje original inmediatamente

---

## 📚 Referencias

- **LibreTranslate**: https://github.com/LibreTranslate/LibreTranslate
- **ISO 639-1 Language Codes**: https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
- **Google Cloud Translation**: https://cloud.google.com/translate
- **DeepL API**: https://www.deepl.com/pro-api
- **Medical Terminology Glossaries**: https://www.who.int/standards/classifications/other-classifications

---

## 🎉 Resultado Final

Con esta implementación, un paciente que solo habla inglés puede comunicarse sin problemas con un doctor que solo habla español, eliminando completamente la barrera del idioma en las consultas médicas de telemedicina.

**Ejemplo de conversación real:**

| Remitente | Mensaje Original | Traducción Recibida |
|-----------|-----------------|---------------------|
| Paciente (EN) | "I have chest pain" | → Doctor ve: "Tengo dolor en el pecho" |
| Doctor (ES) | "¿Desde cuándo tiene el dolor?" | → Paciente ve: "Since when do you have the pain?" |
| Paciente (EN) | "Since this morning" | → Doctor ve: "Desde esta mañana" |

¡Sin barreras de idioma, mejor atención médica! 🌍
