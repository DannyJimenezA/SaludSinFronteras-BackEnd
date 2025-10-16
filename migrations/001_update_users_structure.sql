-- Migración: Actualización de estructura de usuarios
-- Fecha: 2025-10-15
-- Descripción: Agrega nuevos campos a usuarios, crea tablas de catálogos y actualiza UsersAuth

-- 1. Crear tablas de catálogos
CREATE TABLE IF NOT EXISTS `IdentificationTypes` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Code` VARCHAR(20) NOT NULL,
  `Name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Genders` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Code` VARCHAR(20) NOT NULL,
  `Name` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `NativeLanguages` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Code` VARCHAR(10) NOT NULL,
  `Name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Nationalities` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Code` VARCHAR(10) NOT NULL,
  `Name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ResidenceCountries` (
  `Id` BIGINT NOT NULL AUTO_INCREMENT,
  `Code` VARCHAR(10) NOT NULL,
  `Name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insertar datos iniciales en catálogos

-- Tipos de Identificación
INSERT INTO `IdentificationTypes` (`Code`, `Name`) VALUES
('DNI', 'Documento Nacional de Identidad'),
('PASSPORT', 'Pasaporte'),
('ID_CARD', 'Cédula de Identidad'),
('FOREIGN_ID', 'Identificación Extranjera'),
('OTHER', 'Otro')
ON DUPLICATE KEY UPDATE `Name` = VALUES(`Name`);

-- Géneros
INSERT INTO `Genders` (`Code`, `Name`) VALUES
('M', 'Masculino'),
('F', 'Femenino'),
('OTHER', 'Otro'),
('PREFER_NOT_SAY', 'Prefiero no decir')
ON DUPLICATE KEY UPDATE `Name` = VALUES(`Name`);

-- Lenguas Nativas
INSERT INTO `NativeLanguages` (`Code`, `Name`) VALUES
('es', 'Español'),
('en', 'Inglés'),
('fr', 'Francés'),
('pt', 'Portugués'),
('de', 'Alemán'),
('it', 'Italiano'),
('zh', 'Chino'),
('ja', 'Japonés'),
('ko', 'Coreano'),
('ar', 'Árabe'),
('ru', 'Ruso'),
('hi', 'Hindi')
ON DUPLICATE KEY UPDATE `Name` = VALUES(`Name`);

-- Nacionalidades (algunas principales)
INSERT INTO `Nationalities` (`Code`, `Name`) VALUES
('CR', 'Costarricense'),
('US', 'Estadounidense'),
('MX', 'Mexicana'),
('ES', 'Española'),
('CO', 'Colombiana'),
('AR', 'Argentina'),
('CL', 'Chilena'),
('PE', 'Peruana'),
('VE', 'Venezolana'),
('EC', 'Ecuatoriana'),
('GT', 'Guatemalteca'),
('HN', 'Hondureña'),
('NI', 'Nicaragüense'),
('PA', 'Panameña'),
('SV', 'Salvadoreña'),
('BR', 'Brasileña'),
('OTHER', 'Otra')
ON DUPLICATE KEY UPDATE `Name` = VALUES(`Name`);

-- Países de Residencia (reutilizar Nacionalidades)
INSERT INTO `ResidenceCountries` (`Code`, `Name`)
SELECT `Code`, `Name` FROM `Nationalities`
ON DUPLICATE KEY UPDATE `Name` = VALUES(`Name`);

-- 3. Actualizar tabla UsersAuth con nuevos campos
ALTER TABLE `UsersAuth`
ADD COLUMN IF NOT EXISTS `EmailVerificationToken` VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS `EmailVerifiedAt` DATETIME NULL,
ADD COLUMN IF NOT EXISTS `PasswordResetToken` VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS `PasswordResetExpiry` DATETIME NULL;

-- 4. Agregar nuevos campos a tabla Users
ALTER TABLE `Users`
ADD COLUMN IF NOT EXISTS `IdentificationTypeId` BIGINT NULL,
ADD COLUMN IF NOT EXISTS `Identification` VARCHAR(50) NULL,
ADD COLUMN IF NOT EXISTS `FirstName` VARCHAR(80) NULL,
ADD COLUMN IF NOT EXISTS `LastName1` VARCHAR(80) NULL,
ADD COLUMN IF NOT EXISTS `LastName2` VARCHAR(80) NULL,
ADD COLUMN IF NOT EXISTS `GenderId` BIGINT NULL,
ADD COLUMN IF NOT EXISTS `NativeLanguageId` BIGINT NULL,
ADD COLUMN IF NOT EXISTS `NationalityId` BIGINT NULL,
ADD COLUMN IF NOT EXISTS `ResidenceCountryId` BIGINT NULL,
ADD COLUMN IF NOT EXISTS `IsActive` BIT(1) NOT NULL DEFAULT b'0';

-- 5. Migrar datos existentes (FullName a FirstName/LastName)
-- Esto asume que FullName tiene formato "Nombre Apellido"
UPDATE `Users`
SET
  `FirstName` = SUBSTRING_INDEX(`FullName`, ' ', 1),
  `LastName1` = SUBSTRING_INDEX(SUBSTRING_INDEX(`FullName`, ' ', 2), ' ', -1),
  `IsActive` = b'1'
WHERE `FirstName` IS NULL AND `FullName` IS NOT NULL;

-- 6. Hacer FirstName y LastName1 obligatorios después de migrar datos
-- (Comentar estas líneas si prefieres mantenerlos opcionales temporalmente)
-- ALTER TABLE `Users` MODIFY `FirstName` VARCHAR(80) NOT NULL;
-- ALTER TABLE `Users` MODIFY `LastName1` VARCHAR(80) NOT NULL;

-- 7. Crear índices para las nuevas relaciones
CREATE INDEX IF NOT EXISTS `IX_Users_IdentificationTypeId` ON `Users`(`IdentificationTypeId`);
CREATE INDEX IF NOT EXISTS `IX_Users_GenderId` ON `Users`(`GenderId`);
CREATE INDEX IF NOT EXISTS `IX_Users_NativeLanguageId` ON `Users`(`NativeLanguageId`);
CREATE INDEX IF NOT EXISTS `IX_Users_NationalityId` ON `Users`(`NationalityId`);
CREATE INDEX IF NOT EXISTS `IX_Users_ResidenceCountryId` ON `Users`(`ResidenceCountryId`);

-- 8. Agregar claves foráneas (opcional - comentar si causa problemas)
-- ALTER TABLE `Users`
-- ADD CONSTRAINT `FK_Users_IdentificationType` FOREIGN KEY (`IdentificationTypeId`) REFERENCES `IdentificationTypes`(`Id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
-- ADD CONSTRAINT `FK_Users_Gender` FOREIGN KEY (`GenderId`) REFERENCES `Genders`(`Id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
-- ADD CONSTRAINT `FK_Users_NativeLanguage` FOREIGN KEY (`NativeLanguageId`) REFERENCES `NativeLanguages`(`Id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
-- ADD CONSTRAINT `FK_Users_Nationality` FOREIGN KEY (`NationalityId`) REFERENCES `Nationalities`(`Id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
-- ADD CONSTRAINT `FK_Users_ResidenceCountry` FOREIGN KEY (`ResidenceCountryId`) REFERENCES `ResidenceCountries`(`Id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- NOTA: Recuerda actualizar tus variables de entorno (.env) con la configuración de Gmail SMTP:
-- MAIL_HOST=smtp.gmail.com
-- MAIL_PORT=587
-- MAIL_USER=tu-email@gmail.com
-- MAIL_PASSWORD=tu-app-password
-- MAIL_FROM=tu-email@gmail.com
-- FRONTEND_URL=http://localhost:4200
