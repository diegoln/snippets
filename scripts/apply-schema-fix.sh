#!/bin/bash

# Apply database schema fix to production
# This script runs the SQL migration against the Cloud SQL instance

set -e

echo "🔧 Applying database schema fix to production..."

# Get the Cloud SQL connection details
PROJECT_ID="advanceweekly-project"
INSTANCE_NAME="advanceweekly-db"
DATABASE_NAME="advanceweekly"

# Execute the SQL script against Cloud SQL
# Use gcloud sql connect with psql to run the script
echo "Connecting to Cloud SQL instance and executing migration..."
gcloud sql connect $INSTANCE_NAME \
    --project=$PROJECT_ID \
    --database=$DATABASE_NAME \
    --user=postgres \
    --quiet < "$(dirname "$0")/fix-production-schema.sql"

echo "✅ Database schema fix applied successfully"

# Generate and deploy new Prisma client to ensure consistency
echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "✅ Schema fix completed!"