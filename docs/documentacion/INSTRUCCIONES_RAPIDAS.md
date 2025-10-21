# Instrucciones Rápidas - Sistema de Usuarios

## Lo que se ha implementado

1. **Nueva estructura de usuarios** con campos individuales (FirstName, LastName1, LastName2, etc.)
2. **Tablas de catálogos** creadas en la base de datos
3. **Verificación de email obligatoria** con correos HTML profesionales
4. **Eliminación automática** de cuentas no verificadas después de 15 minutos
5. **Recuperación de contraseña** con tokens seguros
6. **Confirmación de contraseña** en el registro

## IMPORTANTE: Configuración Previa

### 1. Configurar Gmail SMTP en .env

Abre el archivo `.env` y configura estos valores:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=tu-email@gmail.com
MAIL_PASSWORD=tu-app-password-aqui
MAIL_FROM=tu-email@gmail.com
FRONTEND_URL=http://localhost:4200
```

### 2. Obtener App Password de Gmail

**IMPORTANTE:** No uses tu contraseña real de Gmail. Debes crear una "App Password":

1. Ve a https://myaccount.google.com/
2. Click en "Seguridad"
3. Habilita "Verificación en dos pasos" si no está habilitada
4. Busca "Contraseñas de aplicaciones" (App Passwords)
5. Genera una nueva contraseña para "Correo"
6. Copia la contraseña de 16 caracteres
7. Pégala en `MAIL_PASSWORD` en tu `.env`

### 3. La base de datos YA está actualizada

Los cambios ya fueron aplicados con `prisma db push`. No necesitas ejecutar migraciones adicionales.

## Cómo Probar el Registro

### Opción 1: Usando Thunder Client / Postman / Insomnia

```http
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "LastName2": "García",
  "Email": "tu-email-de-prueba@gmail.com",
  "Password": "password123",
  "PasswordConfirm": "password123",
  "Phone": "+506 8888-8888",
  "IdentificationTypeId": 1,
  "Identification": "123456789",
  "GenderId": 1,
  "DateOfBirth": "1990-01-15",
  "NativeLanguageId": 1,
  "NationalityId": 1,
  "ResidenceCountryId": 1
}
```

**IMPORTANTE:** Solo `FirstName`, `LastName1`, `Email`, `Password` y `PasswordConfirm` son obligatorios. Los demás campos son opcionales.

### Opción 2: Usando curl

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "FirstName": "Juan",
    "LastName1": "Pérez",
    "Email": "tu-email@gmail.com",
    "Password": "password123",
    "PasswordConfirm": "password123"
  }'
```

## Qué esperar después del registro

1. **Respuesta inmediata:**
   ```json
   {
     "message": "Usuario registrado. Por favor verifica tu correo electrónico para activar tu cuenta.",
     "email": "tu-email@gmail.com"
   }
   ```

2. **Revisa tu correo:**
   - Recibirás un email con asunto "Activa tu cuenta - TeleMed"
   - El correo tiene diseño HTML profesional
   - Contiene un botón "Activar Cuenta"

3. **Activa tu cuenta:**
   - Haz click en el botón del correo
   - O copia el token del URL y llama a:
   ```http
   POST http://localhost:3000/auth/verify-email
   Content-Type: application/json

   {
     "token": "el-token-del-correo"
   }
   ```

4. **Correo de bienvenida:**
   - Después de activar, recibirás un segundo correo de bienvenida

5. **Ya puedes hacer login:**
   ```http
   POST http://localhost:3000/auth/login
   Content-Type: application/json

   {
     "Email": "tu-email@gmail.com",
     "Password": "password123"
   }
   ```

## Validaciones Implementadas

El sistema valida:
- ✅ Email no registrado previamente
- ✅ Password y PasswordConfirm coinciden
- ✅ FirstName no está vacío
- ✅ LastName1 no está vacío
- ✅ Email tiene formato válido
- ✅ Password tiene mínimo 8 caracteres
- ✅ Cuenta debe estar activada para hacer login

## Errores Comunes y Soluciones

### Error: "Las contraseñas no coinciden"
**Solución:** Asegúrate que `Password` y `PasswordConfirm` sean exactamente iguales.

### Error: "El nombre es requerido"
**Solución:** Debes enviar `FirstName` en el request.

### Error: "El primer apellido es requerido"
**Solución:** Debes enviar `LastName1` en el request.

### Error: "Email ya registrado"
**Solución:** Usa otro email o elimina el usuario existente de la base de datos.

### Error: "Cuenta no activada"
**Solución:** Verifica tu correo y activa la cuenta antes de hacer login.

### No llegan los correos
**Soluciones:**
1. Verifica que `MAIL_USER` y `MAIL_PASSWORD` en `.env` sean correctos
2. Asegúrate de usar App Password de Gmail, no tu contraseña real
3. Verifica que la verificación en dos pasos esté habilitada en tu cuenta de Google
4. Revisa la carpeta de spam
5. Mira los logs del servidor para ver errores SMTP

### Error de Prisma al iniciar
**Solución:**
```bash
npx prisma generate
npm run start:dev
```

## Endpoints Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registrar nuevo usuario |
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/verify-email` | Verificar email con token |
| POST | `/auth/forgot-password` | Solicitar recuperación de contraseña |
| POST | `/auth/reset-password` | Resetear contraseña con token |
| POST | `/auth/refresh` | Refrescar access token |

## Catálogos Disponibles

Los siguientes catálogos ya están en la base de datos:

### IdentificationTypes (Tipos de Identificación)
- ID 1: DNI
- ID 2: PASSPORT
- ID 3: ID_CARD
- ID 4: FOREIGN_ID
- ID 5: OTHER

### Genders (Géneros)
- ID 1: Masculino (M)
- ID 2: Femenino (F)
- ID 3: Otro (OTHER)
- ID 4: Prefiero no decir (PREFER_NOT_SAY)

### NativeLanguages (Lenguas Nativas)
- ID 1: Español (es)
- ID 2: Inglés (en)
- ID 3: Francés (fr)
- ID 4: Portugués (pt)
- Y más...

### Nationalities / ResidenceCountries
- ID 1: Costarricense (CR)
- ID 2: Estadounidense (US)
- ID 3: Mexicana (MX)
- ID 4: Española (ES)
- Y más...

## Siguiente Paso: Integrar con el Frontend

El frontend necesita:

1. **Formulario de registro** con:
   - FirstName (requerido)
   - LastName1 (requerido)
   - LastName2 (opcional)
   - Email (requerido)
   - Password (requerido, mínimo 8 caracteres)
   - PasswordConfirm (requerido, debe coincidir)
   - Campos opcionales adicionales

2. **Página de verificación de email** que:
   - Reciba el token del query string: `/verify-email?token=xxx`
   - Llame a POST `/auth/verify-email` con el token
   - Muestre mensaje de éxito
   - Redirija a login

3. **Formulario de login** que valide:
   - Cuenta activada
   - Credenciales correctas

4. **Formularios de recuperación de contraseña**:
   - Página para solicitar: POST `/auth/forgot-password`
   - Página para resetear: POST `/auth/reset-password`

## Testing Completo

```bash
# 1. Registrar usuario
POST /auth/register
{
  "FirstName": "Test",
  "LastName1": "User",
  "Email": "test@example.com",
  "Password": "test1234",
  "PasswordConfirm": "test1234"
}

# 2. Revisar correo y copiar token

# 3. Verificar email
POST /auth/verify-email
{
  "token": "TOKEN_DEL_CORREO"
}

# 4. Login
POST /auth/login
{
  "Email": "test@example.com",
  "Password": "test1234"
}

# 5. Probar recuperación de contraseña
POST /auth/forgot-password
{
  "Email": "test@example.com"
}

# 6. Revisar correo y copiar token de reseteo

# 7. Resetear contraseña
POST /auth/reset-password
{
  "token": "TOKEN_DEL_CORREO",
  "newPassword": "newpass123"
}

# 8. Login con nueva contraseña
POST /auth/login
{
  "Email": "test@example.com",
  "Password": "newpass123"
}
```

## Archivos Importantes

- `prisma/schema.prisma` - Esquema de base de datos
- `src/auth/auth.service.ts` - Lógica de negocio
- `src/auth/auth.controller.ts` - Endpoints
- `src/auth/dto/auth.dto.ts` - Validaciones
- `src/mail/mail.service.ts` - Envío de correos
- `src/auth/auth.scheduler.ts` - Eliminación automática
- `.env` - Configuración (NO COMMITEAR)

## Soporte

Para más detalles, consulta [SETUP_USERS.md](SETUP_USERS.md)
