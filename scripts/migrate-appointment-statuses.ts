import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateAppointmentStatuses() {
  console.log('Starting migration: Appointment Status enum to table...');

  try {
    // Step 0: Cleanup from previous failed attempt
    console.log('Step 0: Cleaning up from previous attempts...');
    try {
      // Check if StatusId column exists
      const columns = await prisma.$queryRaw<any[]>`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'Appointments'
        AND COLUMN_NAME = 'StatusId'
      `;

      if (columns.length > 0) {
        console.log('  - Removing existing StatusId column...');
        await prisma.$executeRawUnsafe(`ALTER TABLE \`Appointments\` DROP COLUMN \`StatusId\``);
      }

      // Check if AppointmentStatuses table exists
      const tables = await prisma.$queryRaw<any[]>`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'AppointmentStatuses'
      `;

      if (tables.length > 0) {
        console.log('  - Removing existing AppointmentStatuses table...');
        await prisma.$executeRawUnsafe(`DROP TABLE \`AppointmentStatuses\``);
      }

      console.log('✓ Cleanup completed');
    } catch (e: any) {
      console.log('✓ Cleanup error (ignoring):', e.message);
    }

    // Step 1: Create AppointmentStatuses table
    console.log('Step 1: Creating AppointmentStatuses table...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`AppointmentStatuses\` (
        \`Id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`Code\` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        \`Name\` VARCHAR(50) NOT NULL,
        \`Description\` VARCHAR(255) NULL,
        \`Color\` VARCHAR(7) NULL COMMENT 'Hex color code for UI',
        PRIMARY KEY (\`Id\`),
        UNIQUE INDEX \`UQ_AppointmentStatuses_Code\` (\`Code\` ASC)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    console.log('✓ AppointmentStatuses table created');

    // Step 2: Insert status records
    console.log('Step 2: Inserting status records...');
    await prisma.$executeRawUnsafe(`
      INSERT IGNORE INTO \`AppointmentStatuses\` (\`Code\`, \`Name\`, \`Description\`, \`Color\`) VALUES
      ('PENDING', 'Pendiente', 'Cita solicitada pero no confirmada', '#F59E0B'),
      ('CONFIRMED', 'Confirmada', 'Cita confirmada por ambas partes', '#10B981'),
      ('CANCELLED', 'Cancelada', 'Cita cancelada por paciente o médico', '#EF4444'),
      ('COMPLETED', 'Completada', 'Cita realizada exitosamente', '#3B82F6'),
      ('RESCHEDULED', 'Reprogramada', 'Cita fue reprogramada para otra fecha', '#8B5CF6'),
      ('NO_SHOW', 'No asistió', 'El paciente no se presentó a la cita', '#6B7280')
    `);
    console.log('✓ Status records inserted');

    // Step 3: Add StatusId column (nullable for migration)
    console.log('Step 3: Adding StatusId column to Appointments...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Appointments\`
      ADD COLUMN \`StatusId\` BIGINT NULL AFTER \`Status\`
    `);
    console.log('✓ StatusId column added');

    // Step 4: Migrate data from Status enum to StatusId
    console.log('Step 4: Migrating existing appointment statuses...');
    await prisma.$executeRawUnsafe(`
      UPDATE \`Appointments\` a
      INNER JOIN \`AppointmentStatuses\` s ON a.\`Status\` = s.\`Code\`
      SET a.\`StatusId\` = s.\`Id\`
    `);
    console.log('✓ Data migrated to StatusId');

    // Step 5: Verify all appointments were migrated
    const unmigrated = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM \`Appointments\` WHERE \`StatusId\` IS NULL
    `;
    if (unmigrated[0].count > 0) {
      throw new Error(`Migration incomplete: ${unmigrated[0].count} appointments have NULL StatusId`);
    }
    console.log('✓ All appointments migrated successfully');

    // Step 6: Make StatusId NOT NULL
    console.log('Step 6: Making StatusId NOT NULL...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Appointments\`
      MODIFY COLUMN \`StatusId\` BIGINT NOT NULL
    `);
    console.log('✓ StatusId is now NOT NULL');

    // Step 7: Drop old Status column
    console.log('Step 7: Dropping old Status column...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Appointments\`
      DROP COLUMN \`Status\`
    `);
    console.log('✓ Old Status column dropped');

    // Step 8: Add foreign key constraint
    console.log('Step 8: Adding foreign key constraint...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE \`Appointments\`
      ADD CONSTRAINT \`FK_Appt_Status\`
      FOREIGN KEY (\`StatusId\`)
      REFERENCES \`AppointmentStatuses\`(\`Id\`)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
    `);
    console.log('✓ Foreign key constraint added');

    // Step 9: Add index
    console.log('Step 9: Adding index on StatusId...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX \`IX_Appt_Status\` ON \`Appointments\`(\`StatusId\`)
    `);
    console.log('✓ Index created');

    console.log('\n✅ Migration completed successfully!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateAppointmentStatuses()
  .then(() => {
    console.log('\nMigration script finished.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
