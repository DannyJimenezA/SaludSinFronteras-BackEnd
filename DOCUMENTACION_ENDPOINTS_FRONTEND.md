# Documentación Completa de Endpoints - Backend Telemedicina

## Tabla de Contenidos

1. [Información General](#información-general)
2. [Autenticación](#autenticación)
3. [Usuarios](#usuarios)
4. [Doctores](#doctores)
5. [Citas Médicas](#citas-médicas)
6. [Notas de Citas](#notas-de-citas)
7. [Disponibilidad](#disponibilidad)
8. [Conversaciones](#conversaciones)
9. [Mensajes](#mensajes)
10. [Historiales Médicos](#historiales-médicos)
11. [Verificación de Doctores](#verificación-de-doctores)
12. [Suscripciones y Planes](#suscripciones-y-planes)
13. [Video Conferencia](#video-conferencia)
14. [Traducción](#traducción)
15. [Panel de Administración](#panel-de-administración)
16. [WebSockets](#websockets)
17. [Códigos de Error Comunes](#códigos-de-error-comunes)

---

## Información General

### URL Base
```
http://localhost:3000
```

### Autenticación
La mayoría de endpoints requieren autenticación mediante JWT Bearer Token:

```javascript
headers: {
  'Authorization': 'Bearer <access_token>',
  'Content-Type': 'application/json'
}
```

### Roles de Usuario
- `ADMIN` - Administrador del sistema
- `DOCTOR` - Médico/Doctor
- `PATIENT` - Paciente

### Formato de Respuestas
Todas las respuestas son en formato JSON. Los IDs se retornan como strings para evitar problemas con BigInt.

---

## 1. Autenticación

### 1.1 Registro de Usuario

**Endpoint:** `POST /auth/register`

**Autenticación:** No requerida

**Body:**
```json
{
  "Email": "usuario@ejemplo.com",
  "Password": "password123",
  "PasswordConfirm": "password123",
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "LastName2": "García",
  "Role": "PATIENT",
  "IdentificationTypeId": 1,
  "Identification": "123456789",
  "GenderId": 1,
  "DateOfBirth": "1990-01-15",
  "NativeLanguageId": 1,
  "Phone": "+50688887777",
  "NationalityId": 52,
  "ResidenceCountryId": 52
}
```

**Campos Requeridos:**
- `Email` (string, email válido)
- `Password` (string, mínimo 8 caracteres)
- `PasswordConfirm` (string, debe coincidir con Password)
- `FirstName` (string)
- `LastName1` (string)

**Campos Opcionales:**
- `LastName2`, `Role`, `IdentificationTypeId`, `Identification`, `GenderId`, `DateOfBirth`, `NativeLanguageId`, `Phone`, `NationalityId`, `ResidenceCountryId`

**Respuesta Exitosa (201):**
```json
{
  "user": {
    "UserId": "1",
    "Email": "usuario@ejemplo.com",
    "FirstName": "Juan",
    "LastName1": "Pérez",
    "Role": "PATIENT",
    "IsEmailVerified": false
  },
  "message": "Usuario registrado. Por favor verifica tu email."
}
```

**Implementación Frontend (React/TypeScript):**
```typescript
interface RegisterData {
  Email: string;
  Password: string;
  PasswordConfirm: string;
  FirstName: string;
  LastName1: string;
  LastName2?: string;
  Role?: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  Phone?: string;
  DateOfBirth?: string;
}

async function register(data: RegisterData) {
  const response = await fetch('http://localhost:3000/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error en el registro');
  }

  return await response.json();
}
```

**Implementación Frontend (Axios):**
```typescript
import axios from 'axios';

const API_URL = 'http://localhost:3000';

async function register(data: RegisterData) {
  try {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(error.response?.data?.message || 'Error en el registro');
    }
    throw error;
  }
}
```

---

### 1.2 Login de Usuario

**Endpoint:** `POST /auth/login`

**Autenticación:** No requerida

**Body:**
```json
{
  "Email": "usuario@ejemplo.com",
  "Password": "password123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "UserId": "1",
    "Email": "usuario@ejemplo.com",
    "FirstName": "Juan",
    "LastName1": "Pérez",
    "Role": "PATIENT",
    "IsEmailVerified": true
  }
}
```

**Implementación Frontend:**
```typescript
interface LoginData {
  Email: string;
  Password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    UserId: string;
    Email: string;
    FirstName: string;
    LastName1: string;
    Role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
    IsEmailVerified: boolean;
  };
}

async function login(data: LoginData): Promise<LoginResponse> {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Credenciales inválidas');
  }

  const result = await response.json();

  // Guardar tokens en localStorage o sessionStorage
  localStorage.setItem('access_token', result.access_token);
  localStorage.setItem('refresh_token', result.refresh_token);
  localStorage.setItem('user', JSON.stringify(result.user));

  return result;
}
```

---

### 1.3 Refrescar Token

**Endpoint:** `POST /auth/refresh`

**Autenticación:** No requerida (usa refresh_token)

**Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta Exitosa (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Implementación Frontend:**
```typescript
async function refreshToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refresh_token');

  if (!refreshToken) {
    throw new Error('No hay refresh token disponible');
  }

  const response = await fetch('http://localhost:3000/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    // Token expirado, redirigir a login
    localStorage.clear();
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }

  const result = await response.json();
  localStorage.setItem('access_token', result.access_token);
  localStorage.setItem('refresh_token', result.refresh_token);

  return result.access_token;
}

// Interceptor para manejar errores 401
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  // Si recibimos 401, intentar refrescar el token
  if (response.status === 401) {
    const newToken = await refreshToken();

    // Reintentar la petición original con el nuevo token
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  return response;
}
```

---

### 1.4 Verificar Email

**Endpoint:** `POST /auth/verify-email`

**Autenticación:** No requerida

**Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Email verificado exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function verifyEmail(token: string) {
  const response = await fetch('http://localhost:3000/auth/verify-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error('Token inválido o expirado');
  }

  return await response.json();
}

// Componente de verificación
// URL: /verify-email?token=xxx
function VerifyEmailPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      verifyEmail(token)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'));
    }
  }, [token]);

  // Renderizar UI según el estado...
}
```

---

### 1.5 Olvidé mi Contraseña

**Endpoint:** `POST /auth/forgot-password`

**Autenticación:** No requerida

**Body:**
```json
{
  "Email": "usuario@ejemplo.com"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Si el email existe, recibirás un enlace de recuperación"
}
```

**Implementación Frontend:**
```typescript
async function forgotPassword(email: string) {
  const response = await fetch('http://localhost:3000/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Email: email }),
  });

  if (!response.ok) {
    throw new Error('Error al enviar el email');
  }

  return await response.json();
}
```

---

### 1.6 Resetear Contraseña

**Endpoint:** `POST /auth/reset-password`

**Autenticación:** No requerida

**Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "nuevaPassword123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function resetPassword(token: string, newPassword: string) {
  const response = await fetch('http://localhost:3000/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    throw new Error('Token inválido o expirado');
  }

  return await response.json();
}
```

---

## 2. Usuarios

### 2.1 Obtener Mi Perfil

**Endpoint:** `GET /users/me`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
{
  "UserId": "1",
  "Email": "usuario@ejemplo.com",
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "LastName2": "García",
  "Role": "PATIENT",
  "Phone": "+50688887777",
  "IsEmailVerified": true,
  "CreatedAt": "2025-10-20T10:00:00Z"
}
```

**Implementación Frontend:**
```typescript
async function getMyProfile() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/users/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener perfil');
  }

  return await response.json();
}
```

---

### 2.2 Actualizar Mi Perfil

**Endpoint:** `PATCH /users/me`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Body:**
```json
{
  "FullName": "Juan Pérez García",
  "Phone": "+50688887777"
}
```

**Respuesta Exitosa (200):**
```json
{
  "UserId": "1",
  "Email": "usuario@ejemplo.com",
  "FullName": "Juan Pérez García",
  "Phone": "+50688887777"
}
```

**Implementación Frontend:**
```typescript
interface UpdateProfileData {
  FullName?: string;
  Phone?: string;
}

async function updateMyProfile(data: UpdateProfileData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/users/me', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar perfil');
  }

  return await response.json();
}
```

---

## 3. Doctores

### 3.1 Obtener Mi Perfil de Doctor

**Endpoint:** `GET /doctors/me/profile`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Respuesta Exitosa (200):**
```json
{
  "UserId": "2",
  "LicenseNumber": "MED-12345",
  "LicenseCountryId": 52,
  "Bio": "Especialista en medicina interna con 10 años de experiencia",
  "YearsExperience": 10,
  "VerificationStatus": "approved",
  "ProfilePictureUrl": "https://cloudinary.com/...",
  "User": {
    "Email": "doctor@ejemplo.com",
    "FirstName": "María",
    "LastName1": "González"
  }
}
```

**Implementación Frontend:**
```typescript
async function getDoctorProfile() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/doctors/me/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener perfil de doctor');
  }

  return await response.json();
}
```

---

### 3.2 Crear/Actualizar Perfil de Doctor

**Endpoint:** `PATCH /doctors/me/profile`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Body:**
```json
{
  "LicenseNumber": "MED-12345",
  "LicenseCountryId": 52,
  "Bio": "Especialista en medicina interna con 10 años de experiencia",
  "YearsExperience": 10
}
```

**Campos Requeridos:**
- `LicenseNumber` (string)
- `LicenseCountryId` (número)

**Campos Opcionales:**
- `Bio` (string)
- `YearsExperience` (número)

**Respuesta Exitosa (200):**
```json
{
  "UserId": "2",
  "LicenseNumber": "MED-12345",
  "LicenseCountryId": 52,
  "Bio": "Especialista en medicina interna...",
  "YearsExperience": 10
}
```

**Implementación Frontend:**
```typescript
interface DoctorProfileData {
  LicenseNumber: string;
  LicenseCountryId: number;
  Bio?: string;
  YearsExperience?: number;
}

async function updateDoctorProfile(data: DoctorProfileData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/doctors/me/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar perfil de doctor');
  }

  return await response.json();
}
```

---

## 4. Citas Médicas

### 4.1 Crear Cita (Paciente)

**Endpoint:** `POST /appointments`

**Autenticación:** Requerida (JWT)

**Roles:** `PATIENT`

**Body:**
```json
{
  "DoctorUserId": 2,
  "SlotId": 5,
  "Modality": "online"
}
```

**Campos Requeridos:**
- `DoctorUserId` (número, ID del doctor)
- `SlotId` (número, ID del slot de disponibilidad)

**Campos Opcionales:**
- `Modality` ("online" | "in_person" | "hybrid")

**Respuesta Exitosa (201):**
```json
{
  "AppointmentId": "10",
  "PatientUserId": "1",
  "DoctorUserId": "2",
  "SlotId": "5",
  "ScheduledAt": "2025-10-25T14:00:00Z",
  "Status": "scheduled",
  "Modality": "online",
  "CreatedAt": "2025-10-20T10:00:00Z"
}
```

**Implementación Frontend:**
```typescript
interface CreateAppointmentData {
  DoctorUserId: number;
  SlotId: number;
  Modality?: 'online' | 'in_person' | 'hybrid';
}

async function createAppointment(data: CreateAppointmentData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/appointments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear cita');
  }

  return await response.json();
}
```

---

### 4.2 Listar Citas con Filtros

**Endpoint:** `GET /appointments`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Query Parameters:**
- `doctorId` (opcional, string): Filtrar por doctor
- `patientId` (opcional, string): Filtrar por paciente
- `status` (opcional, "scheduled" | "completed" | "cancelled" | "in_progress"): Filtrar por estado
- `from` (opcional, string ISO date): Fecha desde
- `to` (opcional, string ISO date): Fecha hasta

**Ejemplo URL:**
```
GET /appointments?doctorId=2&status=scheduled&from=2025-10-20&to=2025-10-30
```

**Respuesta Exitosa (200):**
```json
[
  {
    "AppointmentId": "10",
    "PatientUserId": "1",
    "DoctorUserId": "2",
    "ScheduledAt": "2025-10-25T14:00:00Z",
    "Status": "scheduled",
    "Modality": "online",
    "Patient": {
      "FirstName": "Juan",
      "LastName1": "Pérez"
    },
    "Doctor": {
      "FirstName": "María",
      "LastName1": "González"
    }
  }
]
```

**Implementación Frontend:**
```typescript
interface AppointmentFilters {
  doctorId?: string;
  patientId?: string;
  status?: 'scheduled' | 'completed' | 'cancelled' | 'in_progress';
  from?: string;
  to?: string;
}

async function getAppointments(filters: AppointmentFilters = {}) {
  const token = localStorage.getItem('access_token');

  // Construir query string
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });

  const url = `http://localhost:3000/appointments${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener citas');
  }

  return await response.json();
}
```

---

### 4.3 Obtener Detalle de Cita

**Endpoint:** `GET /appointments/:id`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
{
  "AppointmentId": "10",
  "PatientUserId": "1",
  "DoctorUserId": "2",
  "ScheduledAt": "2025-10-25T14:00:00Z",
  "Status": "scheduled",
  "Modality": "online",
  "SfuRoomId": null,
  "Patient": {
    "UserId": "1",
    "FirstName": "Juan",
    "LastName1": "Pérez",
    "Email": "paciente@ejemplo.com"
  },
  "Doctor": {
    "UserId": "2",
    "FirstName": "María",
    "LastName1": "González",
    "LicenseNumber": "MED-12345"
  },
  "Notes": [],
  "MedicalRecords": []
}
```

**Implementación Frontend:**
```typescript
async function getAppointmentDetail(appointmentId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener detalle de cita');
  }

  return await response.json();
}
```

---

### 4.4 Actualizar Estado de Cita

**Endpoint:** `PATCH /appointments/:id/status`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Body:**
```json
{
  "Status": "completed"
}
```

**Valores de Status:**
- `scheduled` - Programada
- `in_progress` - En progreso
- `completed` - Completada
- `cancelled` - Cancelada

**Respuesta Exitosa (200):**
```json
{
  "AppointmentId": "10",
  "Status": "completed",
  "UpdatedAt": "2025-10-25T15:00:00Z"
}
```

**Implementación Frontend:**
```typescript
type AppointmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Status: status }),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar estado de cita');
  }

  return await response.json();
}
```

---

### 4.5 Eliminar Cita

**Endpoint:** `DELETE /appointments/:id`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
{
  "message": "Cita eliminada exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function deleteAppointment(appointmentId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar cita');
  }

  return await response.json();
}
```

---

## 5. Notas de Citas

### 5.1 Agregar Nota a Cita (Doctor)

**Endpoint:** `POST /appointments/:id/notes`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Body:**
```json
{
  "Content": "Paciente presenta síntomas de gripe. Se recomienda reposo y medicación."
}
```

**Respuesta Exitosa (201):**
```json
{
  "NoteId": "15",
  "AppointmentId": "10",
  "DoctorUserId": "2",
  "Content": "Paciente presenta síntomas de gripe...",
  "CreatedAt": "2025-10-25T15:00:00Z"
}
```

**Implementación Frontend:**
```typescript
async function addAppointmentNote(appointmentId: string, content: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Content: content }),
  });

  if (!response.ok) {
    throw new Error('Error al agregar nota');
  }

  return await response.json();
}
```

---

### 5.2 Listar Notas de Cita

**Endpoint:** `GET /appointments/:id/notes`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
[
  {
    "NoteId": "15",
    "AppointmentId": "10",
    "DoctorUserId": "2",
    "Content": "Paciente presenta síntomas de gripe...",
    "CreatedAt": "2025-10-25T15:00:00Z",
    "Doctor": {
      "FirstName": "María",
      "LastName1": "González"
    }
  }
]
```

**Implementación Frontend:**
```typescript
async function getAppointmentNotes(appointmentId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}/notes`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener notas');
  }

  return await response.json();
}
```

---

### 5.3 Eliminar Nota

**Endpoint:** `DELETE /appointments/:id/notes/:noteId`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`

**Respuesta Exitosa (200):**
```json
{
  "message": "Nota eliminada exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function deleteAppointmentNote(appointmentId: string, noteId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}/notes/${noteId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar nota');
  }

  return await response.json();
}
```

---

## 6. Disponibilidad

### 6.1 Crear Slot de Disponibilidad (Doctor)

**Endpoint:** `POST /doctors/me/availability`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Body:**
```json
{
  "StartTime": "2025-10-25T14:00:00Z",
  "EndTime": "2025-10-25T15:00:00Z",
  "IsAvailable": true
}
```

**Respuesta Exitosa (201):**
```json
{
  "SlotId": "5",
  "DoctorUserId": "2",
  "StartTime": "2025-10-25T14:00:00Z",
  "EndTime": "2025-10-25T15:00:00Z",
  "IsAvailable": true
}
```

**Implementación Frontend:**
```typescript
interface CreateSlotData {
  StartTime: string; // ISO date string
  EndTime: string;   // ISO date string
  IsAvailable?: boolean;
}

async function createAvailabilitySlot(data: CreateSlotData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/doctors/me/availability', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al crear slot de disponibilidad');
  }

  return await response.json();
}
```

---

### 6.2 Listar Disponibilidad de un Doctor

**Endpoint:** `GET /doctors/:id/availability`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Query Parameters:**
- `from` (opcional, string ISO date): Fecha desde
- `to` (opcional, string ISO date): Fecha hasta

**Ejemplo URL:**
```
GET /doctors/2/availability?from=2025-10-20&to=2025-10-30
```

**Respuesta Exitosa (200):**
```json
[
  {
    "SlotId": "5",
    "DoctorUserId": "2",
    "StartTime": "2025-10-25T14:00:00Z",
    "EndTime": "2025-10-25T15:00:00Z",
    "IsAvailable": true,
    "AppointmentId": null
  },
  {
    "SlotId": "6",
    "DoctorUserId": "2",
    "StartTime": "2025-10-25T15:00:00Z",
    "EndTime": "2025-10-25T16:00:00Z",
    "IsAvailable": false,
    "AppointmentId": "10"
  }
]
```

**Implementación Frontend:**
```typescript
interface AvailabilityFilters {
  from?: string;
  to?: string;
}

async function getDoctorAvailability(doctorId: string, filters: AvailabilityFilters = {}) {
  const token = localStorage.getItem('access_token');

  const params = new URLSearchParams();
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);

  const url = `http://localhost:3000/doctors/${doctorId}/availability${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener disponibilidad');
  }

  return await response.json();
}
```

---

### 6.3 Eliminar Slot de Disponibilidad (Doctor)

**Endpoint:** `DELETE /availability/:slotId`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Respuesta Exitosa (200):**
```json
{
  "message": "Slot eliminado exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function deleteAvailabilitySlot(slotId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/availability/${slotId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar slot');
  }

  return await response.json();
}
```

---

## 7. Conversaciones

### 7.1 Crear/Asegurar Conversación desde Cita

**Endpoint:** `POST /conversations/from-appointment/:appointmentId`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
{
  "ConversationId": "3",
  "AppointmentId": "10",
  "PatientUserId": "1",
  "DoctorUserId": "2",
  "CreatedAt": "2025-10-25T14:00:00Z"
}
```

**Implementación Frontend:**
```typescript
async function ensureConversationForAppointment(appointmentId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/conversations/from-appointment/${appointmentId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al crear conversación');
  }

  return await response.json();
}
```

---

### 7.2 Listar Mis Conversaciones

**Endpoint:** `GET /conversations/mine`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
[
  {
    "ConversationId": "3",
    "AppointmentId": "10",
    "PatientUserId": "1",
    "DoctorUserId": "2",
    "Patient": {
      "FirstName": "Juan",
      "LastName1": "Pérez"
    },
    "Doctor": {
      "FirstName": "María",
      "LastName1": "González"
    },
    "LastMessage": {
      "Content": "Hola, ¿cómo está?",
      "CreatedAt": "2025-10-25T14:30:00Z"
    }
  }
]
```

**Implementación Frontend:**
```typescript
async function getMyConversations() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/conversations/mine', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener conversaciones');
  }

  return await response.json();
}
```

---

### 7.3 Obtener Detalle de Conversación

**Endpoint:** `GET /conversations/:id`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
{
  "ConversationId": "3",
  "AppointmentId": "10",
  "PatientUserId": "1",
  "DoctorUserId": "2",
  "Patient": {
    "UserId": "1",
    "FirstName": "Juan",
    "LastName1": "Pérez"
  },
  "Doctor": {
    "UserId": "2",
    "FirstName": "María",
    "LastName1": "González"
  }
}
```

**Implementación Frontend:**
```typescript
async function getConversation(conversationId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/conversations/${conversationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener conversación');
  }

  return await response.json();
}
```

---

## 8. Mensajes

### 8.1 Listar Mensajes de Conversación

**Endpoint:** `GET /conversations/:id/messages`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
[
  {
    "MessageId": "25",
    "ConversationId": "3",
    "SenderUserId": "1",
    "Content": "Hola, ¿cómo está?",
    "Language": "es",
    "CreatedAt": "2025-10-25T14:30:00Z",
    "Sender": {
      "FirstName": "Juan",
      "LastName1": "Pérez"
    }
  },
  {
    "MessageId": "26",
    "ConversationId": "3",
    "SenderUserId": "2",
    "Content": "Hola, muy bien gracias. ¿En qué puedo ayudarte?",
    "Language": "es",
    "CreatedAt": "2025-10-25T14:31:00Z",
    "Sender": {
      "FirstName": "María",
      "LastName1": "González"
    }
  }
]
```

**Implementación Frontend:**
```typescript
async function getMessages(conversationId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/conversations/${conversationId}/messages`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener mensajes');
  }

  return await response.json();
}
```

---

### 8.2 Enviar Mensaje

**Endpoint:** `POST /conversations/:id/messages`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Body:**
```json
{
  "Content": "Hola, ¿cómo está?",
  "Language": "es"
}
```

**Respuesta Exitosa (201):**
```json
{
  "MessageId": "25",
  "ConversationId": "3",
  "SenderUserId": "1",
  "Content": "Hola, ¿cómo está?",
  "Language": "es",
  "CreatedAt": "2025-10-25T14:30:00Z"
}
```

**Implementación Frontend:**
```typescript
interface SendMessageData {
  Content: string;
  Language?: string | null;
}

async function sendMessage(conversationId: string, data: SendMessageData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al enviar mensaje');
  }

  return await response.json();
}
```

---

### 8.3 Subir Archivo en Mensaje

**Endpoint:** `POST /conversations/:id/messages/upload`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (File): Archivo a subir

**Respuesta Exitosa (201):**
```json
{
  "MessageId": "27",
  "ConversationId": "3",
  "SenderUserId": "1",
  "Content": "/uploads/messages/archivo-12345.pdf",
  "Language": null,
  "CreatedAt": "2025-10-25T14:35:00Z"
}
```

**Implementación Frontend:**
```typescript
async function uploadMessageFile(conversationId: string, file: File) {
  const token = localStorage.getItem('access_token');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`http://localhost:3000/conversations/${conversationId}/messages/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // NO incluir 'Content-Type' - el navegador lo establece automáticamente con el boundary
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Error al subir archivo');
  }

  return await response.json();
}

// Componente React con input de archivo
function MessageFileUpload({ conversationId }: { conversationId: string }) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const message = await uploadMessageFile(conversationId, file);
      console.log('Archivo subido:', message);
    } catch (error) {
      console.error('Error al subir archivo:', error);
    }
  };

  return (
    <input type="file" onChange={handleFileChange} />
  );
}
```

---

### 8.4 Eliminar Mensaje

**Endpoint:** `DELETE /conversations/:id/messages/:messageId`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
{
  "message": "Mensaje eliminado exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function deleteMessage(conversationId: string, messageId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/conversations/${conversationId}/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar mensaje');
  }

  return await response.json();
}
```

---

## 9. Historiales Médicos

### 9.1 Crear Historial Médico (Doctor)

**Endpoint:** `POST /medical-records`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Body:**
```json
{
  "PatientUserId": 1,
  "AppointmentId": 10,
  "Diagnosis": "Hipertensión arterial estadio 1",
  "Prescriptions": "Losartán 50mg cada 12 horas por 30 días",
  "Recommendations": "Dieta baja en sodio, ejercicio diario 30 minutos, control de presión semanal",
  "Files": ["/uploads/medical-records/estudio-123.pdf"]
}
```

**Nota de Seguridad:** Los campos `Diagnosis`, `Prescriptions` y `Recommendations` son automáticamente **cifrados con AES-256** antes de almacenarse en la base de datos.

**Respuesta Exitosa (201):**
```json
{
  "RecordId": "20",
  "PatientUserId": "1",
  "DoctorUserId": "2",
  "AppointmentId": "10",
  "Diagnosis": "Hipertensión arterial estadio 1",
  "Prescriptions": "Losartán 50mg cada 12 horas por 30 días",
  "Recommendations": "Dieta baja en sodio...",
  "Files": ["/uploads/medical-records/estudio-123.pdf"],
  "CreatedAt": "2025-10-25T15:00:00Z"
}
```

**Implementación Frontend:**
```typescript
interface CreateMedicalRecordData {
  PatientUserId: number;
  AppointmentId?: number;
  Diagnosis?: string;
  Prescriptions?: string;
  Recommendations?: string;
  Files?: string[];
}

async function createMedicalRecord(data: CreateMedicalRecordData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/medical-records', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear historial médico');
  }

  return await response.json();
}
```

---

### 9.2 Listar Historiales de un Paciente

**Endpoint:** `GET /medical-records/patient/:patientId`

**Autenticación:** Requerida (JWT)

**Roles:**
- `ADMIN` - Puede ver cualquier historial
- `DOCTOR` - Puede ver todos los historiales
- `PATIENT` - Solo puede ver sus propios historiales

**Respuesta Exitosa (200):**
```json
[
  {
    "RecordId": "20",
    "PatientUserId": "1",
    "DoctorUserId": "2",
    "AppointmentId": "10",
    "Diagnosis": "Hipertensión arterial estadio 1",
    "Prescriptions": "Losartán 50mg cada 12 horas...",
    "Recommendations": "Dieta baja en sodio...",
    "Files": ["/uploads/medical-records/estudio-123.pdf"],
    "CreatedAt": "2025-10-25T15:00:00Z",
    "Doctor": {
      "FirstName": "María",
      "LastName1": "González",
      "LicenseNumber": "MED-12345"
    }
  }
]
```

**Implementación Frontend:**
```typescript
async function getPatientMedicalRecords(patientId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/medical-records/patient/${patientId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener historiales médicos');
  }

  return await response.json();
}

// Obtener mis propios historiales (como paciente)
async function getMyMedicalRecords() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return getPatientMedicalRecords(user.UserId);
}
```

---

### 9.3 Obtener Historial Médico por ID

**Endpoint:** `GET /medical-records/:id`

**Autenticación:** Requerida (JWT)

**Roles:**
- `ADMIN` - Puede ver cualquier historial
- `DOCTOR` - Solo si fue el autor
- `PATIENT` - Solo si es su historial

**Respuesta Exitosa (200):**
```json
{
  "RecordId": "20",
  "PatientUserId": "1",
  "DoctorUserId": "2",
  "AppointmentId": "10",
  "Diagnosis": "Hipertensión arterial estadio 1",
  "Prescriptions": "Losartán 50mg cada 12 horas por 30 días",
  "Recommendations": "Dieta baja en sodio, ejercicio diario 30 minutos",
  "Files": ["/uploads/medical-records/estudio-123.pdf"],
  "CreatedAt": "2025-10-25T15:00:00Z",
  "Doctor": {
    "FirstName": "María",
    "LastName1": "González"
  },
  "Patient": {
    "FirstName": "Juan",
    "LastName1": "Pérez"
  }
}
```

**Implementación Frontend:**
```typescript
async function getMedicalRecord(recordId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/medical-records/${recordId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener historial médico');
  }

  return await response.json();
}
```

---

### 9.4 Actualizar Historial Médico (Doctor)

**Endpoint:** `PATCH /medical-records/:id`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR` (solo el doctor autor)

**Body:**
```json
{
  "Diagnosis": "Hipertensión arterial estadio 2",
  "Prescriptions": "Losartán 100mg cada 12 horas",
  "Recommendations": "Dieta estricta baja en sodio, ejercicio diario, control semanal"
}
```

**Respuesta Exitosa (200):**
```json
{
  "RecordId": "20",
  "Diagnosis": "Hipertensión arterial estadio 2",
  "Prescriptions": "Losartán 100mg cada 12 horas",
  "Recommendations": "Dieta estricta baja en sodio...",
  "UpdatedAt": "2025-10-26T10:00:00Z"
}
```

**Implementación Frontend:**
```typescript
interface UpdateMedicalRecordData {
  Diagnosis?: string;
  Prescriptions?: string;
  Recommendations?: string;
  Files?: string[];
}

async function updateMedicalRecord(recordId: string, data: UpdateMedicalRecordData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/medical-records/${recordId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar historial médico');
  }

  return await response.json();
}
```

---

### 9.5 Eliminar Historial Médico

**Endpoint:** `DELETE /medical-records/:id`

**Autenticación:** Requerida (JWT)

**Roles:**
- `ADMIN` - Puede eliminar cualquier historial
- `DOCTOR` - Solo puede eliminar sus propios historiales

**Respuesta Exitosa (200):**
```json
{
  "message": "Historial médico eliminado exitosamente",
  "id": "20"
}
```

**Implementación Frontend:**
```typescript
async function deleteMedicalRecord(recordId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/medical-records/${recordId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar historial médico');
  }

  return await response.json();
}
```

---

## 10. Verificación de Doctores

### 10.1 Enviar Documentos de Verificación (Doctor)

**Endpoint:** `POST /verification/submit`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Body:**
```json
{
  "CertificationDocuments": [
    "uploads/licenses/medical-license.pdf",
    "uploads/diplomas/medical-degree.pdf",
    "uploads/certificates/specialty-cert.pdf"
  ],
  "Notes": "Licencia médica vigente hasta 2030. Especialidad en medicina interna."
}
```

**Campos:**
- `CertificationDocuments` (array de strings, 1-10 documentos): URLs de los documentos subidos
- `Notes` (string, opcional): Notas adicionales para el administrador

**Respuesta Exitosa (200):**
```json
{
  "UserId": "2",
  "VerificationStatus": "pending",
  "CertificationDocuments": ["uploads/licenses/medical-license.pdf", "..."],
  "Notes": "Licencia médica vigente hasta 2030...",
  "SubmittedAt": "2025-10-20T10:00:00Z"
}
```

**Implementación Frontend:**
```typescript
interface SubmitVerificationData {
  CertificationDocuments: string[];
  Notes?: string;
}

async function submitVerification(data: SubmitVerificationData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/verification/submit', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Error al enviar documentos de verificación');
  }

  return await response.json();
}
```

---

### 10.2 Consultar Mi Estado de Verificación (Doctor)

**Endpoint:** `GET /verification/status`

**Autenticación:** Requerida (JWT)

**Roles:** `DOCTOR`

**Respuesta Exitosa (200):**

**Estado Pending:**
```json
{
  "UserId": "2",
  "VerificationStatus": "pending",
  "CertificationDocuments": ["uploads/licenses/medical-license.pdf"],
  "Notes": "Licencia médica vigente hasta 2030",
  "SubmittedAt": "2025-10-20T10:00:00Z",
  "AdminNotes": null,
  "VerifiedAt": null
}
```

**Estado Approved:**
```json
{
  "UserId": "2",
  "VerificationStatus": "approved",
  "CertificationDocuments": ["uploads/licenses/medical-license.pdf"],
  "Notes": "Licencia médica vigente hasta 2030",
  "SubmittedAt": "2025-10-20T10:00:00Z",
  "AdminNotes": "Documentos verificados correctamente.",
  "VerifiedAt": "2025-10-21T09:00:00Z",
  "VerifiedByAdminId": "1"
}
```

**Estado Rejected:**
```json
{
  "UserId": "2",
  "VerificationStatus": "rejected",
  "CertificationDocuments": ["uploads/licenses/medical-license.pdf"],
  "RejectionReason": "Las imágenes están borrosas. Por favor, envía fotos de mejor calidad.",
  "AdminNotes": "Documentos de baja calidad",
  "SubmittedAt": "2025-10-20T10:00:00Z"
}
```

**Implementación Frontend:**
```typescript
type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface VerificationStatusResponse {
  UserId: string;
  VerificationStatus: VerificationStatus;
  CertificationDocuments: string[];
  Notes?: string;
  SubmittedAt?: string;
  AdminNotes?: string;
  RejectionReason?: string;
  VerifiedAt?: string;
  VerifiedByAdminId?: string;
}

async function getMyVerificationStatus(): Promise<VerificationStatusResponse> {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/verification/status', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener estado de verificación');
  }

  return await response.json();
}
```

---

### 10.3 Listar Doctores Pendientes de Verificación (Admin)

**Endpoint:** `GET /verification/pending`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Respuesta Exitosa (200):**
```json
[
  {
    "UserId": "5",
    "DoctorName": "Dr. Juan Pérez",
    "Email": "doctor@ejemplo.com",
    "LicenseNumber": "MED-12345",
    "SubmittedAt": "2025-10-20T10:00:00Z",
    "DocumentsCount": 3
  }
]
```

**Implementación Frontend:**
```typescript
async function getPendingVerifications() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/verification/pending', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener verificaciones pendientes');
  }

  return await response.json();
}
```

---

### 10.4 Listar Doctores Verificados (Admin)

**Endpoint:** `GET /verification/approved`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Implementación Frontend:**
```typescript
async function getVerifiedDoctors() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/verification/approved', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener doctores verificados');
  }

  return await response.json();
}
```

---

### 10.5 Listar Doctores Rechazados (Admin)

**Endpoint:** `GET /verification/rejected`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

---

### 10.6 Consultar Verificación de un Doctor Específico (Admin)

**Endpoint:** `GET /verification/doctor/:doctorId`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

---

### 10.7 Aprobar/Rechazar Verificación de Doctor (Admin)

**Endpoint:** `POST /verification/review/:doctorId`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Body para Aprobar:**
```json
{
  "Action": "approve",
  "AdminNotes": "Documentos verificados correctamente. Licencia vigente."
}
```

**Body para Rechazar:**
```json
{
  "Action": "reject",
  "AdminNotes": "Documentos de baja calidad",
  "RejectionReason": "Las imágenes están borrosas y no se puede leer el número de licencia. Por favor, envía fotos de mejor calidad."
}
```

**Campos:**
- `Action` ("approve" | "reject"): Acción a realizar
- `AdminNotes` (string, opcional): Notas del administrador
- `RejectionReason` (string, requerido si Action=reject): Razón del rechazo

**Respuesta Exitosa (200):**
```json
{
  "UserId": "2",
  "VerificationStatus": "approved",
  "VerifiedAt": "2025-10-21T09:00:00Z",
  "VerifiedByAdminId": "1",
  "AdminNotes": "Documentos verificados correctamente."
}
```

**Implementación Frontend:**
```typescript
interface ReviewVerificationData {
  Action: 'approve' | 'reject';
  AdminNotes?: string;
  RejectionReason?: string;
}

async function reviewVerification(doctorId: string, data: ReviewVerificationData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/verification/review/${doctorId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al revisar verificación');
  }

  return await response.json();
}

// Aprobar doctor
async function approveDoctor(doctorId: string, notes?: string) {
  return reviewVerification(doctorId, {
    Action: 'approve',
    AdminNotes: notes,
  });
}

// Rechazar doctor
async function rejectDoctor(doctorId: string, reason: string, notes?: string) {
  return reviewVerification(doctorId, {
    Action: 'reject',
    RejectionReason: reason,
    AdminNotes: notes,
  });
}
```

---

## 11. Suscripciones y Planes

### 11.1 Listar Planes Disponibles

**Endpoint:** `GET /plans`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
[
  {
    "Id": "1",
    "Name": "Basic",
    "PriceCents": 0,
    "Currency": "USD",
    "FormattedPrice": "Gratis",
    "FeaturesJson": [
      "5 consultas médicas por mes",
      "Chat con médicos",
      "Historial médico básico"
    ],
    "MaxAppointments": 5,
    "IsActive": true
  },
  {
    "Id": "2",
    "Name": "Professional",
    "PriceCents": 2999,
    "Currency": "USD",
    "FormattedPrice": "$29.99",
    "FeaturesJson": [
      "20 consultas médicas por mes",
      "Videollamadas ilimitadas",
      "Historial médico completo",
      "Recetas digitales",
      "Soporte prioritario"
    ],
    "MaxAppointments": 20,
    "IsActive": true
  },
  {
    "Id": "3",
    "Name": "Premium",
    "PriceCents": 4999,
    "Currency": "USD",
    "FormattedPrice": "$49.99",
    "FeaturesJson": [
      "Consultas ilimitadas",
      "Videollamadas ilimitadas",
      "Historial médico completo",
      "Recetas digitales",
      "Soporte prioritario 24/7",
      "Acceso a especialistas",
      "Segunda opinión médica"
    ],
    "MaxAppointments": null,
    "IsActive": true
  }
]
```

**Implementación Frontend:**
```typescript
interface Plan {
  Id: string;
  Name: string;
  PriceCents: number;
  Currency: string;
  FormattedPrice: string;
  FeaturesJson: string[];
  MaxAppointments: number | null;
  IsActive: boolean;
}

async function getPlans(): Promise<Plan[]> {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/plans', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener planes');
  }

  return await response.json();
}
```

---

### 11.2 Simular Checkout (Crear Suscripción)

**Endpoint:** `POST /subscriptions/checkout`

**Autenticación:** Requerida (JWT)

**Roles:** `PATIENT`

**Nota Importante:** Este endpoint NO cobra dinero real. Es una simulación para pruebas.

**Body:**
```json
{
  "PlanId": 2,
  "DurationMonths": 1
}
```

**Campos:**
- `PlanId` (número): ID del plan a suscribirse
- `DurationMonths` (número, 1-12): Duración de la suscripción en meses

**Validaciones:**
- El plan debe existir y estar activo
- El usuario no debe tener otra suscripción activa
- DurationMonths debe ser entre 1-12

**Respuesta Exitosa (201):**
```json
{
  "Id": "5",
  "UserId": "1",
  "PlanId": "2",
  "StartAt": "2025-10-21T10:00:00Z",
  "ExpiresAt": "2025-11-21T10:00:00Z",
  "IsActive": true,
  "AutoRenew": true,
  "Plan": {
    "Name": "Professional",
    "PriceCents": 2999,
    "MaxAppointments": 20
  }
}
```

**Implementación Frontend:**
```typescript
interface CheckoutData {
  PlanId: number;
  DurationMonths: number;
}

async function checkout(data: CheckoutData) {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/subscriptions/checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al crear suscripción');
  }

  return await response.json();
}
```

---

### 11.3 Obtener Mi Suscripción Activa

**Endpoint:** `GET /subscriptions/me`

**Autenticación:** Requerida (JWT)

**Roles:** `PATIENT`

**Nota:** Si el usuario no tiene suscripción, se le asigna automáticamente el plan "Basic" gratuito.

**Respuesta Exitosa (200):**
```json
{
  "Id": "5",
  "UserId": "1",
  "PlanId": "2",
  "StartAt": "2025-10-21T10:00:00Z",
  "ExpiresAt": "2025-11-21T10:00:00Z",
  "IsActive": true,
  "AutoRenew": true,
  "Plan": {
    "Id": "2",
    "Name": "Professional",
    "PriceCents": 2999,
    "FormattedPrice": "$29.99",
    "MaxAppointments": 20,
    "FeaturesJson": [
      "20 consultas médicas por mes",
      "Videollamadas ilimitadas",
      "..."
    ]
  }
}
```

**Implementación Frontend:**
```typescript
async function getMySubscription() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/subscriptions/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener suscripción');
  }

  return await response.json();
}
```

---

### 11.4 Obtener Historial de Suscripciones

**Endpoint:** `GET /subscriptions/history`

**Autenticación:** Requerida (JWT)

**Roles:** `PATIENT`

**Respuesta Exitosa (200):**
```json
[
  {
    "Id": "5",
    "PlanId": "2",
    "StartAt": "2025-10-21T10:00:00Z",
    "ExpiresAt": "2025-11-21T10:00:00Z",
    "IsActive": true,
    "Plan": {
      "Name": "Professional"
    }
  },
  {
    "Id": "3",
    "PlanId": "1",
    "StartAt": "2025-09-01T10:00:00Z",
    "ExpiresAt": "2025-10-01T10:00:00Z",
    "IsActive": false,
    "Plan": {
      "Name": "Basic"
    }
  }
]
```

**Implementación Frontend:**
```typescript
async function getSubscriptionHistory() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/subscriptions/history', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener historial de suscripciones');
  }

  return await response.json();
}
```

---

### 11.5 Verificar Límite de Citas Disponibles

**Endpoint:** `GET /subscriptions/appointment-limit`

**Autenticación:** Requerida (JWT)

**Roles:** `PATIENT`

**Respuesta Exitosa (200):**

**Con límite (Plan Basic o Professional):**
```json
{
  "hasLimit": true,
  "remaining": 3
}
```

**Sin límite (Plan Premium):**
```json
{
  "hasLimit": false,
  "remaining": null
}
```

**Implementación Frontend:**
```typescript
interface AppointmentLimitResponse {
  hasLimit: boolean;
  remaining: number | null;
}

async function checkAppointmentLimit(): Promise<AppointmentLimitResponse> {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/subscriptions/appointment-limit', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al verificar límite de citas');
  }

  return await response.json();
}
```

---

### 11.6 Cancelar Suscripción

**Endpoint:** `DELETE /subscriptions/cancel`

**Autenticación:** Requerida (JWT)

**Roles:** `PATIENT`

**Nota Importante:**
- Esto NO desactiva la suscripción inmediatamente
- Solo desactiva la auto-renovación
- El usuario puede seguir usando el plan hasta su fecha de expiración
- Después de expirar, se asigna automáticamente el plan Basic
- No se puede cancelar el plan Basic (gratuito)

**Respuesta Exitosa (200):**
```json
{
  "Id": "5",
  "AutoRenew": false,
  "ExpiresAt": "2025-11-21T10:00:00Z",
  "message": "Suscripción cancelada. Seguirás teniendo acceso hasta el 2025-11-21."
}
```

**Implementación Frontend:**
```typescript
async function cancelSubscription() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/subscriptions/cancel', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al cancelar suscripción');
  }

  return await response.json();
}
```

---

## 12. Video Conferencia

### 12.1 Crear/Asegurar Sala de Video

**Endpoint:** `POST /appointments/:id/video`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Descripción:** Crea una sala de video en LiveKit para la cita y guarda el `SfuRoomId` en la base de datos.

**Respuesta Exitosa (200):**
```json
{
  "AppointmentId": "10",
  "SfuRoomId": "appointment-10-room",
  "message": "Sala de video creada exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function ensureVideoRoom(appointmentId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}/video`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al crear sala de video');
  }

  return await response.json();
}
```

---

### 12.2 Obtener Token de Acceso a Video

**Endpoint:** `GET /appointments/:id/video/token`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Descripción:** Genera un token JWT de LiveKit para que el usuario pueda unirse a la sala de video.

**Respuesta Exitosa (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "url": "wss://livekit.example.com",
  "roomName": "appointment-10-room"
}
```

**Implementación Frontend:**
```typescript
interface VideoTokenResponse {
  token: string;
  url: string;
  roomName: string;
}

async function getVideoToken(appointmentId: string): Promise<VideoTokenResponse> {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}/video/token`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener token de video');
  }

  return await response.json();
}
```

**Integración con LiveKit Client (React):**
```typescript
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

function VideoCallComponent({ appointmentId }: { appointmentId: string }) {
  const [videoToken, setVideoToken] = useState<VideoTokenResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Primero asegurar que la sala exista
    ensureVideoRoom(appointmentId)
      .then(() => getVideoToken(appointmentId))
      .then(setVideoToken)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading || !videoToken) {
    return <div>Cargando videollamada...</div>;
  }

  return (
    <LiveKitRoom
      token={videoToken.token}
      serverUrl={videoToken.url}
      connect={true}
      video={true}
      audio={true}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}
```

---

### 12.3 Terminar Sala de Video (Opcional)

**Endpoint:** `DELETE /appointments/:id/video`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`

**Descripción:** Termina la sala de video en LiveKit y limpia el `SfuRoomId`.

**Respuesta Exitosa (200):**
```json
{
  "message": "Sala de video terminada exitosamente"
}
```

**Implementación Frontend:**
```typescript
async function endVideoRoom(appointmentId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/appointments/${appointmentId}/video`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al terminar sala de video');
  }

  return await response.json();
}
```

---

## 13. Traducción

### 13.1 Traducir Mensaje

**Endpoint:** `POST /messages/:id/translate`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Body:**
```json
{
  "language": "en"
}
```

**Idiomas Soportados:**
- `en` - Inglés
- `es` - Español
- `fr` - Francés
- `pt` - Portugués

**Respuesta Exitosa (200):**
```json
{
  "TranslationId": "30",
  "MessageId": "25",
  "Language": "en",
  "TranslatedContent": "Hello, how are you?",
  "CreatedAt": "2025-10-25T14:35:00Z"
}
```

**Implementación Frontend:**
```typescript
async function translateMessage(messageId: string, language: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/messages/${messageId}/translate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ language }),
  });

  if (!response.ok) {
    throw new Error('Error al traducir mensaje');
  }

  return await response.json();
}
```

---

### 13.2 Listar Traducciones de un Mensaje

**Endpoint:** `GET /messages/:id/translate`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`, `DOCTOR`, `PATIENT`

**Respuesta Exitosa (200):**
```json
[
  {
    "TranslationId": "30",
    "MessageId": "25",
    "Language": "en",
    "TranslatedContent": "Hello, how are you?",
    "CreatedAt": "2025-10-25T14:35:00Z"
  },
  {
    "TranslationId": "31",
    "MessageId": "25",
    "Language": "fr",
    "TranslatedContent": "Bonjour, comment allez-vous?",
    "CreatedAt": "2025-10-25T14:36:00Z"
  }
]
```

**Implementación Frontend:**
```typescript
async function getMessageTranslations(messageId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/messages/${messageId}/translate`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener traducciones');
  }

  return await response.json();
}
```

---

## 14. Panel de Administración

### 14.1 Estadísticas Generales del Dashboard

**Endpoint:** `GET /admin/dashboard/stats`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Respuesta Exitosa (200):**
```json
{
  "users": {
    "total": 150,
    "patients": 120,
    "doctors": 25,
    "admins": 5
  },
  "doctors": {
    "pending": 5,
    "approved": 18,
    "rejected": 2
  },
  "appointments": {
    "total": 300,
    "scheduled": 50,
    "completed": 200,
    "cancelled": 50,
    "in_progress": 0
  },
  "subscriptions": {
    "active": 80,
    "revenue": 150000
  },
  "newUsers": {
    "today": 3,
    "thisWeek": 15,
    "thisMonth": 45
  }
}
```

**Implementación Frontend:**
```typescript
async function getDashboardStats() {
  const token = localStorage.getItem('access_token');

  const response = await fetch('http://localhost:3000/admin/dashboard/stats', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener estadísticas');
  }

  return await response.json();
}
```

---

### 14.2 Citas por Estado

**Endpoint:** `GET /admin/dashboard/appointments-by-status`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Respuesta Exitosa (200):**
```json
[
  {
    "status": "completed",
    "count": 200,
    "percentage": 66.67
  },
  {
    "status": "scheduled",
    "count": 50,
    "percentage": 16.67
  },
  {
    "status": "cancelled",
    "count": 50,
    "percentage": 16.67
  }
]
```

---

### 14.3 Suscripciones por Plan

**Endpoint:** `GET /admin/dashboard/subscriptions-by-plan`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Respuesta Exitosa (200):**
```json
[
  {
    "planName": "Basic",
    "activeSubscriptions": 40,
    "totalRevenue": 0
  },
  {
    "planName": "Professional",
    "activeSubscriptions": 30,
    "totalRevenue": 89970
  },
  {
    "planName": "Premium",
    "activeSubscriptions": 10,
    "totalRevenue": 49990
  }
]
```

---

### 14.4 Actividad de Usuarios

**Endpoint:** `GET /admin/dashboard/user-activity?days=30`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Query Parameters:**
- `days` (opcional, número, default: 30): Número de días a consultar

**Respuesta Exitosa (200):**
```json
[
  {
    "date": "2025-10-01",
    "newUsers": 3
  },
  {
    "date": "2025-10-02",
    "newUsers": 5
  }
]
```

---

### 14.5 Top Doctores

**Endpoint:** `GET /admin/dashboard/top-doctors?limit=10`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Query Parameters:**
- `limit` (opcional, número, default: 10): Número de doctores a retornar

**Respuesta Exitosa (200):**
```json
[
  {
    "UserId": "2",
    "DoctorName": "Dr. María González",
    "Email": "maria@ejemplo.com",
    "LicenseNumber": "MED-12345",
    "CompletedAppointments": 50,
    "TotalAppointments": 55
  }
]
```

---

### 14.6 Logs de Auditoría

**Endpoint:** `GET /admin/dashboard/audit-logs?limit=50`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Query Parameters:**
- `limit` (opcional, número, default: 50): Número de logs a retornar

**Respuesta Exitosa (200):**
```json
[
  {
    "LogId": "100",
    "UserId": "2",
    "ResourceType": "MedicalRecord",
    "Action": "READ",
    "IpAddress": "192.168.1.1",
    "UserAgent": "Mozilla/5.0...",
    "CreatedAt": "2025-10-25T15:00:00Z",
    "User": {
      "Email": "doctor@ejemplo.com"
    }
  }
]
```

---

### 14.7 Listar Usuarios con Filtros

**Endpoint:** `GET /admin/users`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Query Parameters:**
- `role` (opcional, "ADMIN" | "DOCTOR" | "PATIENT"): Filtrar por rol
- `isEmailVerified` (opcional, boolean): Filtrar por email verificado
- `verificationStatus` (opcional, "pending" | "approved" | "rejected"): Filtrar por estado de verificación (solo doctores)
- `search` (opcional, string): Búsqueda por nombre o email
- `page` (opcional, número, default: 1): Número de página
- `limit` (opcional, número, default: 20): Resultados por página

**Ejemplo URL:**
```
GET /admin/users?role=DOCTOR&verificationStatus=pending&page=1&limit=10
```

**Respuesta Exitosa (200):**
```json
{
  "data": [
    {
      "UserId": "5",
      "Email": "doctor@ejemplo.com",
      "FirstName": "Juan",
      "LastName1": "Pérez",
      "Role": "DOCTOR",
      "IsEmailVerified": true,
      "IsBanned": false,
      "CreatedAt": "2025-10-20T10:00:00Z",
      "DoctorProfile": {
        "LicenseNumber": "MED-12345",
        "VerificationStatus": "pending"
      }
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

**Implementación Frontend:**
```typescript
interface UserFilters {
  role?: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  isEmailVerified?: boolean;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  search?: string;
  page?: number;
  limit?: number;
}

async function listUsers(filters: UserFilters = {}) {
  const token = localStorage.getItem('access_token');

  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });

  const url = `http://localhost:3000/admin/users${params.toString() ? '?' + params.toString() : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al listar usuarios');
  }

  return await response.json();
}
```

---

### 14.8 Obtener Detalles de Usuario

**Endpoint:** `GET /admin/users/:userId`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Respuesta Exitosa (200):**
```json
{
  "UserId": "5",
  "Email": "doctor@ejemplo.com",
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "Role": "DOCTOR",
  "IsEmailVerified": true,
  "IsBanned": false,
  "BanReason": null,
  "CreatedAt": "2025-10-20T10:00:00Z",
  "DoctorProfile": {
    "LicenseNumber": "MED-12345",
    "Bio": "Especialista en medicina interna",
    "YearsExperience": 10,
    "VerificationStatus": "approved"
  },
  "stats": {
    "totalAppointments": 50,
    "completedAppointments": 45,
    "cancelledAppointments": 5
  }
}
```

**Implementación Frontend:**
```typescript
async function getUserDetails(userId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/admin/users/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener detalles de usuario');
  }

  return await response.json();
}
```

---

### 14.9 Banear Usuario

**Endpoint:** `POST /admin/users/:userId/ban`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Nota:** No se pueden banear otros administradores.

**Body:**
```json
{
  "Reason": "Violación de términos de servicio: spam en consultas médicas"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Usuario baneado exitosamente",
  "UserId": "5",
  "IsBanned": true,
  "BanReason": "Violación de términos de servicio: spam en consultas médicas"
}
```

**Implementación Frontend:**
```typescript
async function banUser(userId: string, reason: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/admin/users/${userId}/ban`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Reason: reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al banear usuario');
  }

  return await response.json();
}
```

---

### 14.10 Desbanear Usuario

**Endpoint:** `POST /admin/users/:userId/unban`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Respuesta Exitosa (200):**
```json
{
  "message": "Usuario desbaneado exitosamente",
  "UserId": "5",
  "IsBanned": false
}
```

**Implementación Frontend:**
```typescript
async function unbanUser(userId: string) {
  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/admin/users/${userId}/unban`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al desbanear usuario');
  }

  return await response.json();
}
```

---

### 14.11 Eliminar Usuario Permanentemente

**Endpoint:** `DELETE /admin/users/:userId`

**Autenticación:** Requerida (JWT)

**Roles:** `ADMIN`

**Advertencia:** Esta acción es IRREVERSIBLE. Se eliminan todos los datos relacionados:
- Historiales médicos
- Citas
- Suscripciones
- Mensajes
- Archivos
- Logs de auditoría

**Nota:** No se pueden eliminar otros administradores.

**Respuesta Exitosa (200):**
```json
{
  "message": "Usuario eliminado permanentemente",
  "UserId": "5"
}
```

**Implementación Frontend:**
```typescript
async function deleteUser(userId: string) {
  // Confirmación antes de eliminar
  const confirmed = window.confirm(
    '¿Estás seguro? Esta acción es IRREVERSIBLE y eliminará todos los datos del usuario.'
  );

  if (!confirmed) return;

  const token = localStorage.getItem('access_token');

  const response = await fetch(`http://localhost:3000/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Error al eliminar usuario');
  }

  return await response.json();
}
```

---

## 15. WebSockets

### Conexión a WebSocket para Mensajería en Tiempo Real

**URL:** `ws://localhost:3000` o `wss://your-domain.com` (en producción)

**Autenticación:** Se envía el token JWT al conectar

**Eventos del Cliente al Servidor:**

#### 15.1 Unirse a una Conversación
```typescript
socket.emit('joinConversation', { conversationId: '3' });
```

#### 15.2 Enviar Mensaje
```typescript
socket.emit('sendMessage', {
  conversationId: '3',
  content: 'Hola, ¿cómo está?',
  language: 'es'
});
```

**Eventos del Servidor al Cliente:**

#### 15.3 Nuevo Mensaje Recibido
```typescript
socket.on('newMessage', (message) => {
  console.log('Nuevo mensaje:', message);
  // message: { MessageId, ConversationId, SenderUserId, Content, CreatedAt, ... }
});
```

#### 15.4 Mensaje Enviado Confirmación
```typescript
socket.on('messageSent', (message) => {
  console.log('Mensaje enviado:', message);
});
```

#### 15.5 Error
```typescript
socket.on('error', (error) => {
  console.error('Error:', error.message);
});
```

**Implementación Frontend Completa (Socket.io Client):**

```typescript
import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

interface Message {
  MessageId: string;
  ConversationId: string;
  SenderUserId: string;
  Content: string;
  Language: string | null;
  CreatedAt: string;
  Sender: {
    FirstName: string;
    LastName1: string;
  };
}

// Hook personalizado para WebSocket
function useWebSocket(conversationId: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      console.error('No hay token de autenticación');
      return;
    }

    // Conectar al servidor WebSocket
    const newSocket = io('http://localhost:3000', {
      auth: {
        token: token,
      },
    });

    // Eventos de conexión
    newSocket.on('connect', () => {
      console.log('Conectado a WebSocket');
      setIsConnected(true);

      // Unirse a la conversación
      newSocket.emit('joinConversation', { conversationId });
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado de WebSocket');
      setIsConnected(false);
    });

    // Evento: Nuevo mensaje recibido
    newSocket.on('newMessage', (message: Message) => {
      console.log('Nuevo mensaje recibido:', message);
      setMessages((prev) => [...prev, message]);
    });

    // Evento: Mensaje enviado confirmación
    newSocket.on('messageSent', (message: Message) => {
      console.log('Mensaje enviado:', message);
      // El mensaje ya está en la lista por 'newMessage'
    });

    // Evento: Error
    newSocket.on('error', (error: { message: string }) => {
      console.error('Error WebSocket:', error.message);
    });

    setSocket(newSocket);

    // Cleanup al desmontar
    return () => {
      newSocket.close();
    };
  }, [conversationId]);

  // Función para enviar mensaje
  const sendMessage = (content: string, language: string | null = 'es') => {
    if (!socket || !isConnected) {
      console.error('Socket no conectado');
      return;
    }

    socket.emit('sendMessage', {
      conversationId,
      content,
      language,
    });
  };

  return { socket, messages, isConnected, sendMessage };
}

// Componente de Chat
function ChatComponent({ conversationId }: { conversationId: string }) {
  const { messages, isConnected, sendMessage } = useWebSocket(conversationId);
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div>
      <div>Estado: {isConnected ? 'Conectado' : 'Desconectado'}</div>

      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.MessageId}>
            <strong>{msg.Sender.FirstName}:</strong> {msg.Content}
          </div>
        ))}
      </div>

      <div className="input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>Enviar</button>
      </div>
    </div>
  );
}
```

**Instalación de Socket.io Client:**
```bash
npm install socket.io-client
```

---

## 16. Códigos de Error Comunes

### Errores de Autenticación

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "message": "Token inválido o expirado"
}
```

**Solución:** Refrescar el token usando `/auth/refresh` o redirigir al login.

---

### Errores de Autorización

**403 Forbidden**
```json
{
  "statusCode": 403,
  "message": "No tienes permisos para acceder a este recurso"
}
```

**Solución:** Verificar que el usuario tenga el rol correcto.

---

### Errores de Validación

**400 Bad Request**
```json
{
  "statusCode": 400,
  "message": [
    "Email must be a valid email address",
    "Password must be at least 8 characters"
  ],
  "error": "Bad Request"
}
```

**Solución:** Corregir los datos enviados según los mensajes de error.

---

### Errores de No Encontrado

**404 Not Found**
```json
{
  "statusCode": 404,
  "message": "Recurso no encontrado"
}
```

---

### Errores del Servidor

**500 Internal Server Error**
```json
{
  "statusCode": 500,
  "message": "Error interno del servidor"
}
```

---

## 17. Clase Utilitaria para API (Recomendada)

Para facilitar el uso de todos estos endpoints, se recomienda crear una clase utilitaria:

```typescript
// api/client.ts
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private getHeaders(includeAuth: boolean = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeAuth: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(includeAuth),
        ...options.headers,
      },
    });

    // Manejar errores 401 (token expirado)
    if (response.status === 401 && includeAuth) {
      const newToken = await this.refreshToken();

      // Reintentar con el nuevo token
      return this.request<T>(endpoint, options, true);
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Error ${response.status}`);
    }

    return await response.json();
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('No hay refresh token');
    }

    const result = await this.request<{ access_token: string; refresh_token: string }>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      },
      false
    );

    localStorage.setItem('access_token', result.access_token);
    localStorage.setItem('refresh_token', result.refresh_token);

    return result.access_token;
  }

  // AUTH
  async register(data: RegisterData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  }

  async login(data: LoginData) {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }, false);
  }

  // USERS
  async getMyProfile() {
    return this.request('/users/me');
  }

  async updateMyProfile(data: UpdateProfileData) {
    return this.request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // APPOINTMENTS
  async createAppointment(data: CreateAppointmentData) {
    return this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAppointments(filters?: AppointmentFilters) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/appointments${query}`);
  }

  async getAppointmentDetail(id: string) {
    return this.request(`/appointments/${id}`);
  }

  async updateAppointmentStatus(id: string, status: AppointmentStatus) {
    return this.request(`/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ Status: status }),
    });
  }

  // ... Agregar más métodos según necesites
}

// Exportar instancia singleton
export const api = new ApiClient();

// Uso:
// import { api } from './api/client';
// const appointments = await api.getAppointments({ status: 'scheduled' });
```

---

## 18. Manejo Global de Errores (Recomendado)

```typescript
// utils/errorHandler.ts
export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    // Mostrar mensaje de error al usuario
    if (error.message.includes('401') || error.message.includes('Token')) {
      // Sesión expirada
      localStorage.clear();
      window.location.href = '/login';
      return 'Sesión expirada. Por favor inicia sesión nuevamente.';
    }

    if (error.message.includes('403')) {
      return 'No tienes permisos para realizar esta acción.';
    }

    if (error.message.includes('404')) {
      return 'Recurso no encontrado.';
    }

    if (error.message.includes('500')) {
      return 'Error del servidor. Por favor intenta más tarde.';
    }

    return error.message;
  }

  return 'Error desconocido';
}

// Uso en componentes:
try {
  await api.createAppointment(data);
  toast.success('Cita creada exitosamente');
} catch (error) {
  const errorMessage = handleApiError(error);
  toast.error(errorMessage);
}
```

---

## 19. Context Provider para Autenticación (React)

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../api/client';

interface User {
  UserId: string;
  Email: string;
  FirstName: string;
  LastName1: string;
  Role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Cargar usuario del localStorage al iniciar
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.login({ Email: email, Password: password });
    setUser(result.user);
    localStorage.setItem('user', JSON.stringify(result.user));
    localStorage.setItem('access_token', result.access_token);
    localStorage.setItem('refresh_token', result.refresh_token);
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    const userData = await api.getMyProfile();
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

// Uso:
// function MyComponent() {
//   const { user, isAuthenticated, logout } = useAuth();
//
//   if (!isAuthenticated) {
//     return <Navigate to="/login" />;
//   }
//
//   return <div>Hola, {user?.FirstName}</div>;
// }
```

---

## 20. Notas Finales

### Variables de Entorno Requeridas

Asegúrate de tener configurado el archivo `.env` con las siguientes variables:

```env
# Base de datos
DATABASE_URL="mysql://usuario:password@localhost:3306/telemed"

# JWT
JWT_ACCESS_SECRET="tu_secret_muy_seguro_aqui"
JWT_REFRESH_SECRET="tu_refresh_secret_muy_seguro_aqui"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="tu_cloud_name"
CLOUDINARY_API_KEY="tu_api_key"
CLOUDINARY_API_SECRET="tu_api_secret"

# Email (Mailgun)
MAILGUN_DOMAIN="tu_dominio.mailgun.org"
MAILGUN_API_KEY="tu_mailgun_api_key"

# Cifrado de datos sensibles
ENCRYPTION_SECRET="tu_encryption_secret_de_32_caracteres"

# LiveKit (Video)
LIVEKIT_URL="wss://tu-livekit-server.com"
LIVEKIT_API_KEY="tu_livekit_api_key"
LIVEKIT_API_SECRET="tu_livekit_api_secret"

# Frontend URL
FRONTEND_URL="http://localhost:5173"
```

### Rate Limiting

El backend tiene **rate limiting** configurado: **100 requests por minuto** por IP.

Si excedes este límite, recibirás un error **429 Too Many Requests**.

### CORS

El backend tiene CORS habilitado. Asegúrate de que tu frontend esté corriendo en el puerto correcto o configura `FRONTEND_URL` en el `.env`.

### Seguridad

- Todos los **historiales médicos** se cifran automáticamente con **AES-256**
- Todos los accesos a datos sensibles se **auditan** (HIPAA/GDPR compliance)
- Las contraseñas se hashean con **bcrypt**
- Los tokens JWT expiran (15 minutos para access_token, 7 días para refresh_token)

### Soporte de Idiomas

El backend soporta internacionalización (i18n) con los siguientes idiomas:
- Inglés (en)
- Español (es)
- Francés (fr)
- Portugués (pt)

---

**Documentación generada para el proyecto Telemed Backend**

**Fecha:** 2025-10-21

**Versión:** 1.0

Para más información, consulta los archivos en [`docs/documentacion/`](docs/documentacion/) o los archivos de prueba HTTP en [`docs/https/`](docs/https/).
