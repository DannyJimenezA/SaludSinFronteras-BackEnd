-- Manual migration to convert Appointments.Status from enum to foreign key table
-- Date: 2025-10-31
-- Purpose: Normalize appointment statuses to separate table

-- Step 1: Create the AppointmentStatuses table
CREATE TABLE IF NOT EXISTS `AppointmentStatuses` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Code` VARCHAR(20) NOT NULL,
  `Name` VARCHAR(50) NOT NULL,
  `Description` VARCHAR(255) NULL,
  `Color` VARCHAR(7) NULL COMMENT 'Hex color code for UI',
  PRIMARY KEY (`Id`),
  UNIQUE INDEX `UQ_AppointmentStatuses_Code` (`Code` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Insert the status records based on existing enum values
INSERT INTO `AppointmentStatuses` (`Code`, `Name`, `Description`, `Color`) VALUES
('PENDING', 'Pendiente', 'Cita solicitada pero no confirmada', '#F59E0B'),
('CONFIRMED', 'Confirmada', 'Cita confirmada por ambas partes', '#10B981'),
('CANCELLED', 'Cancelada', 'Cita cancelada por paciente o médico', '#EF4444'),
('COMPLETED', 'Completada', 'Cita realizada exitosamente', '#3B82F6'),
('RESCHEDULED', 'Reprogramada', 'Cita fue reprogramada para otra fecha', '#8B5CF6'),
('NO_SHOW', 'No asistió', 'El paciente no se presentó a la cita', '#6B7280');

-- Step 3: Add temporary StatusId column to Appointments table (nullable for migration)
ALTER TABLE `Appointments`
ADD COLUMN `StatusId` BIGINT NULL AFTER `Status`;

-- Step 4: Migrate data from Status enum to StatusId
UPDATE `Appointments` a
INNER JOIN `AppointmentStatuses` s ON a.`Status` = s.`Code`
SET a.`StatusId` = s.`Id`;

-- Step 5: Verify all appointments have been migrated (should return 0)
-- SELECT COUNT(*) FROM `Appointments` WHERE `StatusId` IS NULL;

-- Step 6: Make StatusId NOT NULL after data migration
ALTER TABLE `Appointments`
MODIFY COLUMN `StatusId` BIGINT NOT NULL;

-- Step 7: Drop the old Status column
ALTER TABLE `Appointments`
DROP COLUMN `Status`;

-- Step 8: Add foreign key constraint
ALTER TABLE `Appointments`
ADD CONSTRAINT `FK_Appt_Status`
FOREIGN KEY (`StatusId`)
REFERENCES `AppointmentStatuses`(`Id`)
ON DELETE NO ACTION
ON UPDATE NO ACTION;

-- Step 9: Add index for performance
CREATE INDEX `IX_Appt_Status` ON `Appointments`(`StatusId`);
