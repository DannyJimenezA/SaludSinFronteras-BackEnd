# Configuración de Cloudinary

## Pasos para configurar Cloudinary

### 1. Crear cuenta en Cloudinary

1. Ve a [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Crea una cuenta gratuita
3. Verifica tu correo electrónico

### 2. Obtener credenciales

1. Inicia sesión en [https://cloudinary.com/console](https://cloudinary.com/console)
2. En el Dashboard, encontrarás:
   - **Cloud Name** (Nombre de la nube)
   - **API Key** (Clave API)
   - **API Secret** (Secreto API)

### 3. Configurar variables de entorno

Actualiza tu archivo `.env` con las credenciales:

```env
# ===========================================
# CLOUDINARY (Almacenamiento de Archivos)
# ===========================================
CLOUDINARY_CLOUD_NAME=tu-cloud-name-real
CLOUDINARY_API_KEY=tu-api-key-real
CLOUDINARY_API_SECRET=tu-api-secret-real
```

**IMPORTANTE:** Reemplaza los valores de ejemplo con tus credenciales reales.

### 4. Reiniciar el servidor

```bash
# Detén el servidor actual (Ctrl+C)
# Reinicia:
npm run start:dev
```

## Funcionamiento

- **Si Cloudinary está configurado:** Los archivos se subirán automáticamente a Cloudinary
- **Si Cloudinary NO está configurado:** Los archivos se guardarán localmente en la carpeta `uploads/` (modo fallback)

## Ventajas de usar Cloudinary

✅ Almacenamiento en la nube (no usa espacio en tu servidor)
✅ CDN global (carga rápida desde cualquier parte del mundo)
✅ Transformaciones automáticas de imágenes
✅ Optimización automática de archivos
✅ 25 GB de almacenamiento gratis
✅ Backups automáticos

## Verificar que funciona

1. Sube un archivo a través de tu aplicación
2. Verifica en la base de datos que el campo `StorageUrl` contiene una URL de Cloudinary (ej: `https://res.cloudinary.com/...`)
3. Abre la URL en el navegador para ver el archivo

## Migrar archivos locales existentes (opcional)

Si ya tienes archivos en la carpeta `uploads/` y quieres migrarlos a Cloudinary, puedes crear un script de migración.
