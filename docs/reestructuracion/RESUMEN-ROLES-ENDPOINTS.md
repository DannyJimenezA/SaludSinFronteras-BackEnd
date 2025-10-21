# 🎭 RESUMEN DE ROLES Y ENDPOINTS

## 📊 Tabla de Permisos por Rol

### 🏥 HISTORIALES MÉDICOS

| Endpoint | Método | ADMIN | DOCTOR | PATIENT | Restricciones |
|----------|--------|-------|--------|---------|---------------|
| `/medical-records` | POST | ❌ | ✅ | ❌ | Solo doctores pueden crear historiales |
| `/medical-records/:id` | GET | ✅ Todos | ✅ Solo propios | ✅ Solo propios | ADMIN ve todos, otros solo los suyos |
| `/medical-records/patient/:id` | GET | ✅ Todos | ✅ Todos pacientes | ✅ Solo su ID | PATIENT solo puede ver su propio ID |
| `/medical-records/:id` | PATCH | ✅ | ✅ Solo propios | ❌ | Solo el doctor que creó el historial puede actualizarlo |
| `/medical-records/:id` | DELETE | ✅ | ✅ Solo propios | ❌ | Solo ADMIN o doctor autor pueden eliminar |

### 💳 PLANES DE SUSCRIPCIÓN

| Endpoint | Método | ADMIN | DOCTOR | PATIENT | Restricciones |
|----------|--------|-------|--------|---------|---------------|
| `/plans` | GET | ✅ | ✅ | ✅ | Todos los usuarios autenticados |
| `/plans/seed` | POST | ✅ | ❌ | ❌ | Solo ADMIN puede crear planes |

### 🎫 SUSCRIPCIONES

| Endpoint | Método | ADMIN | DOCTOR | PATIENT | Restricciones |
|----------|--------|-------|--------|---------|---------------|
| `/subscriptions/checkout` | POST | ❌ | ❌ | ✅ | Solo pacientes pueden suscribirse |
| `/subscriptions/me` | GET | ❌ | ❌ | ✅ | Solo pacientes tienen suscripciones |
| `/subscriptions/history` | GET | ❌ | ❌ | ✅ | Solo pacientes |
| `/subscriptions/appointment-limit` | GET | ❌ | ❌ | ✅ | Solo pacientes |
| `/subscriptions/cancel` | DELETE | ❌ | ❌ | ✅ | Solo pacientes |

---

## 🔐 Credenciales de Prueba

### ADMIN
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

### DOCTOR
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

### PATIENT
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

---

## 📝 Flujos de Trabajo por Rol

### 👨‍⚕️ FLUJO: DOCTOR

1. **Login**
   ```http
   POST /auth/login
   Body: { "Email": "doctor@telemedicina.com", "Password": "Doctor123!" }
   ```

2. **Crear historial médico para un paciente**
   ```http
   POST /medical-records
   Authorization: Bearer {doctorToken}
   Body: {
     "PatientUserId": 3,
     "Diagnosis": "Diagnóstico detallado...",
     "Prescriptions": "Medicamentos...",
     "Recommendations": "Recomendaciones..."
   }
   ```

3. **Ver todos los historiales de un paciente**
   ```http
   GET /medical-records/patient/3
   Authorization: Bearer {doctorToken}
   ```

4. **Actualizar un historial médico (solo los propios)**
   ```http
   PATCH /medical-records/1
   Authorization: Bearer {doctorToken}
   Body: {
     "Diagnosis": "Actualización del diagnóstico..."
   }
   ```

5. **Eliminar un historial médico (solo los propios)**
   ```http
   DELETE /medical-records/1
   Authorization: Bearer {doctorToken}
   ```

6. **Ver planes disponibles**
   ```http
   GET /plans
   Authorization: Bearer {doctorToken}
   ```

### 🏥 FLUJO: PATIENT

1. **Login**
   ```http
   POST /auth/login
   Body: { "Email": "paciente@telemedicina.com", "Password": "Paciente123!" }
   ```

2. **Ver mi suscripción activa** (se asigna plan Basic automáticamente)
   ```http
   GET /subscriptions/me
   Authorization: Bearer {patientToken}
   ```

3. **Ver planes disponibles**
   ```http
   GET /plans
   Authorization: Bearer {patientToken}
   ```

4. **Hacer checkout de un plan** (solo si no tiene suscripción activa)
   ```http
   POST /subscriptions/checkout
   Authorization: Bearer {patientToken}
   Body: {
     "PlanId": 2,
     "DurationMonths": 1
   }
   ```

5. **Ver cuántas citas me quedan este mes**
   ```http
   GET /subscriptions/appointment-limit
   Authorization: Bearer {patientToken}
   ```

6. **Ver mis historiales médicos**
   ```http
   GET /medical-records/patient/3
   Authorization: Bearer {patientToken}
   ```

7. **Ver un historial médico específico**
   ```http
   GET /medical-records/1
   Authorization: Bearer {patientToken}
   ```

8. **Cancelar mi suscripción** (desactiva auto-renovación)
   ```http
   DELETE /subscriptions/cancel
   Authorization: Bearer {patientToken}
   ```

9. **Ver historial de mis suscripciones**
   ```http
   GET /subscriptions/history
   Authorization: Bearer {patientToken}
   ```

### 👨‍💼 FLUJO: ADMIN

1. **Login**
   ```http
   POST /auth/login
   Body: { "Email": "admin@telemedicina.com", "Password": "Admin123!" }
   ```

2. **Crear los planes iniciales** (ejecutar una sola vez)
   ```http
   POST /plans/seed
   Authorization: Bearer {adminToken}
   ```

3. **Ver planes disponibles**
   ```http
   GET /plans
   Authorization: Bearer {adminToken}
   ```

4. **Ver CUALQUIER historial médico** (acceso total)
   ```http
   GET /medical-records/1
   Authorization: Bearer {adminToken}
   ```

5. **Ver historiales de CUALQUIER paciente**
   ```http
   GET /medical-records/patient/3
   Authorization: Bearer {adminToken}
   ```

6. **Eliminar CUALQUIER historial médico**
   ```http
   DELETE /medical-records/1
   Authorization: Bearer {adminToken}
   ```

---

## ⚠️ Errores Comunes y Soluciones

### Error 403: Forbidden resource

**Causa:** Estás intentando acceder a un endpoint con un rol incorrecto.

**Ejemplos:**
- PATIENT intentando crear un historial médico → Solo DOCTOR puede
- DOCTOR intentando hacer checkout → Solo PATIENT puede
- PATIENT intentando hacer seed de planes → Solo ADMIN puede

**Solución:** Usa el token JWT del rol correcto.

---

### Error 403: "No tienes permiso para ver este historial médico"

**Causa:** Estás intentando ver un historial médico que no te pertenece.

**Ejemplos:**
- PATIENT intentando ver historial de otro PATIENT
- DOCTOR intentando ver historial creado por otro DOCTOR

**Solución:**
- Si eres PATIENT, solo puedes ver tus propios historiales
- Si eres DOCTOR, solo puedes ver historiales que tú creaste
- Si eres ADMIN, puedes ver todos los historiales

---

### Error 403: "Solo puedes actualizar tus propios historiales médicos"

**Causa:** Un DOCTOR está intentando actualizar un historial creado por otro doctor.

**Solución:** Solo el doctor que creó el historial puede actualizarlo. ADMIN puede actualizar cualquier historial.

---

### Error 409: "Ya tienes una suscripción activa"

**Causa:** Estás intentando hacer checkout de un plan cuando ya tienes una suscripción activa.

**Solución:**
1. Cancelar la suscripción actual: `DELETE /subscriptions/cancel`
2. Esperar a que expire (verificar `ExpiresAt`)
3. O eliminar manualmente en la BD (solo para pruebas): `DELETE FROM Subscriptions WHERE UserId = X`

---

### Error 400: "No puedes cancelar el plan gratuito"

**Causa:** Estás intentando cancelar una suscripción del plan Basic.

**Solución:** El plan Basic es gratuito y no se puede cancelar. Es el plan por defecto.

---

### Error 404: "Plan no encontrado"

**Causa:** Estás intentando hacer checkout de un plan que no existe.

**Solución:**
1. Ejecutar el seed de planes primero: `POST /plans/seed` (como ADMIN)
2. Verificar que el PlanId es 1, 2 o 3

---

### Error 401: Unauthorized

**Causa:** Tu token JWT es inválido o expiró.

**Solución:** Hacer login nuevamente para obtener un nuevo token:
```http
POST /auth/login
Body: { "Email": "...", "Password": "..." }
```

---

### Error 400: Validation failed

**Causa:** Los datos enviados no cumplen las validaciones.

**Ejemplos:**
- `Diagnosis` con menos de 10 caracteres
- `DurationMonths` mayor a 12 o menor a 1
- `Files` con más de 10 elementos
- Campos requeridos faltantes

**Solución:** Revisa las validaciones en la documentación de cada DTO.

---

## 🧪 Orden Recomendado de Pruebas

1. ✅ Crear usuarios (ADMIN, DOCTOR, PATIENT)
2. ✅ Hacer login para obtener tokens
3. ✅ Seed de planes (como ADMIN)
4. ✅ Listar planes (cualquier rol)
5. ✅ Ver mi suscripción (como PATIENT) → asigna Basic automáticamente
6. ✅ Crear historial médico (como DOCTOR)
7. ✅ Ver historial médico (como PATIENT dueño)
8. ✅ Ver historial médico (como DOCTOR autor)
9. ✅ Ver historial médico (como ADMIN)
10. ✅ Actualizar historial médico (como DOCTOR autor)
11. ✅ Hacer checkout de plan Professional (como PATIENT)
12. ✅ Verificar límite de citas (como PATIENT)
13. ✅ Cancelar suscripción (como PATIENT)
14. ✅ Eliminar historial médico (como ADMIN)

---

## 📦 Datos de Ejemplo Listos para Usar

### Crear Historial Médico (DOCTOR)
```json
{
  "PatientUserId": 3,
  "Diagnosis": "Paciente presenta síntomas de gripe común con fiebre leve de 38°C y congestión nasal. Se recomienda reposo.",
  "Prescriptions": "Paracetamol 500mg cada 8 horas por 3 días. Ibuprofeno 400mg si persiste la fiebre.",
  "Recommendations": "Reposo absoluto por 3 días, aumentar ingesta de líquidos (mínimo 2 litros de agua al día), evitar cambios bruscos de temperatura.",
  "Files": ["uploads/receta-2025-10-20.pdf"]
}
```

### Actualizar Historial Médico (DOCTOR)
```json
{
  "Diagnosis": "Actualización: Paciente evolucionó favorablemente, la fiebre disminuyó a 37.5°C. Se mantiene el tratamiento.",
  "Recommendations": "Continuar con el reposo por 2 días más. Control de temperatura cada 6 horas."
}
```

### Checkout Plan Professional (PATIENT)
```json
{
  "PlanId": 2,
  "DurationMonths": 1
}
```

### Checkout Plan Premium - 3 meses (PATIENT)
```json
{
  "PlanId": 3,
  "DurationMonths": 3
}
```

---

## 🔍 Verificaciones en Base de Datos

### Verificar Encriptación
```sql
-- Los datos deben estar encriptados en la BD
SELECT Id, DiagnosisEnc, EncryptionIV
FROM MedicalRecords
ORDER BY Id DESC
LIMIT 1;

-- DiagnosisEnc debe ser un texto hexadecimal largo, NO el texto plano
-- Ejemplo correcto: a3f7b2c9e1d4...
-- Ejemplo INCORRECTO: "Paciente presenta síntomas..."
```

### Verificar Auditoría
```sql
-- Todas las acciones deben estar registradas
SELECT
  Id,
  UserId,
  ResourceType,
  ResourceId,
  Action,
  IpAddress,
  CreatedAt
FROM DataAccessLogs
ORDER BY CreatedAt DESC
LIMIT 20;

-- Deberías ver registros de CREATE, READ, UPDATE, DELETE
```

### Verificar Suscripciones
```sql
-- Ver todas las suscripciones
SELECT
  s.Id,
  s.UserId,
  p.Name as PlanName,
  s.StartAt,
  s.ExpiresAt,
  s.IsActive,
  s.AutoRenew
FROM Subscriptions s
JOIN Plans p ON s.PlanId = p.Id
ORDER BY s.CreatedAt DESC;
```

### Verificar Planes
```sql
-- Ver planes disponibles
SELECT * FROM Plans WHERE IsActive = 1;

-- Deberías ver 3 planes: Basic, Professional, Premium
```

---

**✅ Con esta guía tienes todo lo necesario para probar el sistema completo**
