#!/bin/bash

#
# Staging Database Seeding Script for AdvanceWeekly
#
# This script applies the database schema for staging environment
# Mock users are handled by the application code in lib/mock-users.ts
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
# Apply database schema only - no seed data needed
DATABASE_URL="postgresql://username:password@/advanceweekly?host=/cloudsql/$DB_CONNECTION_NAME" \
  npx prisma db push

echo ""
echo "✅ Staging database schema applied successfully!"
echo ""
echo "🎭 Ready for staging testing at: https://staging.advanceweekly.io"
echo "🔐 Mock authentication available with staging_1, staging_2, staging_3"
echo "📊 Mock users handled by application code (lib/mock-users.ts)"
echo ""
echo "🚀 Next steps:"
echo "1. Configure DNS: staging.advanceweekly.io → Cloud Run"
echo "2. Deploy staging: gcloud builds submit --config cloudbuild-staging.yaml"
echo "3. Test staging environment with mock users"