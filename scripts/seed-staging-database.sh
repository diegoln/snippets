#!/bin/bash

#
# Staging Database Seeding Script for AdvanceWeekly
#
# This script seeds the staging database using the existing seed scripts
# to create the same test data as development for consistent testing.
# Uses staging-specific user IDs (staging_1, staging_2, staging_3).
#
# Run this after setting up staging infrastructure
#

set -e

# Configuration
PROJECT_ID="advanceweekly-prod"
STAGING_DB_INSTANCE="advanceweekly-staging-db"
DATABASE_NAME="advanceweekly"

echo "🌱 Setting up AdvanceWeekly Staging Database"
echo "🗄️  Database: $STAGING_DB_INSTANCE"
echo ""

# Check if user is authenticated
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Get database connection info
echo "🔍 Getting database connection info..."
DB_CONNECTION_NAME="$PROJECT_ID:us-central1:$STAGING_DB_INSTANCE"
echo "📡 Connection: $DB_CONNECTION_NAME"

echo "🗄️  Applying database schema..."

# Validate required environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable must be set"
    echo "🔧 Set it to: postgresql://username:password@/advanceweekly?host=/cloudsql/$DB_CONNECTION_NAME"
    exit 1
fi

echo "📡 Using DATABASE_URL: ${DATABASE_URL%%password*}[REDACTED]"

# Apply database schema
npx prisma db push

echo "🌱 Initializing staging data with mock users and integrations..."
# Use the staging service to create proper staging data
NODE_ENV=staging npx tsx -e "
import { initializeStagingData } from './lib/staging-service.js'
await initializeStagingData()
console.log('✅ Staging initialization completed!')
process.exit(0)
"

echo ""
echo "✅ Staging database initialized successfully!"
echo ""
echo "📊 Staging Test Data Created:"
echo "👥 3 mock users with staging IDs (staging_1, staging_2, staging_3)"
echo "🔗 Mock integration data for calendar/todos testing"
echo "📝 Ready for users to create snippets and reflections"
echo ""
echo "🎭 Ready for staging testing at: https://staging.advanceweekly.io"
echo "🔐 Mock authentication available with staging users"
echo ""
echo "🚀 Next steps:"
echo "1. Configure DNS: staging.advanceweekly.io → Cloud Run"
echo "2. Deploy staging: gcloud builds submit --config cloudbuild-staging.yaml"
echo "3. Test staging environment with mock users"