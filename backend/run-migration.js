const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Run the migration - using the correct column names from the entity
    const migrationSQL = `
      -- Add priority column
      ALTER TABLE feedback ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';

      -- Add assigned_to column (snake_case for database)
      ALTER TABLE feedback ADD COLUMN IF NOT EXISTS "assignedTo" VARCHAR(255);

      -- Add is_anonymous column (snake_case for database)
      ALTER TABLE feedback ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN DEFAULT false;

      -- Add requires_follow_up column (snake_case for database)
      ALTER TABLE feedback ADD COLUMN IF NOT EXISTS "requiresFollowUp" BOOLEAN DEFAULT false;

      -- Update existing records to have default values
      UPDATE feedback SET priority = 'medium' WHERE priority IS NULL;
      UPDATE feedback SET "isAnonymous" = false WHERE "isAnonymous" IS NULL;
      UPDATE feedback SET "requiresFollowUp" = false WHERE "requiresFollowUp" IS NULL;
    `;

    await client.query(migrationSQL);
    console.log('Migration completed successfully');

    // Verify the columns were added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'feedback' 
      AND column_name IN ('priority', 'assignedTo', 'isAnonymous', 'requiresFollowUp')
      ORDER BY column_name
    `);

    console.log('New columns added:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
