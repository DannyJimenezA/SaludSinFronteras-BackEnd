# Guía de Configuración - Sistema de Usuarios Mejorado

Esta guía te ayudará a configurar y utilizar el nuevo sistema de usuarios con verificación de email y recuperación de contraseña.

## Cambios Implementados

### 1. Nuevos Campos en la Tabla Users

Se han agregado los siguientes campos al modelo de usuarios:

- **IdentificationTypeId** (BigInt, opcional): Referencia al tipo de identificación
- **Identification** (String, opcional): Número de identificación
- **FirstName** (String, requerido): Primer nombre
- **LastName1** (String, requerido): Primer apellido
- **LastName2** (String, opcional): Segundo apellido
- **GenderId** (BigInt, opcional): Referencia al género
- **DateOfBirth** (DateTime, opcional): Fecha de nacimiento
- **NativeLanguageId** (BigInt, opcional): Referencia al idioma nativo
- **Phone** (String, opcional): Teléfono
- **NationalityId** (BigInt, opcional): Referencia a la nacionalidad
- **ResidenceCountryId** (BigInt, opcional): Referencia al país de residencia
- **Email** (String, requerido, único): Correo electrónico
- **IsActive** (Boolean, default: false): Estado de activación de la cuenta
- **Role** (String, requerido): Rol del usuario (ADMIN, DOCTOR, PATIENT)

### 2. Tablas de Catálogos Creadas

- **IdentificationTypes**: Tipos de identificación (DNI, Pasaporte, etc.)
- **Genders**: Géneros disponibles
- **NativeLanguages**: Idiomas nativos
- **Nationalities**: Nacionalidades
- **ResidenceCountries**: Países de residencia

### 3. Tabla UsersAuth Actualizada

Se agregaron los siguientes campos:

- **EmailVerificationToken** (String, opcional): Token para verificación de email
- **EmailVerifiedAt** (DateTime, opcional): Fecha de verificación del email
- **PasswordResetToken** (String, opcional): Token para reseteo de contraseña
- **PasswordResetExpiry** (DateTime, opcional): Fecha de expiración del token de reseteo

### 4. Nuevos Endpoints de API

#### Registro de Usuario
```
POST /auth/register
Content-Type: application/json

{
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "LastName2": "García", // Opcional
  "Email": "juan.perez@example.com",
  "Password": "password123",
  "PasswordConfirm": "password123", // REQUERIDO - debe coincidir con Password
  "Phone": "+506 8888-8888", // Opcional
  "IdentificationTypeId": 1, // Opcional
  "Identification": "123456789", // Opcional
  "GenderId": 1, // Opcional
  "DateOfBirth": "1990-01-15", // Opcional
  "NativeLanguageId": 1, // Opcional
  "NationalityId": 1, // Opcional
  "ResidenceCountryId": 1, // Opcional
  "Role": "PATIENT" // Opcional, por defecto PATIENT
}
```

**Respuesta:**
```json
{
  "message": "Usuario registrado. Por favor verifica tu correo electrónico para activar tu cuenta.",
  "email": "juan.perez@example.com"
}
```

#### Verificar Email
```
POST /auth/verify-email
Content-Type: application/json

{
  "token": "token-recibido-por-email"
}
```

**Respuesta:**
```json
{
  "message": "Cuenta activada exitosamente. Ya puedes iniciar sesión."
}
```

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "Email": "juan.perez@example.com",
  "Password": "password123"
}
```

**Respuesta (solo si la cuenta está activada):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Recuperación de Contraseña (Solicitud)
```
POST /auth/forgot-password
Content-Type: application/json

{
  "Email": "juan.perez@example.com"
}
```

**Respuesta:**
```json
{
  "message": "Si el correo existe, recibirás instrucciones para restablecer tu contraseña."
}
```

#### Resetear Contraseña
```
POST /auth/reset-password
Content-Type: application/json

{
  "token": "token-recibido-por-email",
  "newPassword": "nuevaPassword123"
}
```

**Respuesta:**
```json
{
  "message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
}
```

## Configuración Requerida

### 1. Configuración de Variables de Entorno

Actualiza tu archivo `.env` con las siguientes variables:

```env
# Configuración SMTP de Gmail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu-email@gmail.com
MAIL_PASSWORD=tu-app-password-de-gmail
MAIL_FROM=tu-email@gmail.com

# URL del Frontend (para enlaces en correos)
FRONTEND_URL=http://localhost:4200
```

### 2. Configurar App Password de Gmail

Para usar Gmail SMTP necesitas crear una "App Password":

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Navega a "Seguridad"
3. En "Iniciar sesión en Google", habilita la "Verificación en dos pasos" si no está habilitada
4. Busca "Contraseñas de aplicaciones" (App Passwords)
5. Genera una nueva contraseña de aplicación para "Correo"
6. Copia la contraseña generada (16 caracteres sin espacios)
7. Usa esta contraseña en la variable `MAIL_PASSWORD` de tu `.env`

**IMPORTANTE:** Nunca uses tu contraseña real de Gmail, siempre usa App Password.

### 3. Ejecutar Migración de Base de Datos

Ejecuta el script SQL de migración:

```bash
# Opción 1: Usar MySQL CLI
mysql -u root -p railway < migrations/001_update_users_structure.sql

# Opción 2: Usar herramienta GUI (MySQL Workbench, phpMyAdmin, etc.)
# Abre el archivo migrations/001_update_users_structure.sql
# Y ejecuta el script completo
```

### 4. Generar Cliente de Prisma

```bash
npx prisma generate
```

### 5. Iniciar la Aplicación

```bash
npm run start:dev
```

## Funcionalidades Implementadas

### 1. Verificación de Email Obligatoria

- Al registrarse, el usuario recibe un correo con un enlace de activación
- La cuenta permanece inactiva (`IsActive = false`) hasta que se verifique el email
- No se puede hacer login con una cuenta no verificada
- El enlace de verificación es válido por 15 minutos

### 2. Eliminación Automática de Cuentas No Verificadas

- Cada 5 minutos, un proceso automático elimina cuentas no verificadas creadas hace más de 15 minutos
- Esto mantiene la base de datos limpia de registros incompletos
- Los usuarios que no activen su cuenta a tiempo deben registrarse nuevamente

### 3. Recuperación de Contraseña

- El usuario solicita reseteo de contraseña ingresando su email
- Recibe un correo con enlace para crear nueva contraseña
- El enlace expira en 1 hora por seguridad
- Solo se puede usar el token una vez

### 4. Correos HTML Profesionales

Todos los correos incluyen:
- Diseño HTML responsivo
- Branding de TeleMed
- Botones claros de acción
- Instrucciones detalladas
- Enlaces alternativos por si los botones no funcionan

## Flujo de Registro Completo

1. **Usuario se registra** → POST `/auth/register`
   - Se crea usuario con `IsActive = false`
   - Se genera token de verificación
   - Se envía correo de verificación

2. **Usuario recibe correo**
   - Contiene enlace: `{FRONTEND_URL}/verify-email?token=xxx`

3. **Usuario hace clic en enlace**
   - Frontend llama a POST `/auth/verify-email` con el token
   - Backend valida token y activa cuenta
   - Se envía correo de bienvenida

4. **Usuario puede hacer login** → POST `/auth/login`
   - Ahora que `IsActive = true`, puede autenticarse

## Flujo de Recuperación de Contraseña

1. **Usuario olvida contraseña** → POST `/auth/forgot-password`
   - Backend genera token de reseteo
   - Envía correo con enlace

2. **Usuario recibe correo**
   - Contiene enlace: `{FRONTEND_URL}/reset-password?token=xxx`

3. **Usuario ingresa nueva contraseña**
   - Frontend llama a POST `/auth/reset-password`
   - Backend valida token (no expirado)
   - Actualiza contraseña

4. **Usuario puede hacer login** con nueva contraseña

## Consideraciones de Seguridad

1. **Tokens únicos**: Cada token de verificación/reseteo es único (32 bytes random)
2. **Expiración**:
   - Verificación de email: 15 minutos
   - Reseteo de contraseña: 1 hora
3. **Uso único**: Los tokens se eliminan después de usarse
4. **Hashing de contraseñas**: Se usa bcrypt con salt de 10 rounds
5. **No revelación de emails**: El endpoint de forgot-password no revela si un email existe

## Pruebas Recomendadas

### Probar Registro y Verificación

```bash
# 1. Registrar usuario
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "FirstName": "Test",
    "LastName1": "User",
    "Email": "test@example.com",
    "Password": "password123"
  }'

# 2. Revisar email y copiar token

# 3. Verificar email
curl -X POST http://localhost:3000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_AQUI"
  }'

# 4. Hacer login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "Email": "test@example.com",
    "Password": "password123"
  }'
```

### Probar Recuperación de Contraseña

```bash
# 1. Solicitar reseteo
curl -X POST http://localhost:3000/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "Email": "test@example.com"
  }'

# 2. Revisar email y copiar token

# 3. Resetear contraseña
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "TOKEN_AQUI",
    "newPassword": "nuevaPassword456"
  }'

# 4. Hacer login con nueva contraseña
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "Email": "test@example.com",
    "Password": "nuevaPassword456"
  }'
```

## Troubleshooting

### Los correos no se envían

1. Verifica que `MAIL_USER` y `MAIL_PASSWORD` sean correctos
2. Asegúrate de usar App Password, no tu contraseña de Gmail
3. Verifica que la verificación en dos pasos esté habilitada en Google
4. Revisa los logs del servidor para errores SMTP

### Error: "Cuenta no activada"

- El usuario debe verificar su email primero
- Revisa si el correo llegó a spam
- Puede solicitar un nuevo registro si pasaron más de 15 minutos

### Base de datos no actualizada

- Ejecuta el script de migración: `migrations/001_update_users_structure.sql`
- Ejecuta `npx prisma generate` después de aplicar la migración

## Próximos Pasos (Opcional)

- Agregar rate limiting para prevenir spam de emails
- Implementar reenvío de correo de verificación
- Agregar autenticación de dos factores (2FA)
- Implementar OAuth (Google, Facebook, etc.)
- Agregar logs de auditoría para cambios de contraseña

## Soporte

Si encuentras algún problema, revisa:
1. Los logs del servidor
2. Las variables de entorno en `.env`
3. Que la migración SQL se haya ejecutado correctamente
4. Que las dependencias estén instaladas (`npm install`)
