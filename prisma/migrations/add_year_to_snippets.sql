-- Migration to add year field to weekly_snippets table
-- This migration adds a year column and updates existing records

-- Step 1: Add the year column (nullable initially)
ALTER TABLE "weekly_snippets" ADD COLUMN "year" INTEGER;

-- Step 2: Update existing records with the year from their startDate
UPDATE "weekly_snippets" 
SET "year" = EXTRACT(YEAR FROM "startDate");

-- Step 3: Make the year column NOT NULL after populating it
ALTER TABLE "weekly_snippets" ALTER COLUMN "year" SET NOT NULL;

-- Step 4: Drop the old unique constraint
ALTER TABLE "weekly_snippets" DROP CONSTRAINT IF EXISTS "weekly_snippets_userId_weekNumber_key";

-- Step 5: Add the new unique constraint including year
ALTER TABLE "weekly_snippets" ADD CONSTRAINT "weekly_snippets_userId_year_weekNumber_key" UNIQUE ("userId", "year", "weekNumber");