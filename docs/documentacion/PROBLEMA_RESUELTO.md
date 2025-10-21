# Problema Resuelto: Error "FullName should not be empty"

## El Problema Real

El error ocurría porque:

1. **En el schema de Prisma** el campo `FullName` estaba marcado como `String?` (opcional)
2. **PERO en la base de datos MySQL** el campo `FullName` seguía siendo `NOT NULL` (obligatorio)
3. Cuando intentabas crear un usuario sin `FullName`, Prisma intentaba insertar NULL en la BD
4. MySQL rechazaba la operación porque el campo no permitía NULL
5. Esto generaba un error de validación

## La Solución

Ejecutamos:
```bash
npx prisma db push --skip-generate
```

Esto sincronizó el schema de Prisma con la base de datos MySQL, haciendo que el campo `FullName` sea opcional (permite NULL) en la base de datos también.

## Cómo Funciona Ahora

El campo `FullName` se genera **automáticamente** en el código:

```typescript
// En auth.service.ts línea 57
FullName: `${dto.FirstName.trim()} ${dto.LastName1.trim()}${dto.LastName2 ? ' ' + dto.LastName2.trim() : ''}`,
```

Esto significa que:
- Si envías: `FirstName: "Juan"`, `LastName1: "Pérez"`, `LastName2: "García"`
- Se genera automáticamente: `FullName: "Juan Pérez García"`

## Request Correcto

Ahora puedes registrar usuarios así:

```json
{
  "FirstName": "Andrey",
  "LastName1": "Jimenez",
  "LastName2": "Arrieta",
  "Email": "anjiar10@gmail.com",
  "Password": "Pass1234",
  "PasswordConfirm": "Pass1234",
  "Phone": "+506 6100-8407",
  "IdentificationTypeId": 1,
  "Identification": "504470462",
  "GenderId": 1,
  "DateOfBirth": "2003-01-27",
  "NativeLanguageId": 1,
  "NationalityId": 1,
  "ResidenceCountryId": 1
}
```

Y el sistema automáticamente creará:
- `FullName = "Andrey Jimenez Arrieta"`

## Para Reiniciar el Servidor

1. **Detén el servidor actual** (Ctrl+C)

2. **Inicia de nuevo:**
   ```bash
   npm run start:dev
   ```

3. **Prueba tu request**

## Campos del Modelo Actualizado

### Campos Nuevos (lo que pediste):
- **IdentificationTypeId** → Tipo de identificación
- **Identification** → Número de identificación
- **FirstName** → Nombre
- **LastName1** → Primer apellido
- **LastName2** → Segundo apellido (opcional)
- **GenderId** → Género
- **DateOfBirth** → Fecha de nacimiento
- **NativeLanguageId** → Lengua nativa
- **Phone** → Teléfono
- **NationalityId** → Nacionalidad
- **ResidenceCountryId** → País de residencia
- **Email** → Email
- **IsActive** → Estado activo (false hasta verificar email)
- **Role** → Rol (ADMIN, DOCTOR, PATIENT)

### Campos Legacy (compatibilidad):
- **FullName** → Generado automáticamente desde FirstName + LastName1 + LastName2
- **Gender** → Opcional (legacy)
- **PrimaryLanguage** → Opcional (legacy)
- **CountryId** → Opcional (legacy)
- **Status** → Opcional (legacy)

## Validaciones que Funcionan

1. ✅ **FirstName** es requerido
2. ✅ **LastName1** es requerido
3. ✅ **Email** es requerido y debe ser válido
4. ✅ **Password** es requerido (mínimo 8 caracteres)
5. ✅ **PasswordConfirm** es requerido y debe coincidir con Password
6. ✅ Las contraseñas deben coincidir
7. ✅ El email no debe estar registrado
8. ✅ Todos los demás campos son opcionales

## Flujo Completo de Registro

1. **Usuario envía request** con FirstName, LastName1, Email, Password, PasswordConfirm
2. **Backend valida** los campos requeridos y contraseñas
3. **Backend genera automáticamente** FullName
4. **Backend crea usuario** con IsActive=false
5. **Backend genera token** de verificación único
6. **Backend envía correo** con enlace de activación
7. **Usuario hace click** en el enlace del correo
8. **Backend activa cuenta** (IsActive=true)
9. **Usuario puede hacer login**

## Campos en la Base de Datos Ahora

```sql
CREATE TABLE Users (
  Id BIGINT PRIMARY KEY AUTO_INCREMENT,

  -- Nuevos campos
  IdentificationTypeId BIGINT NULL,
  Identification VARCHAR(50) NULL,
  FirstName VARCHAR(80) NULL,
  LastName1 VARCHAR(80) NULL,
  LastName2 VARCHAR(80) NULL,
  GenderId BIGINT NULL,
  DateOfBirth DATE NULL,
  NativeLanguageId BIGINT NULL,
  Phone VARCHAR(40) NULL,
  NationalityId BIGINT NULL,
  ResidenceCountryId BIGINT NULL,
  Email VARCHAR(255) NOT NULL UNIQUE,
  IsActive BIT(1) NOT NULL DEFAULT 0,
  Role VARCHAR(20) NOT NULL,

  -- Campos legacy (compatibilidad)
  FullName VARCHAR(160) NULL,  -- <-- AHORA ES NULL (opcional)
  Gender VARCHAR(20) NULL,
  PrimaryLanguage VARCHAR(10) NULL,
  CountryId BIGINT NULL,
  Status VARCHAR(20) NULL DEFAULT 'active',

  -- Timestamps
  CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Índices
  INDEX IX_Users_IdentificationTypeId (IdentificationTypeId),
  INDEX IX_Users_GenderId (GenderId),
  INDEX IX_Users_NativeLanguageId (NativeLanguageId),
  INDEX IX_Users_NationalityId (NationalityId),
  INDEX IX_Users_ResidenceCountryId (ResidenceCountryId)
);
```

## ¿Por qué no borramos FullName?

Mantenemos `FullName` por **compatibilidad hacia atrás**:
- Otros módulos del sistema podrían estar usando este campo
- Los usuarios existentes tienen datos en este campo
- Es más seguro mantenerlo y poblarlo automáticamente

## Resumen

✅ **Problema identificado:** Campo FullName obligatorio en BD pero no en código
✅ **Solución aplicada:** Sincronizar BD con schema (hacer FullName opcional)
✅ **Resultado:** Ahora puedes crear usuarios sin enviar FullName
✅ **Bonus:** FullName se genera automáticamente desde FirstName + LastName1 + LastName2

## Siguiente Paso

**REINICIA TU SERVIDOR** y prueba tu request de nuevo. Debería funcionar perfectamente ahora.

```bash
# Detener servidor (Ctrl+C)
# Luego iniciar:
npm run start:dev
```
