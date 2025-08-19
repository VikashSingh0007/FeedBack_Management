// Migration script to update categories structure
// Run this after updating the entities

import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateCategoriesStructure1713456789000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add department column to categories table
    await queryRunner.query(`
      ALTER TABLE "category" 
      ADD COLUMN "department" character varying NOT NULL DEFAULT 'General'
    `);

    // Add department column to feedback table
    await queryRunner.query(`
      ALTER TABLE "feedback" 
      ADD COLUMN "department" character varying
    `);

    // Update existing categories to have a default department
    await queryRunner.query(`
      UPDATE "category" 
      SET "department" = 'General' 
      WHERE "department" IS NULL
    `);

    // Update existing feedback to have a default department
    await queryRunner.query(`
      UPDATE "feedback" 
      SET "department" = 'General' 
      WHERE "department" IS NULL
    `);

    // Create composite primary key for categories
    await queryRunner.query(`
      ALTER TABLE "category" 
      DROP CONSTRAINT "PK_category_mainCategory"
    `);

    await queryRunner.query(`
      ALTER TABLE "category" 
      ADD CONSTRAINT "PK_category_department_mainCategory" 
      PRIMARY KEY ("department", "mainCategory")
    `);

    // Insert some default departments and categories
    await queryRunner.query(`
      INSERT INTO "category" ("department", "mainCategory", "subCategories") VALUES
      ('IT', 'Software Issues', ARRAY['Login Problems', 'Performance Issues', 'Bug Reports']),
      ('IT', 'Hardware Issues', ARRAY['Computer Problems', 'Network Issues', 'Printer Issues']),
      ('HR', 'Employee Relations', ARRAY['Workplace Issues', 'Benefits Questions', 'Policy Questions']),
      ('HR', 'Recruitment', ARRAY['Application Status', 'Interview Questions', 'Job Postings']),
      ('Finance', 'Payroll', ARRAY['Salary Issues', 'Tax Questions', 'Benefits']),
      ('Finance', 'Expenses', ARRAY['Reimbursement', 'Budget Questions', 'Invoice Issues'])
      ON CONFLICT ("department", "mainCategory") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove department column from feedback table
    await queryRunner.query(`
      ALTER TABLE "feedback" 
      DROP COLUMN "department"
    `);

    // Remove department column from categories table
    await queryRunner.query(`
      ALTER TABLE "category" 
      DROP COLUMN "department"
    `);

    // Restore original primary key
    await queryRunner.query(`
      ALTER TABLE "category" 
      DROP CONSTRAINT "PK_category_department_mainCategory"
    `);

    await queryRunner.query(`
      ALTER TABLE "category" 
      ADD CONSTRAINT "PK_category_mainCategory" 
      PRIMARY KEY ("mainCategory")
    `);
  }
}
