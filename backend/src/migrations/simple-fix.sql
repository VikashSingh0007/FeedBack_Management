-- Simple database fix for the new three-level structure
-- Run this in your PostgreSQL database

-- 1. Add department column to category table
ALTER TABLE "category" ADD COLUMN IF NOT EXISTS "department" character varying;

-- 2. Set default department for existing categories
UPDATE "category" SET "department" = 'General' WHERE "department" IS NULL;

-- 3. Make department NOT NULL
ALTER TABLE "category" ALTER COLUMN "department" SET NOT NULL;

-- 4. Add department column to feedback table
ALTER TABLE "feedback" ADD COLUMN IF NOT EXISTS "department" character varying;
UPDATE "feedback" SET "department" = 'General' WHERE "department" IS NULL;

-- 5. Insert some sample data
INSERT INTO "category" ("department", "mainCategory", "subCategories") VALUES
('IT', 'Software Issues', ARRAY['Login Problems', 'Performance Issues', 'Bug Reports']),
('IT', 'Hardware Issues', ARRAY['Computer Problems', 'Network Issues', 'Printer Issues']),
('HR', 'Employee Relations', ARRAY['Workplace Issues', 'Benefits Questions', 'Policy Questions']),
('HR', 'Recruitment', ARRAY['Application Status', 'Interview Questions', 'Job Postings']),
('Finance', 'Payroll', ARRAY['Salary Issues', 'Tax Questions', 'Benefits']),
('Finance', 'Expenses', ARRAY['Reimbursement', 'Budget Questions', 'Invoice Issues'])
ON CONFLICT ("department", "mainCategory") DO NOTHING;

-- 6. Verify the data
SELECT * FROM "category" ORDER BY "department", "mainCategory";
