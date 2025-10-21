# Ejemplo de Prueba de Subida de Archivos a Cloudinary

## Opción 1: Usando Postman (Recomendado - Más fácil)

### Paso 1: Login
1. Crea una nueva petición en Postman
2. Método: **POST**
3. URL: `http://localhost:3000/auth/login`
4. Headers:
   ```
   Content-Type: application/json
   ```
5. Body (raw - JSON):
   ```json
   {
     "Email": "paciente@telemedicina.com",
     "Password": "password123"
   }
   ```
6. Click en **Send**
7. **Copia el `access_token` de la respuesta**

### Paso 2: Subir archivo
1. Crea una nueva petición en Postman
2. Método: **POST**
3. URL: `http://localhost:3000/conversations/1/messages/upload`
   - **Nota:** Cambia el `1` por el ID de una conversación real que exista en tu base de datos
4. Headers:
   ```
   Authorization: Bearer TU_ACCESS_TOKEN_AQUI
   ```
   (Reemplaza `TU_ACCESS_TOKEN_AQUI` con el token que copiaste)
5. Body:
   - Selecciona **form-data**
   - Agrega un campo:
     - Key: `file` (asegúrate de seleccionar **File** en el dropdown)
     - Value: Click en "Select Files" y elige una imagen o PDF de tu computadora
6. Click en **Send**

### Resultado esperado:

**Si Cloudinary está configurado:**
```json
{
  "Id": "123",
  "ConversationId": "1",
  "SenderUserId": "20",
  "Type": "text",
  "Content": "https://res.cloudinary.com/tu-cloud-name/image/upload/v1234567890/telemed/1234567890_imagen.jpg",
  "CreatedAt": "2025-10-21T04:00:00.000Z"
}
```
✅ La URL empieza con `https://res.cloudinary.com/...`

**Si Cloudinary NO está configurado (almacenamiento local):**
```json
{
  "Id": "123",
  "ConversationId": "1",
  "SenderUserId": "20",
  "Type": "text",
  "Content": "/uploads/1234567890_imagen.jpg",
  "CreatedAt": "2025-10-21T04:00:00.000Z"
}
```
⚠️ La URL es una ruta local `/uploads/...`

---

## Opción 2: Usando cURL (Línea de comandos)

### Paso 1: Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "Email": "paciente@telemedicina.com",
    "Password": "password123"
  }'
```

**Copia el `access_token` de la respuesta**

### Paso 2: Subir archivo
```bash
curl -X POST http://localhost:3000/conversations/1/messages/upload \
  -H "Authorization: Bearer TU_ACCESS_TOKEN_AQUI" \
  -F "file=@ruta/a/tu/imagen.jpg"
```

**Ejemplo con ruta completa:**
```bash
curl -X POST http://localhost:3000/conversations/1/messages/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@C:/Users/tu-usuario/Desktop/imagen.jpg"
```

---

## Opción 3: Crear un endpoint de prueba simple

Si quieres un endpoint más simple solo para probar, puedo crear uno que no requiera conversación.

### Endpoint de prueba (lo puedo crear):
```
POST /files/test-upload
```

Este endpoint solo subiría el archivo y devolvería la URL, sin necesidad de tener una conversación.

---

## Verificar en Cloudinary Dashboard

1. Ve a tu Dashboard de Cloudinary: https://cloudinary.com/console
2. Click en "Media Library" en el menú lateral
3. Deberías ver tus archivos subidos en la carpeta `telemed/`

---

## Troubleshooting

### Error: "Cannot POST /conversations/1/messages/upload"
- Verifica que la conversación con ID=1 exista en tu base de datos
- O cambia el `1` por un ID de conversación válido

### Error: "Unauthorized"
- Verifica que el token esté correctamente copiado
- El token expira en 15 minutos, vuelve a hacer login si es necesario

### Los archivos se guardan localmente (no en Cloudinary)
- Verifica que las credenciales en `.env` sean correctas
- Verifica que `CLOUDINARY_CLOUD_NAME` no sea "tu-cloud-name"
- Reinicia el servidor después de cambiar el `.env`

---

## ¿Quieres un endpoint más simple para probar?

Si prefieres un endpoint dedicado solo para pruebas, puedo crear:
```
POST /upload/test
```
Que no requiera conversación y solo devuelva la URL del archivo subido.

¿Te gustaría que lo cree?
