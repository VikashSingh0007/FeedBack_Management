const { Client } = require('pg');
require('dotenv').config();

async function fixDatabase() {
  console.log('🔧 Starting database fix...');
  
  // Database connection config
  const config = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    user: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'feedback_app',
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  };

  // If DATABASE_URL is provided, use it instead
  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
  }

  const client = new Client(config);

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully!');

    // Check if department column exists
    console.log('🔍 Checking if department column exists...');
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'category' AND column_name = 'department'
    `);

    if (columnCheck.rows.length === 0) {
      console.log('➕ Adding department column to category table...');
      await client.query(`ALTER TABLE "category" ADD COLUMN "department" character varying`);
      console.log('✅ Department column added!');
    } else {
      console.log('ℹ️ Department column already exists');
    }

    // Update existing records
    console.log('🔄 Updating existing records...');
    await client.query(`UPDATE "category" SET "department" = 'General' WHERE "department" IS NULL`);
    console.log('✅ Existing records updated!');

    // Make department NOT NULL
    console.log('🔒 Making department NOT NULL...');
    await client.query(`ALTER TABLE "category" ALTER COLUMN "department" SET NOT NULL`);
    console.log('✅ Department column is now NOT NULL!');

    // Add department to feedback table
    console.log('➕ Adding department column to feedback table...');
    await client.query(`ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "department" character varying`);
    await client.query(`UPDATE "feedback" SET "department" = 'General' WHERE "department" IS NULL`);
    console.log('✅ Feedback table updated!');

    // Insert sample data
    console.log('📝 Inserting sample data...');
    await client.query(`
      INSERT INTO "category" ("department", "mainCategory", "subCategories") VALUES
      ('IT', 'Software Issues', ARRAY['Login Problems', 'Performance Issues', 'Bug Reports']),
      ('HR', 'Employee Relations', ARRAY['Workplace Issues', 'Benefits Questions', 'Policy Questions']),
      ('Finance', 'Payroll', ARRAY['Salary Issues', 'Tax Questions', 'Benefits'])
      ON CONFLICT ("department", "mainCategory") DO NOTHING
    `);
    console.log('✅ Sample data inserted!');

    // Verify the changes
    console.log('🔍 Verifying changes...');
    const result = await client.query(`SELECT * FROM "category" ORDER BY "department", "mainCategory"`);
    console.log('📊 Current categories:', result.rows);

    console.log('🎉 Database fix completed successfully!');
    console.log('🚀 You can now restart your backend and test the endpoints.');

  } catch (error) {
    console.error('❌ Error fixing database:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the fix
fixDatabase();
