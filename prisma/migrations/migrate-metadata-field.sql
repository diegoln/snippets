-- Migration script for changing metadata field from String to Json
-- This script safely migrates existing String metadata to Json format

-- For PostgreSQL production environment
-- Step 1: Add a temporary Json column
ALTER TABLE integrations ADD COLUMN metadata_temp Json;

-- Step 2: Migrate existing String data to Json format
-- Handle cases where the string might not be valid JSON
UPDATE integrations 
SET metadata_temp = CASE 
  WHEN metadata IS NULL OR metadata = '' THEN '{}'::json
  WHEN metadata ~ '^[\[\{].*[\]\}]$' THEN 
    CASE 
      WHEN metadata::json IS NOT NULL THEN metadata::json 
      ELSE '{}'::json 
    END
  ELSE 
    ('{"legacy_data": "' || replace(metadata, '"', '\"') || '"}')::json
END;

-- Step 3: Drop the old column
ALTER TABLE integrations DROP COLUMN metadata;

-- Step 4: Rename the temporary column
ALTER TABLE integrations RENAME COLUMN metadata_temp TO metadata;

-- Step 5: Set default value and not null constraint
ALTER TABLE integrations ALTER COLUMN metadata SET DEFAULT '{}';
ALTER TABLE integrations ALTER COLUMN metadata SET NOT NULL;

-- For SQLite development environment (different syntax)
-- SQLite doesn't support ALTER COLUMN directly, so we need to recreate the table
-- This is handled automatically by Prisma migrations in development

-- Verification query (run after migration)
-- SELECT id, metadata, pg_typeof(metadata) as metadata_type FROM integrations LIMIT 5;