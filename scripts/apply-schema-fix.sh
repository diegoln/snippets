#!/bin/bash

# Apply database schema fix to production
# This script runs the SQL migration against the Cloud SQL instance

set -e

echo "🔧 Applying database schema fix to production..."

# Get the Cloud SQL connection details with environment variable defaults
PROJECT_ID="${ADVANCEWEEKLY_PROJECT_ID:-advanceweekly-prod}"
INSTANCE_NAME="${ADVANCEWEEKLY_INSTANCE_NAME:-advanceweekly-db}"
DATABASE_NAME="${ADVANCEWEEKLY_DATABASE_NAME:-advanceweekly}"
DB_USER="${ADVANCEWEEKLY_DB_USER:-postgres}"

# Validate required parameters
if [[ -z "${PROJECT_ID}" || -z "${INSTANCE_NAME}" || -z "${DATABASE_NAME}" ]]; then
    echo "❌ Error: Missing required connection parameters"
    echo "Set environment variables or use defaults:"
    echo "  ADVANCEWEEKLY_PROJECT_ID (default: advanceweekly-project)"
    echo "  ADVANCEWEEKLY_INSTANCE_NAME (default: advanceweekly-db)"
    echo "  ADVANCEWEEKLY_DATABASE_NAME (default: advanceweekly)"
    exit 1
fi

echo "Using connection details:"
echo "  Project: ${PROJECT_ID}"
echo "  Instance: ${INSTANCE_NAME}" 
echo "  Database: ${DATABASE_NAME}"
echo "  User: ${DB_USER}"

# Execute the SQL script against Cloud SQL
# Use gcloud sql connect with psql to run the script
echo "Connecting to Cloud SQL instance and executing migration..."
gcloud sql connect "${INSTANCE_NAME}" \
    --project="${PROJECT_ID}" \
    --database="${DATABASE_NAME}" \
    --user="${DB_USER}" \
    --quiet < "$(dirname "$0")/fix-production-schema.sql"

echo "✅ Database schema fix applied successfully"

# Generate and deploy new Prisma client to ensure consistency
echo "🔄 Regenerating Prisma client..."
npx prisma generate

echo "✅ Schema fix completed!"
