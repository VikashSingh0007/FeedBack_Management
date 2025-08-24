const { Client } = require('pg');
require('dotenv').config();

async function restoreDatabase() {
  console.log('🔧 Starting database restoration...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`,
  });

  try {
    await client.connect();
    console.log('✅ Database connected successfully');

    // Check what tables exist
    console.log('🔍 Checking existing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log('📊 Existing tables:', tablesResult.rows.map(row => row.table_name));

    // Remove extra tables that were added for dynamic forms
    const extraTables = ['dynamic_form', 'category_new'];
    
    for (const table of extraTables) {
      if (tablesResult.rows.some(row => row.table_name === table)) {
        console.log(`🗑️ Dropping table: ${table}`);
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`✅ Dropped table: ${table}`);
      }
    }

    // Check feedback table structure
    console.log('🔍 Checking feedback table structure...');
    const feedbackColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feedback'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Current feedback columns:', feedbackColumns.rows.map(row => `${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`));

    // Remove extra columns that were added
    const extraColumns = ['title', 'categoryId', 'formId', 'customFieldValues'];
    
    for (const column of extraColumns) {
      if (feedbackColumns.rows.some(row => row.column_name === column)) {
        console.log(`🗑️ Dropping column: feedback.${column}`);
        await client.query(`ALTER TABLE "feedback" DROP COLUMN IF EXISTS "${column}"`);
        console.log(`✅ Dropped column: feedback.${column}`);
      }
    }

    // Ensure original columns exist with correct structure
    console.log('🔧 Ensuring original feedback table structure...');
    
    // Add department column if it doesn't exist
    const hasDepartment = feedbackColumns.rows.some(row => row.column_name === 'department');
    if (!hasDepartment) {
      console.log('➕ Adding department column to feedback table...');
      await client.query(`ALTER TABLE "feedback" ADD COLUMN "department" character varying`);
      console.log('✅ Added department column');
    }

    // Add category column if it doesn't exist
    const hasCategory = feedbackColumns.rows.some(row => row.column_name === 'category');
    if (!hasCategory) {
      console.log('➕ Adding category column to feedback table...');
      await client.query(`ALTER TABLE "feedback" ADD COLUMN "category" character varying`);
      console.log('✅ Added category column');
    }

    // Add priority column if it doesn't exist
    const hasPriority = feedbackColumns.rows.some(row => row.column_name === 'priority');
    if (!hasPriority) {
      console.log('➕ Adding priority column to feedback table...');
      await client.query(`ALTER TABLE "feedback" ADD COLUMN "priority" character varying DEFAULT 'medium'`);
      console.log('✅ Added priority column');
    }

    // Add chatMessages column for storing chat history
    const hasChatMessages = feedbackColumns.rows.some(row => row.column_name === 'chatMessages');
    if (!hasChatMessages) {
      console.log('➕ Adding chatMessages column to feedback table...');
      await client.query(`ALTER TABLE "feedback" ADD COLUMN "chatMessages" json DEFAULT '[]'`);
      console.log('✅ Added chatMessages column');
    }

    // Ensure cardId is unique
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_feedback_cardId" ON "feedback" ("cardId")`);
    console.log('✅ cardId unique index created');

    // Check if specific feedback exists
    console.log('🔍 Checking if AQA-0019 exists in database...');
    const specificFeedback = await client.query(`SELECT * FROM "feedback" WHERE "cardId" = 'AQA-0019'`);
    if (specificFeedback.rows.length > 0) {
      console.log('✅ AQA-0019 found in database:', {
        id: specificFeedback.rows[0].id,
        cardId: specificFeedback.rows[0].cardId,
        type: specificFeedback.rows[0].type,
        status: specificFeedback.rows[0].status,
        userId: specificFeedback.rows[0].userId
      });
      
      // Check which user this feedback belongs to
      if (specificFeedback.rows[0].userId) {
        const user = await client.query(`SELECT id, email FROM "user" WHERE id = ${specificFeedback.rows[0].userId}`);
        if (user.rows.length > 0) {
          console.log('👤 AQA-0019 belongs to user:', {
            id: user.rows[0].id,
            email: user.rows[0].email
          });
        }
      } else {
        console.log('❌ AQA-0019 has no user associated');
      }
    } else {
      console.log('❌ AQA-0019 NOT found in database');
      console.log('📊 Available feedback IDs:');
      const allFeedback = await client.query(`SELECT "cardId", "type", "status", "userId" FROM "feedback" LIMIT 10`);
      allFeedback.rows.forEach(row => {
        console.log(`   - ${row.cardId} (${row.type}) - ${row.status} - User: ${row.userId || 'None'}`);
      });
    }

    // Verify final structure
    console.log('🔍 Verifying final feedback table structure...');
    const finalColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'feedback'
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Final feedback columns:', finalColumns.rows.map(row => `${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`));

    console.log('🎉 Database restoration completed successfully!');
    console.log('🚀 You can now restart your backend server');

  } catch (error) {
    console.error('❌ Database restoration failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run the restoration
restoreDatabase();
