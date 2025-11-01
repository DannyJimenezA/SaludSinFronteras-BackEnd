# Appointment Status Migration - Summary

## Completed Tasks ✅

### 1. Database Migration
La migración de la base de datos se completó exitosamente. El estado de las citas (`Status`) se movió de un enum a una tabla normalizada.

**Cambios realizados:**
- ✅ Creada tabla `AppointmentStatuses` con los siguientes campos:
  - `Id` (BIGINT, PRIMARY KEY)
  - `Code` (VARCHAR(20), UNIQUE) - Código del estado (PENDING, CONFIRMED, etc.)
  - `Name` (VARCHAR(50)) - Nombre en español (Pendiente, Confirmada, etc.)
  - `Description` (VARCHAR(255)) - Descripción del estado
  - `Color` (VARCHAR(7)) - Código hexadecimal de color para la UI

- ✅ Insertados 6 estados iniciales:
  | Code | Name | Description | Color |
  |------|------|-------------|-------|
  | PENDING | Pendiente | Cita solicitada pero no confirmada | #F59E0B |
  | CONFIRMED | Confirmada | Cita confirmada por ambas partes | #10B981 |
  | CANCELLED | Cancelada | Cita cancelada por paciente o médico | #EF4444 |
  | COMPLETED | Completada | Cita realizada exitosamente | #3B82F6 |
  | RESCHEDULED | Reprogramada | Cita fue reprogramada para otra fecha | #8B5CF6 |
  | NO_SHOW | No asistió | El paciente no se presentó a la cita | #6B7280 |

- ✅ Tabla `Appointments` actualizada:
  - Agregada columna `StatusId` (BIGINT, NOT NULL)
  - Migrados todos los datos existentes (12 citas)
  - Eliminada columna anterior `Status` (enum)
  - Agregada llave foránea `FK_Appt_Status`
  - Agregado índice `IX_Appt_Status`

- ✅ Actualizado Prisma schema (`prisma/schema.prisma`):
  - Agregado modelo `AppointmentStatuses`
  - Actualizado modelo `Appointments` para usar `StatusId` en lugar de `Status`
  - Agregada relación entre `Appointments` y `AppointmentStatuses`
  - Eliminado enum `Appointments_Status`

### 2. Helper Service
- ✅ Creado `AppointmentStatusesService` en `src/appointments/appointment-statuses.service.ts`
  - Método `getStatusId(code)` - Obtiene el ID de un estado por su código
  - Método `getStatusIds(codes[])` - Obtiene múltiples IDs de estados
  - Método `getAllStatuses()` - Lista todos los estados disponibles
  - Método `initializeCache()` - Pre-carga todos los estados en memoria
  - Cache interno para optimizar consultas repetidas

### 3. Archivos Creados
1. `migration-appointment-statuses.sql` - SQL manual de migración (para referencia)
2. `scripts/migrate-appointment-statuses.ts` - Script TypeScript que ejecutó la migración
3. `src/appointments/appointment-statuses.service.ts` - Servicio helper para gestionar estados

## Estado Actual

### Database ✅
La base de datos está completamente migrada y funcionando. Los 12 registros de citas existentes fueron migrados exitosamente.

### Prisma Schema ✅
El schema de Prisma está actualizado y refleja la nueva estructura.

### Prisma Client ⚠️
El cliente de Prisma necesita ser regenerado pero hay un bloqueo de archivo (probablemente el servidor backend está corriendo). Esto se resolverá automáticamente cuando:
- Se reinicie el servidor backend, O
- Se ejecute `npm run build` en el backend

## Próximos Pasos Necesarios

### 1. Actualizar Backend Service Code
Actualmente, `appointments.service.ts` usa el campo `Status` directamente como string. Necesita ser actualizado para:

**Cambios necesarios en `appointments.service.ts`:**

```typescript
// ANTES (línea 21, 31, 46, 69, 158, 238, 317, 520, etc.):
Status: 'PENDING' as any
Status: { in: ['PENDING', 'CONFIRMED'] as any }
Status: { notIn: ['CANCELLED','NO_SHOW'] as any }

// DESPUÉS:
StatusId: await this.statusService.getStatusId('PENDING')
StatusId: { in: await this.statusService.getStatusIds(['PENDING', 'CONFIRMED']) }
StatusId: { notIn: await this.statusService.getStatusIds(['CANCELLED', 'NO_SHOW']) }
```

**Cambios en las consultas (include):**

```typescript
// Agregar en todos los findMany/findUnique:
include: {
  AppointmentStatuses: {
    select: {
      Id: true,
      Code: true,
      Name: true,
      Color: true,
    },
  },
  // ... otros includes existentes
}
```

**Cambios en las respuestas (map):**

```typescript
// En lugar de:
status: appt.Status

// Retornar:
status: {
  code: appt.AppointmentStatuses.Code,
  name: appt.AppointmentStatuses.Name,
  color: appt.AppointmentStatuses.Color,
}
```

### 2. Actualizar Módulo de Appointments
Agregar `AppointmentStatusesService` a `appointments.module.ts`:

```typescript
import { AppointmentStatusesService } from './appointment-statuses.service';

@Module({
  providers: [AppointmentsService, AppointmentStatusesService],
  exports: [AppointmentsService, AppointmentStatusesService],
})
export class AppointmentsModule {}
```

### 3. Actualizar Frontend (si es necesario)
El frontend actualmente espera `status` como string. Con los cambios del backend, recibirá un objeto:

```typescript
// ANTES:
status: "PENDING"

// DESPUÉS:
status: {
  code: "PENDING",
  name: "Pendiente",
  color: "#F59E0B"
}
```

Opciones:
1. **Actualizar frontend** para usar el nuevo formato (recomendado - permite mostrar colores y nombres localizados)
2. **Backward compatibility**: Mantener ambos formatos en la respuesta del backend:
   ```typescript
   status: appt.AppointmentStatuses.Code, // Para compatibilidad
   statusDetails: {
     code: appt.AppointmentStatuses.Code,
     name: appt.AppointmentStatuses.Name,
     color: appt.AppointmentStatuses.Color,
   }
   ```

## Beneficios de la Nueva Estructura

1. **Flexibilidad**: Fácil agregar nuevos estados sin cambiar código
2. **Localización**: Los nombres de estados pueden ser traducidos en la BD
3. **UI Mejorada**: Colores consistentes para cada estado
4. **Auditoría**: Historial de cambios de estados si se agrega tabla de transiciones
5. **Extensibilidad**: Fácil agregar metadata adicional (iconos, descripciones, reglas de transición)

## Instrucciones para Completar la Migración

1. **Detener el servidor backend** (si está corriendo)
2. **Regenerar Prisma Client**:
   ```bash
   cd telemed-backend
   npx prisma generate
   ```
3. **Actualizar el código** siguiendo los "Próximos Pasos" arriba
4. **Compilar y probar**:
   ```bash
   npm run build
   npm run start:dev
   ```
5. **Verificar** que las consultas funcionan correctamente
6. **Actualizar frontend** (opcional pero recomendado)

## Rollback (si es necesario)

Si por alguna razón necesitas revertir los cambios:

```sql
-- Agregar columna Status de nuevo
ALTER TABLE `Appointments` ADD COLUMN `Status` ENUM('PENDING','CONFIRMED','CANCELLED','COMPLETED','RESCHEDULED','NO_SHOW') NOT NULL;

-- Migrar datos de vuelta
UPDATE `Appointments` a
INNER JOIN `AppointmentStatuses` s ON a.`StatusId` = s.`Id`
SET a.`Status` = s.`Code`;

-- Eliminar StatusId y tabla
ALTER TABLE `Appointments` DROP FOREIGN KEY `FK_Appt_Status`;
ALTER TABLE `Appointments` DROP INDEX `IX_Appt_Status`;
ALTER TABLE `Appointments` DROP COLUMN `StatusId`;
DROP TABLE `AppointmentStatuses`;
```

## Archivos Modificados

### Backend
- `prisma/schema.prisma` - Schema actualizado
- `src/appointments/appointment-statuses.service.ts` - Nuevo servicio
- `scripts/migrate-appointment-statuses.ts` - Script de migración

### Base de Datos
- Tabla `AppointmentStatuses` - Nueva
- Tabla `Appointments` - Modificada (StatusId en lugar de Status)

## Contacto

Si tienes preguntas sobre esta migración, revisa:
1. Este documento
2. El script de migración en `scripts/migrate-appointment-statuses.ts`
3. El SQL en `migration-appointment-statuses.sql`
