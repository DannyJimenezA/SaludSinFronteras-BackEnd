# 🧪 GUÍA COMPLETA DE PRUEBAS - Backend Telemedicina

## 📋 Índice
1. [Configuración Inicial](#1-configuración-inicial)
2. [Crear Usuarios de Prueba](#2-crear-usuarios-de-prueba)
3. [Obtener Tokens JWT](#3-obtener-tokens-jwt)
4. [Pruebas Fase 1: Infraestructura](#4-pruebas-fase-1-infraestructura)
5. [Pruebas Fase 2: Historiales Médicos](#5-pruebas-fase-2-historiales-médicos)
6. [Pruebas Fase 3: Suscripciones](#6-pruebas-fase-3-suscripciones)
7. [Verificar Auditoría](#7-verificar-auditoría)

---

## 1. Configuración Inicial

### 1.1 Iniciar el servidor
```bash
npm run start:dev
```

### 1.2 Variables que necesitarás
A medida que avances, guarda estos valores:

```bash
# Tokens JWT (obtendrás en paso 3)
ADMIN_TOKEN=
DOCTOR_TOKEN=
PATIENT_TOKEN=

# IDs de usuarios (obtendrás en paso 2)
ADMIN_ID=
DOCTOR_ID=
PATIENT_ID=

# IDs de registros (obtendrás durante las pruebas)
MEDICAL_RECORD_ID=
SUBSCRIPTION_ID=
```

---

## 2. Crear Usuarios de Prueba

### 2.1 Crear Usuario ADMIN

**Endpoint:** `POST http://localhost:3000/auth/register`

**Body:**
```json
{
  "Email": "admin@telemedicina.com",
  "Password": "Admin123!",
  "PasswordConfirm": "Admin123!",
  "FirstName": "Admin",
  "LastName1": "Principal",
  "LastName2": "Sistema",
  "Role": "ADMIN",
  "DateOfBirth": "1990-01-01",
  "Phone": "+50612345678",
  "GenderId": 1,
  "IdentificationTypeId": 1,
  "Identification": "101110111",
  "NationalityId": 1,
  "ResidenceCountryId": 1,
  "NativeLanguageId": 1
}
```

**Respuesta esperada:**
```json
{
  "message": "Usuario registrado exitosamente. Por favor verifica tu email.",
  "userId": "1"  // ⬅️ Guarda este ID como ADMIN_ID
}
```

**Nota importante:** Si tu sistema requiere verificación de email, necesitarás verificar el usuario primero. Puedes hacerlo directamente en la base de datos:

```sql
UPDATE UsersAuth SET IsEmailVerified = 1 WHERE UserId = 1;
```

### 2.2 Crear Usuario DOCTOR

**Endpoint:** `POST http://localhost:3000/auth/register`

**Body:**
```json
{
  "Email": "doctor@telemedicina.com",
  "Password": "Doctor123!",
  "PasswordConfirm": "Doctor123!",
  "FirstName": "Juan",
  "LastName1": "Pérez",
  "LastName2": "García",
  "Role": "DOCTOR",
  "DateOfBirth": "1985-05-15",
  "Phone": "+50687654321",
  "GenderId": 1,
  "IdentificationTypeId": 1,
  "Identification": "202220222",
  "NationalityId": 1,
  "ResidenceCountryId": 1,
  "NativeLanguageId": 1
}
```

**Respuesta esperada:**
```json
{
  "message": "Usuario registrado exitosamente. Por favor verifica tu email.",
  "userId": "2"  // ⬅️ Guarda este ID como DOCTOR_ID
}
```

**Verificar email (si es necesario):**
```sql
UPDATE UsersAuth SET IsEmailVerified = 1 WHERE UserId = 2;
```

### 2.3 Crear Usuario PATIENT

**Endpoint:** `POST http://localhost:3000/auth/register`

**Body:**
```json
{
  "Email": "paciente@telemedicina.com",
  "Password": "Paciente123!",
  "PasswordConfirm": "Paciente123!",
  "FirstName": "María",
  "LastName1": "González",
  "LastName2": "López",
  "Role": "PATIENT",
  "DateOfBirth": "1995-08-20",
  "Phone": "+50611223344",
  "GenderId": 2,
  "IdentificationTypeId": 1,
  "Identification": "303330333",
  "NationalityId": 1,
  "ResidenceCountryId": 1,
  "NativeLanguageId": 1
}
```

**Respuesta esperada:**
```json
{
  "message": "Usuario registrado exitosamente. Por favor verifica tu email.",
  "userId": "3"  // ⬅️ Guarda este ID como PATIENT_ID
}
```

**Verificar email (si es necesario):**
```sql
UPDATE UsersAuth SET IsEmailVerified = 1 WHERE UserId = 3;
```

---

## 3. Obtener Tokens JWT

### 3.1 Login como ADMIN

**Endpoint:** `POST http://localhost:3000/auth/login`

**Body:**
```json
{
  "Email": "admin@telemedicina.com",
  "Password": "Admin123!"
}
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // ⬅️ Guarda como ADMIN_TOKEN
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "Id": "1",
    "Email": "admin@telemedicina.com",
    "FullName": "Admin Principal",
    "Role": "ADMIN"
  }
}
```

### 3.2 Login como DOCTOR

**Endpoint:** `POST http://localhost:3000/auth/login`

**Body:**
```json
{
  "Email": "doctor@telemedicina.com",
  "Password": "Doctor123!"
}
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // ⬅️ Guarda como DOCTOR_TOKEN
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "Id": "2",
    "Email": "doctor@telemedicina.com",
    "FullName": "Dr. Juan Pérez",
    "Role": "DOCTOR"
  }
}
```

### 3.3 Login como PATIENT

**Endpoint:** `POST http://localhost:3000/auth/login`

**Body:**
```json
{
  "Email": "paciente@telemedicina.com",
  "Password": "Paciente123!"
}
```

**Respuesta esperada:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // ⬅️ Guarda como PATIENT_TOKEN
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "Id": "3",
    "Email": "paciente@telemedicina.com",
    "FullName": "María González",
    "Role": "PATIENT"
  }
}
```

---

## 4. Pruebas Fase 1: Infraestructura

### 4.1 Verificar Rate Limiting (Cualquier usuario)

**Acción:** Haz más de 100 peticiones en 1 minuto

**Endpoint:** `GET http://localhost:3000/` (cualquier endpoint)

**Respuesta esperada (después de 100 requests):**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

### 4.2 Verificar i18n - Español (Default)

**Endpoint:** `GET http://localhost:3000/`

**Headers:**
```
Accept-Language: es
```

**O por query:**
```
GET http://localhost:3000/?lang=es
```

### 4.3 Verificar i18n - Inglés

**Endpoint:** `GET http://localhost:3000/`

**Headers:**
```
Accept-Language: en
```

**O por query:**
```
GET http://localhost:3000/?lang=en
```

---

## 5. Pruebas Fase 2: Historiales Médicos

### 5.1 Crear Historial Médico (ROL: DOCTOR)

**Endpoint:** `POST http://localhost:3000/medical-records`

**Headers:**
```
Authorization: Bearer {DOCTOR_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "PatientUserId": 3,
  "Diagnosis": "Paciente presenta síntomas de gripe común con fiebre leve de 38°C y congestión nasal. Se recomienda reposo.",
  "Prescriptions": "Paracetamol 500mg cada 8 horas por 3 días. Ibuprofeno 400mg si persiste la fiebre.",
  "Recommendations": "Reposo absoluto por 3 días, aumentar ingesta de líquidos (mínimo 2 litros de agua al día), evitar cambios bruscos de temperatura.",
  "Files": ["uploads/receta-2025-10-20.pdf", "uploads/analisis-sangre.pdf"]
}
```

**Respuesta esperada:**
```json
{
  "Id": "1",  // ⬅️ Guarda como MEDICAL_RECORD_ID
  "PatientUserId": "3",
  "DoctorUserId": "2",
  "Diagnosis": "Paciente presenta síntomas de gripe común...",
  "Prescriptions": "Paracetamol 500mg cada 8 horas...",
  "Recommendations": "Reposo absoluto por 3 días...",
  "Files": ["uploads/receta-2025-10-20.pdf", "uploads/analisis-sangre.pdf"],
  "CreatedAt": "2025-10-20T10:00:00.000Z"
}
```

**Nota:** Los datos están **encriptados** en la base de datos, pero **desencriptados** en la respuesta.

### 5.2 Ver Historial Médico Específico (ROL: DOCTOR que lo creó)

**Endpoint:** `GET http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {DOCTOR_TOKEN}
```

**Respuesta esperada:**
```json
{
  "Id": "1",
  "PatientUserId": "3",
  "DoctorUserId": "2",
  "Diagnosis": "Paciente presenta síntomas de gripe común...",
  "Prescriptions": "Paracetamol 500mg cada 8 horas...",
  "Recommendations": "Reposo absoluto por 3 días...",
  "Files": ["uploads/receta-2025-10-20.pdf", "uploads/analisis-sangre.pdf"],
  "CreatedAt": "2025-10-20T10:00:00.000Z"
}
```

### 5.3 Ver Historial Médico Específico (ROL: PATIENT dueño)

**Endpoint:** `GET http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:** Igual que arriba (el paciente puede ver sus propios historiales)

### 5.4 Ver Historial Médico Específico (ROL: ADMIN)

**Endpoint:** `GET http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Respuesta esperada:** Igual que arriba (ADMIN tiene acceso total)

### 5.5 Intentar Ver Historial de Otro Paciente (ROL: PATIENT) ❌

**Endpoint:** `GET http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {OTRO_PATIENT_TOKEN}
```

**Respuesta esperada:**
```json
{
  "statusCode": 403,
  "message": "No tienes permiso para ver este historial médico"
}
```

### 5.6 Ver Todos los Historiales de un Paciente (ROL: PATIENT)

**Endpoint:** `GET http://localhost:3000/medical-records/patient/3`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:**
```json
[
  {
    "Id": "1",
    "Diagnosis": "Paciente presenta síntomas de gripe común...",
    "CreatedAt": "2025-10-20T10:00:00.000Z"
  }
]
```

### 5.7 Actualizar Historial Médico (ROL: DOCTOR que lo creó)

**Endpoint:** `PATCH http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {DOCTOR_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "Diagnosis": "Actualización: Paciente evolucionó favorablemente, la fiebre disminuyó a 37.5°C. Se mantiene el tratamiento.",
  "Recommendations": "Continuar con el reposo por 2 días más. Control de temperatura cada 6 horas."
}
```

**Respuesta esperada:**
```json
{
  "Id": "1",
  "Diagnosis": "Actualización: Paciente evolucionó favorablemente...",
  "Prescriptions": "Paracetamol 500mg cada 8 horas...",  // Se mantiene
  "Recommendations": "Continuar con el reposo por 2 días más...",
  "UpdatedAt": "2025-10-20T15:00:00.000Z"
}
```

### 5.8 Intentar Actualizar Historial de Otro Doctor (ROL: DOCTOR) ❌

**Endpoint:** `PATCH http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {OTRO_DOCTOR_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "Diagnosis": "Intento de actualización no autorizada"
}
```

**Respuesta esperada:**
```json
{
  "statusCode": 403,
  "message": "Solo puedes actualizar tus propios historiales médicos"
}
```

### 5.9 Eliminar Historial Médico (ROL: ADMIN)

**Endpoint:** `DELETE http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Respuesta esperada:**
```json
{
  "message": "Historial médico eliminado exitosamente"
}
```

### 5.10 Intentar Eliminar Historial (ROL: PATIENT) ❌

**Endpoint:** `DELETE http://localhost:3000/medical-records/1`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## 6. Pruebas Fase 3: Suscripciones

### 6.1 Seed de Planes (ROL: ADMIN) - Ejecutar UNA SOLA VEZ

**Endpoint:** `POST http://localhost:3000/plans/seed`

**Headers:**
```
Authorization: Bearer {ADMIN_TOKEN}
```

**Respuesta esperada:**
```json
{
  "message": "3 planes creados/verificados exitosamente",
  "plans": [
    {
      "Id": "1",
      "Name": "Basic",
      "PriceCents": 0,
      "Currency": "USD",
      "FormattedPrice": "Gratis",
      "FeaturesJson": [
        "5 consultas médicas por mes",
        "Chat de texto con doctores",
        "Acceso a historial médico básico",
        "Soporte por email"
      ],
      "MaxAppointments": 5,
      "IsActive": true
    },
    {
      "Id": "2",
      "Name": "Professional",
      "PriceCents": 2999,
      "Currency": "USD",
      "FormattedPrice": "$29.99 USD/mes",
      "FeaturesJson": [
        "20 consultas médicas por mes",
        "Videollamadas HD con doctores",
        "Historial médico completo con exportación",
        "Soporte prioritario 24/7",
        "Recordatorios de citas por SMS"
      ],
      "MaxAppointments": 20,
      "IsActive": true
    },
    {
      "Id": "3",
      "Name": "Premium",
      "PriceCents": 9999,
      "Currency": "USD",
      "FormattedPrice": "$99.99 USD/mes",
      "FeaturesJson": [
        "Consultas médicas ilimitadas",
        "Videollamadas 4K con grabación",
        "Segunda opinión médica incluida",
        "Acceso a especialistas sin espera",
        "Consultas de emergencia 24/7",
        "Análisis con IA de síntomas"
      ],
      "MaxAppointments": null,
      "IsActive": true
    }
  ]
}
```

### 6.2 Listar Todos los Planes (ROL: PATIENT)

**Endpoint:** `GET http://localhost:3000/plans`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:** Igual que arriba (array de 3 planes)

### 6.3 Ver Mi Suscripción Activa (ROL: PATIENT) - Primera vez

**Endpoint:** `GET http://localhost:3000/subscriptions/me`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada (asigna plan Basic automáticamente):**
```json
{
  "Id": "1",
  "UserId": "3",
  "PlanId": "1",
  "StartAt": "2025-10-20T10:00:00.000Z",
  "ExpiresAt": null,
  "IsActive": true,
  "AutoRenew": false,
  "CreatedAt": "2025-10-20T10:00:00.000Z",
  "UpdatedAt": "2025-10-20T10:00:00.000Z",
  "Plan": {
    "Id": "1",
    "Name": "Basic",
    "PriceCents": 0,
    "Currency": "USD",
    "FeaturesJson": ["5 consultas médicas por mes", ...],
    "MaxAppointments": 5
  }
}
```

### 6.4 Simular Checkout - Plan Professional (ROL: PATIENT)

**IMPORTANTE:** Primero debes cancelar o eliminar la suscripción Basic actual.

**Paso 1: Eliminar suscripción Basic en la BD (temporalmente para pruebas):**
```sql
DELETE FROM Subscriptions WHERE UserId = 3;
```

**Paso 2: Hacer checkout:**

**Endpoint:** `POST http://localhost:3000/subscriptions/checkout`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "PlanId": 2,
  "DurationMonths": 1
}
```

**Respuesta esperada:**
```json
{
  "Id": "2",  // ⬅️ Guarda como SUBSCRIPTION_ID
  "UserId": "3",
  "PlanId": "2",
  "StartAt": "2025-10-20T10:00:00.000Z",
  "ExpiresAt": "2025-11-20T10:00:00.000Z",
  "IsActive": true,
  "AutoRenew": true,
  "CreatedAt": "2025-10-20T10:00:00.000Z",
  "UpdatedAt": "2025-10-20T10:00:00.000Z",
  "Plan": {
    "Id": "2",
    "Name": "Professional",
    "PriceCents": 2999,
    "Currency": "USD",
    "FeaturesJson": ["20 consultas médicas por mes", ...],
    "MaxAppointments": 20
  }
}
```

### 6.5 Intentar Hacer Otro Checkout (ROL: PATIENT) ❌

**Endpoint:** `POST http://localhost:3000/subscriptions/checkout`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "PlanId": 3,
  "DurationMonths": 1
}
```

**Respuesta esperada:**
```json
{
  "statusCode": 409,
  "message": "Ya tienes una suscripción activa. Cancélala primero para cambiar de plan."
}
```

### 6.6 Verificar Límite de Citas (ROL: PATIENT)

**Endpoint:** `GET http://localhost:3000/subscriptions/appointment-limit`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada (plan Professional, sin citas agendadas):**
```json
{
  "hasLimit": true,
  "remaining": 20
}
```

**Si tuvieras plan Premium:**
```json
{
  "hasLimit": false,
  "remaining": null
}
```

### 6.7 Ver Historial de Suscripciones (ROL: PATIENT)

**Endpoint:** `GET http://localhost:3000/subscriptions/history`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:**
```json
[
  {
    "Id": "2",
    "UserId": "3",
    "PlanId": "2",
    "StartAt": "2025-10-20T10:00:00.000Z",
    "ExpiresAt": "2025-11-20T10:00:00.000Z",
    "IsActive": true,
    "AutoRenew": true,
    "Plan": {
      "Name": "Professional",
      "PriceCents": 2999
    }
  },
  {
    "Id": "1",
    "UserId": "3",
    "PlanId": "1",
    "IsActive": false,
    "Plan": {
      "Name": "Basic",
      "PriceCents": 0
    }
  }
]
```

### 6.8 Cancelar Suscripción (ROL: PATIENT)

**Endpoint:** `DELETE http://localhost:3000/subscriptions/cancel`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:**
```json
{
  "Id": "2",
  "UserId": "3",
  "PlanId": "2",
  "StartAt": "2025-10-20T10:00:00.000Z",
  "ExpiresAt": "2025-11-20T10:00:00.000Z",
  "IsActive": true,
  "AutoRenew": false,  // ⬅️ Cambió a false
  "Plan": {
    "Name": "Professional"
  },
  "message": "Suscripción cancelada. Seguirás teniendo acceso hasta el 2025-11-20."
}
```

### 6.9 Intentar Cancelar Plan Basic (ROL: PATIENT) ❌

**Si tienes plan Basic:**

**Endpoint:** `DELETE http://localhost:3000/subscriptions/cancel`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:**
```json
{
  "statusCode": 400,
  "message": "No puedes cancelar el plan gratuito"
}
```

### 6.10 Intentar Hacer Seed de Planes (ROL: PATIENT) ❌

**Endpoint:** `POST http://localhost:3000/plans/seed`

**Headers:**
```
Authorization: Bearer {PATIENT_TOKEN}
```

**Respuesta esperada:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 6.11 Intentar Hacer Checkout (ROL: DOCTOR) ❌

**Endpoint:** `POST http://localhost:3000/subscriptions/checkout`

**Headers:**
```
Authorization: Bearer {DOCTOR_TOKEN}
Content-Type: application/json
```

**Body:**
```json
{
  "PlanId": 2,
  "DurationMonths": 1
}
```

**Respuesta esperada:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

---

## 7. Verificar Auditoría

### 7.1 Verificar Logs de Acceso a Datos (Base de Datos)

Después de realizar las pruebas de historiales médicos, verifica la tabla `DataAccessLogs`:

```sql
SELECT * FROM DataAccessLogs ORDER BY CreatedAt DESC LIMIT 10;
```

**Deberías ver registros como:**
```
| Id | UserId | ResourceType    | ResourceId | Action | IpAddress  | UserAgent          | CreatedAt           |
|----|--------|-----------------|------------|--------|------------|--------------------|---------------------|
| 1  | 2      | MedicalRecord   | 1          | CREATE | 127.0.0.1  | PostmanRuntime/7.x | 2025-10-20 10:00:00 |
| 2  | 3      | MedicalRecord   | 1          | READ   | 127.0.0.1  | PostmanRuntime/7.x | 2025-10-20 10:05:00 |
| 3  | 2      | MedicalRecord   | 1          | UPDATE | 127.0.0.1  | PostmanRuntime/7.x | 2025-10-20 10:10:00 |
| 4  | 1      | MedicalRecord   | 1          | DELETE | 127.0.0.1  | PostmanRuntime/7.x | 2025-10-20 10:15:00 |
```

### 7.2 Verificar Encriptación en Base de Datos

Verifica que los datos médicos están encriptados:

```sql
SELECT Id, DiagnosisEnc, EncryptionIV FROM MedicalRecords WHERE Id = 1;
```

**Deberías ver:**
```
| Id | DiagnosisEnc                                      | EncryptionIV              |
|----|---------------------------------------------------|---------------------------|
| 1  | a3f7b2c9e1d4... (texto encriptado en hexadecimal) | 1a2b3c4d5e6f7g8h9i0j... |
```

**NO deberías ver el texto plano** como "Paciente presenta síntomas..."

---

## 📝 Checklist de Pruebas

### Fase 1: Infraestructura
- [ ] Rate limiting funciona (429 después de 100 requests)
- [ ] i18n funciona en español (default)
- [ ] i18n funciona en inglés
- [ ] i18n funciona en francés
- [ ] i18n funciona en portugués

### Fase 2: Historiales Médicos
- [ ] DOCTOR puede crear historial médico
- [ ] DOCTOR puede ver sus propios historiales
- [ ] PATIENT puede ver sus propios historiales
- [ ] ADMIN puede ver cualquier historial
- [ ] PATIENT NO puede ver historiales de otros
- [ ] DOCTOR puede actualizar sus propios historiales
- [ ] DOCTOR NO puede actualizar historiales de otros
- [ ] ADMIN puede eliminar historiales
- [ ] PATIENT NO puede eliminar historiales
- [ ] Datos están encriptados en la base de datos
- [ ] Datos se desencriptan correctamente en las respuestas
- [ ] Auditoría registra todas las acciones

### Fase 3: Suscripciones
- [ ] ADMIN puede hacer seed de planes
- [ ] Cualquier usuario autenticado puede listar planes
- [ ] PATIENT obtiene plan Basic automáticamente
- [ ] PATIENT puede hacer checkout de plan Professional
- [ ] PATIENT puede hacer checkout de plan Premium
- [ ] PATIENT NO puede tener 2 suscripciones activas
- [ ] PATIENT puede ver su suscripción activa
- [ ] PATIENT puede ver su historial de suscripciones
- [ ] PATIENT puede verificar límite de citas
- [ ] PATIENT puede cancelar suscripción (AutoRenew=false)
- [ ] PATIENT NO puede cancelar plan Basic
- [ ] DOCTOR NO puede hacer checkout
- [ ] PATIENT NO puede hacer seed de planes

---

## 🚨 Errores Comunes

### Error: "Usuario no verificado"
**Solución:** Ejecutar en la base de datos:
```sql
UPDATE UsersAuth SET IsEmailVerified = 1 WHERE UserId = {USER_ID};
```

### Error: "Plan no encontrado"
**Solución:** Ejecutar el seed de planes primero:
```http
POST http://localhost:3000/plans/seed
Authorization: Bearer {ADMIN_TOKEN}
```

### Error: "Ya tienes una suscripción activa"
**Solución:** Cancelar la suscripción actual primero:
```http
DELETE http://localhost:3000/subscriptions/cancel
Authorization: Bearer {PATIENT_TOKEN}
```

O eliminar en la BD (solo para pruebas):
```sql
DELETE FROM Subscriptions WHERE UserId = {USER_ID};
```

### Error: "Forbidden resource"
**Solución:** Verifica que estás usando el token JWT del rol correcto.

### Error: 401 Unauthorized
**Solución:** Tu token JWT expiró. Haz login nuevamente para obtener un nuevo token.

---

## 📞 Resumen de Roles y Permisos

| Endpoint | ADMIN | DOCTOR | PATIENT |
|----------|-------|--------|---------|
| **Historiales Médicos** |
| POST /medical-records | ❌ | ✅ | ❌ |
| GET /medical-records/:id | ✅ (todos) | ✅ (propios) | ✅ (propios) |
| GET /medical-records/patient/:id | ✅ | ✅ | ✅ (solo su ID) |
| PATCH /medical-records/:id | ✅ | ✅ (propios) | ❌ |
| DELETE /medical-records/:id | ✅ | ✅ (propios) | ❌ |
| **Planes** |
| GET /plans | ✅ | ✅ | ✅ |
| POST /plans/seed | ✅ | ❌ | ❌ |
| **Suscripciones** |
| POST /subscriptions/checkout | ❌ | ❌ | ✅ |
| GET /subscriptions/me | ❌ | ❌ | ✅ |
| GET /subscriptions/history | ❌ | ❌ | ✅ |
| GET /subscriptions/appointment-limit | ❌ | ❌ | ✅ |
| DELETE /subscriptions/cancel | ❌ | ❌ | ✅ |

---

**✅ Con esta guía tienes todo lo necesario para probar las 3 fases implementadas.**
