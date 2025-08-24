-- Migration: Add missing fields to feedback table
-- Run this SQL to add the missing columns

-- Add priority column
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium';

-- Add assigned_to column  
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);

-- Add is_anonymous column
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;

-- Add requires_follow_up column
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS requires_follow_up BOOLEAN DEFAULT false;

-- Update existing records to have default values
UPDATE feedback SET priority = 'medium' WHERE priority IS NULL;
UPDATE feedback SET is_anonymous = false WHERE is_anonymous IS NULL;
UPDATE feedback SET requires_follow_up = false WHERE requires_follow_up IS NULL;
