-- Fix production database schema to match Prisma schema
-- This script adds the missing onboardingCompletedAt column

-- Check if column exists before adding it (PostgreSQL safe)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 
                   FROM information_schema.columns 
                   WHERE table_name = 'users' 
                   AND column_name = 'onboardingCompletedAt') THEN
        ALTER TABLE users ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added missing onboardingCompletedAt column to users table';
    ELSE
        RAISE NOTICE 'onboardingCompletedAt column already exists';
    END IF;
END $$;

-- Verify the schema change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'onboardingCompletedAt';
