# Production Fix - Snippet Creation Issue

## Issue: #23 - Creating a snippet is failing in production

### Problem Description
Users were unable to create snippets in production, receiving errors when attempting to save new weekly snippets.

### Root Cause Analysis
The database schema had a unique constraint on `[userId, weekNumber]` without considering the year. This meant:
- A user who created a snippet for week 30 in 2024 could not create a snippet for week 30 in 2025
- The constraint prevented reuse of week numbers across different years
- As we entered 2025, users who had been using the app in 2024 started encountering this issue

### Solution Implemented
Added a `year` field to the `WeeklySnippet` model and updated the unique constraint to `[userId, year, weekNumber]`.

### Files Changed
1. **prisma/schema.template.prisma**
   - Added `year Int` field to WeeklySnippet model
   - Changed unique constraint from `@@unique([userId, weekNumber])` to `@@unique([userId, year, weekNumber])`

2. **app/api/snippets/route.ts**
   - Updated POST endpoint to include year when creating snippets
   - Modified all responses to include year field
   - Updated validation to pass year to isWeekInFuture function

3. **lib/user-scoped-data.ts**
   - Added year to SnippetInput interface
   - Updated all select statements to include year field
   - Modified createSnippet to pass year to validation

4. **lib/week-utils.ts**
   - Enhanced isWeekInFuture to accept optional year parameter
   - Added year-aware validation logic

5. **prisma/migrations/add_year_to_snippets.sql**
   - Created migration script for production database
   - Adds year column and populates from existing startDate
   - Updates unique constraint

## Production Deployment Steps

### 1. Deploy Code Changes
```bash
# Trigger Cloud Build deployment
gcloud builds submit --config cloudbuild.yaml
```

### 2. Apply Database Migration
After the new code is deployed, run the migration on the production database:

```bash
# Connect to Cloud SQL instance
gcloud sql connect advanceweekly-db --user=postgres --project=YOUR_PROJECT_ID

# In the PostgreSQL prompt, run:
\c advanceweekly

-- Run the migration
\i prisma/migrations/add_year_to_snippets.sql

-- Verify the migration
\d weekly_snippets
```

### 3. Verify Fix
1. Test creating a new snippet in production
2. Verify that users can create snippets for any week number
3. Check that existing snippets still display correctly

## Rollback Plan
If issues occur:
1. Revert the code deployment to previous version
2. Run rollback migration:
```sql
-- Remove new constraint
ALTER TABLE "weekly_snippets" DROP CONSTRAINT "weekly_snippets_userId_year_weekNumber_key";

-- Restore old constraint
ALTER TABLE "weekly_snippets" ADD CONSTRAINT "weekly_snippets_userId_weekNumber_key" UNIQUE ("userId", "weekNumber");

-- Remove year column
ALTER TABLE "weekly_snippets" DROP COLUMN "year";
```

## Monitoring
- Monitor error logs for any snippet creation failures
- Check that the health endpoint reports healthy schema status
- Verify no increase in 500 errors on /api/snippets

## Long-term Improvements
1. Consider adding automated database migration tooling (e.g., Prisma Migrate)
2. Implement better error messages for constraint violations
3. Add integration tests that cover year transitions