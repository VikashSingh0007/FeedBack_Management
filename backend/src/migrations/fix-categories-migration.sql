-- SQL script to fix the categories migration issue
-- Run this in your PostgreSQL database before starting the backend

-- Step 1: Add department column as nullable first
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "department" character varying;

-- Step 2: Update existing categories to have a default department
UPDATE "category" SET "department" = 'General' WHERE "department" IS NULL;

-- Step 3: Now make department NOT NULL
ALTER TABLE "category" ALTER COLUMN "department" SET NOT NULL;

-- Step 4: Add department column to feedback table
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "department" character varying;

-- Step 5: Update existing feedback to have default department
UPDATE "feedback" SET "department" = 'General' WHERE "department" IS NULL;

-- Step 6: Create unique composite index for department + mainCategory
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_category_department_mainCategory" 
ON "category" ("department", "mainCategory");

-- Step 7: Insert default departments and categories
INSERT INTO "category" ("department", "mainCategory", "subCategories") VALUES
('IT', 'Software Issues', ARRAY['Login Problems', 'Performance Issues', 'Bug Reports']),
('IT', 'Hardware Issues', ARRAY['Computer Problems', 'Network Issues', 'Printer Issues']),
('HR', 'Employee Relations', ARRAY['Workplace Issues', 'Benefits Questions', 'Policy Questions']),
('HR', 'Recruitment', ARRAY['Application Status', 'Interview Questions', 'Job Postings']),
('Finance', 'Payroll', ARRAY['Salary Issues', 'Tax Questions', 'Benefits']),
('Finance', 'Expenses', ARRAY['Reimbursement', 'Budget Questions', 'Invoice Issues'])
ON CONFLICT ("department", "mainCategory") DO NOTHING;

-- Step 8: Verify the changes
SELECT * FROM "category" ORDER BY "department", "mainCategory";

-- Step 9: Show the new index
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'category';
