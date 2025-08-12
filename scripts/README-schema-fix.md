# Database Schema Fix for Production

## Issue
The production database is missing the `onboardingCompletedAt` column that exists in the Prisma schema, causing this error:
```
PrismaClientKnownRequestError: The column `users.onboardingCompletedAt` does not exist in the current database.
```

## Solution
Run the SQL migration script to add the missing column.

### Manual Steps:

1. **Connect to Cloud SQL:**
   ```bash
   gcloud sql connect advanceweekly-db --project=advanceweekly-project --database=advanceweekly --user=postgres
   ```

2. **Run the migration SQL:**
   ```sql
   -- Copy and paste the contents of fix-production-schema.sql
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
   ```

3. **Verify the fix:**
   ```sql
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name = 'onboardingCompletedAt';
   ```

4. **Exit psql:**
   ```
   \q
   ```

### Alternative: Use automated script (if preferred)
```bash
./scripts/apply-schema-fix.sh
```

## Verification
After applying the fix:
1. The staging environment should load user profiles without the Prisma error
2. The "Connection Error" should be resolved
3. DevTools should work properly in staging
