# Documentación de API - TeleMed Backend

**Base URL:** `http://localhost:3000`
**Base URL Producción:** (Actualizar cuando esté en producción)

---

## Tabla de Contenidos

1. [Autenticación](#autenticación)
   - [Registro de Usuario](#registro-de-usuario)
   - [Verificación de Email](#verificación-de-email)
   - [Login](#login)
   - [Refresh Token](#refresh-token)
   - [Recuperación de Contraseña](#recuperación-de-contraseña)
   - [Resetear Contraseña](#resetear-contraseña)

2. [Catálogos](#catálogos)
   - [Tipos de Identificación](#tipos-de-identificación)
   - [Géneros](#géneros)
   - [Idiomas Nativos](#idiomas-nativos)
   - [Nacionalidades](#nacionalidades)
   - [Países de Residencia](#países-de-residencia)

3. [Usuarios](#usuarios)
4. [Médicos](#médicos)
5. [Citas](#citas)
6. [Mensajes](#mensajes)

---

## Autenticación

### Registro de Usuario

Crea una nueva cuenta de usuario. El usuario recibirá un correo electrónico para activar su cuenta.

**Endpoint:** `POST /auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "FirstName": "Juan",           // Requerido - String
  "LastName1": "Pérez",          // Requerido - String
  "LastName2": "García",         // Opcional - String
  "Email": "juan@example.com",   // Requerido - Email válido
  "Password": "Password123",     // Requerido - Mínimo 8 caracteres
  "PasswordConfirm": "Password123", // Requerido - Debe coincidir con Password
  "Phone": "+506 8888-8888",     // Opcional - String
  "IdentificationTypeId": 1,     // Opcional - Number (ID del catálogo)
  "Identification": "123456789", // Opcional - String
  "GenderId": 1,                 // Opcional - Number (ID del catálogo)
  "DateOfBirth": "1990-01-15",   // Opcional - String formato YYYY-MM-DD
  "NativeLanguageId": 1,         // Opcional - Number (ID del catálogo)
  "NationalityId": 1,            // Opcional - Number (ID del catálogo)
  "ResidenceCountryId": 1,       // Opcional - Number (ID del catálogo)
  "Role": "PATIENT"              // Opcional - String: "ADMIN" | "DOCTOR" | "PATIENT" (default: PATIENT)
}
```

**Response 201 - Success:**
```json
{
  "message": "Usuario registrado. Por favor verifica tu correo electrónico para activar tu cuenta.",
  "email": "juan@example.com"
}
```

**Response 400 - Error:**
```json
{
  "message": "Email ya registrado",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Response 400 - Validación:**
```json
{
  "message": [
    "El nombre es requerido",
    "El primer apellido es requerido",
    "Las contraseñas no coinciden"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### Verificación de Email

Activa una cuenta de usuario usando el token recibido por correo electrónico.

**Endpoint:** `POST /auth/verify-email`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6..." // Requerido - String (token del email)
}
```

**Response 200 - Success:**
```json
{
  "message": "Cuenta activada exitosamente. Ya puedes iniciar sesión."
}
```

**Response 400 - Error:**
```json
{
  "message": "Token de verificación inválido o expirado",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### Login

Inicia sesión con credenciales de usuario. La cuenta debe estar activada.

**Endpoint:** `POST /auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "Email": "juan@example.com",  // Requerido - Email válido
  "Password": "Password123"      // Requerido - String
}
```

**Response 200 - Success:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Payload del JWT (decodificado):**
```json
{
  "sub": "123",              // ID del usuario
  "email": "juan@example.com",
  "role": "PATIENT",         // Rol del usuario
  "iat": 1234567890,         // Timestamp de emisión
  "exp": 1234568790          // Timestamp de expiración
}
```

**Response 401 - Credenciales Inválidas:**
```json
{
  "message": "Invalid credentials",
  "error": "Unauthorized",
  "statusCode": 401
}
```

**Response 401 - Cuenta No Activada:**
```json
{
  "message": "Cuenta no activada. Por favor verifica tu correo electrónico.",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

### Refresh Token

Obtiene un nuevo access token usando el refresh token.

**Endpoint:** `POST /auth/refresh`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // Requerido
}
```

**Response 200 - Success:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response 401 - Token Inválido:**
```json
{
  "message": "Invalid refresh token",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

### Recuperación de Contraseña

Solicita un token para resetear la contraseña. Se envía un correo al usuario.

**Endpoint:** `POST /auth/forgot-password`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "Email": "juan@example.com"  // Requerido - Email válido
}
```

**Response 200 - Success:**
```json
{
  "message": "Si el correo existe, recibirás instrucciones para restablecer tu contraseña."
}
```

**Nota:** Por seguridad, siempre devuelve el mismo mensaje independientemente de si el email existe o no.

---

### Resetear Contraseña

Establece una nueva contraseña usando el token recibido por correo.

**Endpoint:** `POST /auth/reset-password`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "a1b2c3d4e5f6...",     // Requerido - String (token del email)
  "newPassword": "NewPassword123"  // Requerido - String (mínimo 8 caracteres)
}
```

**Response 200 - Success:**
```json
{
  "message": "Contraseña actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
}
```

**Response 400 - Token Inválido/Expirado:**
```json
{
  "message": "Token de recuperación inválido o expirado",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Catálogos

Los siguientes endpoints devuelven los catálogos disponibles. Estos se deben consumir para poblar dropdowns/selects en el frontend.

**Nota:** Los endpoints de catálogos aún no están implementados. Los datos existen en la base de datos pero necesitas crear los endpoints. Aquí está la estructura sugerida:

### Tipos de Identificación

**Endpoint:** `GET /catalogs/identification-types`

**Headers:**
```
Authorization: Bearer {access_token}  // Opcional según requerimientos
```

**Response 200:**
```json
[
  {
    "Id": 1,
    "Code": "DNI",
    "Name": "Documento Nacional de Identidad"
  },
  {
    "Id": 2,
    "Code": "PASSPORT",
    "Name": "Pasaporte"
  },
  {
    "Id": 3,
    "Code": "ID_CARD",
    "Name": "Cédula de Identidad"
  },
  {
    "Id": 4,
    "Code": "FOREIGN_ID",
    "Name": "Identificación Extranjera"
  },
  {
    "Id": 5,
    "Code": "OTHER",
    "Name": "Otro"
  }
]
```

---

### Géneros

**Endpoint:** `GET /catalogs/genders`

**Response 200:**
```json
[
  {
    "Id": 1,
    "Code": "M",
    "Name": "Masculino"
  },
  {
    "Id": 2,
    "Code": "F",
    "Name": "Femenino"
  },
  {
    "Id": 3,
    "Code": "OTHER",
    "Name": "Otro"
  },
  {
    "Id": 4,
    "Code": "PREFER_NOT_SAY",
    "Name": "Prefiero no decir"
  }
]
```

---

### Idiomas Nativos

**Endpoint:** `GET /catalogs/native-languages`

**Response 200:**
```json
[
  {
    "Id": 1,
    "Code": "es",
    "Name": "Español"
  },
  {
    "Id": 2,
    "Code": "en",
    "Name": "Inglés"
  },
  {
    "Id": 3,
    "Code": "fr",
    "Name": "Francés"
  },
  {
    "Id": 4,
    "Code": "pt",
    "Name": "Portugués"
  }
  // ... más idiomas
]
```

---

### Nacionalidades

**Endpoint:** `GET /catalogs/nationalities`

**Response 200:**
```json
[
  {
    "Id": 1,
    "Code": "CR",
    "Name": "Costarricense"
  },
  {
    "Id": 2,
    "Code": "US",
    "Name": "Estadounidense"
  },
  {
    "Id": 3,
    "Code": "MX",
    "Name": "Mexicana"
  }
  // ... más nacionalidades
]
```

---

### Países de Residencia

**Endpoint:** `GET /catalogs/residence-countries`

**Response 200:**
```json
[
  {
    "Id": 1,
    "Code": "CR",
    "Name": "Costa Rica"
  },
  {
    "Id": 2,
    "Code": "US",
    "Name": "Estados Unidos"
  },
  {
    "Id": 3,
    "Code": "MX",
    "Name": "México"
  }
  // ... más países
]
```

---

## Usuarios

### Obtener Perfil del Usuario Autenticado

**Endpoint:** `GET /users/me`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response 200:**
```json
{
  "Id": "123",
  "IdentificationTypeId": 1,
  "Identification": "123456789",
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "LastName2": "García",
  "FullName": "Juan Pérez García",
  "GenderId": 1,
  "DateOfBirth": "1990-01-15",
  "NativeLanguageId": 1,
  "Phone": "+506 8888-8888",
  "NationalityId": 1,
  "ResidenceCountryId": 1,
  "Email": "juan@example.com",
  "IsActive": true,
  "Role": "PATIENT",
  "CreatedAt": "2025-01-15T10:30:00.000Z",
  "UpdatedAt": "2025-01-15T10:30:00.000Z"
}
```

**Response 401 - No Autenticado:**
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

---

### Actualizar Perfil del Usuario Autenticado

**Endpoint:** `PATCH /users/me`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "Phone": "+506 9999-9999"  // Campos actualizables según implementación
}
```

**Response 200:**
```json
{
  "Id": "123",
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "Phone": "+506 9999-9999",
  // ... resto de campos
}
```

---

## Manejo de Errores Globales

Todos los endpoints pueden devolver estos errores:

### 400 - Bad Request
```json
{
  "message": "Descripción del error de validación",
  "error": "Bad Request",
  "statusCode": 400
}
```

### 401 - Unauthorized
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

### 403 - Forbidden
```json
{
  "message": "Forbidden resource",
  "error": "Forbidden",
  "statusCode": 403
}
```

### 404 - Not Found
```json
{
  "message": "Resource not found",
  "error": "Not Found",
  "statusCode": 404
}
```

### 500 - Internal Server Error
```json
{
  "message": "Internal server error",
  "statusCode": 500
}
```

---

## Autenticación con JWT

### Cómo usar el JWT en el Frontend

1. **Después del login**, guarda los tokens:
```javascript
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ Email: 'user@example.com', Password: 'pass123' })
});

const { access_token, refresh_token } = await response.json();

// Guardar en localStorage o sessionStorage
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

2. **En cada request protegido**, incluye el token:
```javascript
const response = await fetch('http://localhost:3000/users/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token')}`
  }
});
```

3. **Cuando el access_token expire** (status 401), usa el refresh token:
```javascript
const response = await fetch('http://localhost:3000/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refresh_token: localStorage.getItem('refresh_token')
  })
});

const { access_token, refresh_token } = await response.json();
localStorage.setItem('access_token', access_token);
localStorage.setItem('refresh_token', refresh_token);
```

---

## Flujos Completos

### Flujo de Registro

```
1. Frontend: POST /auth/register
   ↓
2. Backend: Crea usuario con IsActive=false
   ↓
3. Backend: Genera token de verificación
   ↓
4. Backend: Envía email con link de activación
   ↓
5. Usuario: Click en link del email
   ↓
6. Frontend: POST /auth/verify-email con token
   ↓
7. Backend: Activa cuenta (IsActive=true)
   ↓
8. Frontend: Redirige a login
```

### Flujo de Login

```
1. Frontend: POST /auth/login
   ↓
2. Backend: Valida credenciales
   ↓
3. Backend: Verifica IsActive=true
   ↓
4. Backend: Genera JWT tokens
   ↓
5. Frontend: Guarda tokens
   ↓
6. Frontend: Redirige a dashboard
```

### Flujo de Recuperación de Contraseña

```
1. Frontend: POST /auth/forgot-password
   ↓
2. Backend: Genera token de reseteo
   ↓
3. Backend: Envía email con link
   ↓
4. Usuario: Click en link del email
   ↓
5. Frontend: Muestra formulario de nueva contraseña
   ↓
6. Frontend: POST /auth/reset-password
   ↓
7. Backend: Actualiza contraseña
   ↓
8. Frontend: Redirige a login
```

---

## Configuración del Frontend

### Variables de Entorno Recomendadas

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_API_TIMEOUT=30000
```

### Interceptor HTTP Recomendado (Axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Request interceptor - Agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - Manejar refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const { access_token, refresh_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh falló - logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Próximos Endpoints a Implementar

Los siguientes endpoints están en el backend pero necesitan ser documentados:

- [ ] `GET /doctors` - Listar médicos
- [ ] `POST /doctors` - Crear perfil de médico
- [ ] `GET /appointments` - Listar citas
- [ ] `POST /appointments` - Crear cita
- [ ] `GET /messages` - Listar mensajes
- [ ] `POST /messages` - Enviar mensaje
- [ ] Endpoints de catálogos

---

## Soporte y Contacto

Para dudas sobre la API:
- Revisa este documento primero
- Consulta [SETUP_USERS.md](SETUP_USERS.md) para configuración
- Consulta [INSTRUCCIONES_RAPIDAS.md](INSTRUCCIONES_RAPIDAS.md) para pruebas rápidas

---

**Última actualización:** 2025-10-15
**Versión del API:** 1.0.0
