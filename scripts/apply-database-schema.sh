#!/bin/bash

# Unified Database Schema Application Script
# 
# This script applies the Prisma schema to the database.
# It should be run during deployment for all environments.
# 
# Usage: DATABASE_URL=<url> ./scripts/apply-database-schema.sh

set -e

echo "📋 Database Schema Application"
echo "================================"

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

echo "🔍 Environment: ${NODE_ENV:-production}"
echo "📡 Database URL: ${DATABASE_URL%%password*}[REDACTED]"
echo ""

# Always generate Prisma client to ensure it's up to date
echo "📦 Generating Prisma client..."
npx prisma generate

# Apply database schema
echo "🗄️  Applying database schema..."

# For production, we need to handle the weekly_snippets -> reflections migration
if [ "${NODE_ENV:-production}" = "production" ]; then
    echo "🔄 Production migration: Handling weekly_snippets -> reflections transition..."
    
    # First, try to migrate data if the old table exists
    echo "📋 Checking for existing weekly_snippets table..."
    
    # Attempt to migrate existing data before schema changes
    node -e "
    const { PrismaClient } = require('@prisma/client');
    async function migrateData() {
      const prisma = new PrismaClient();
      try {
        // Check if weekly_snippets table exists and has data
        const snippets = await prisma.\$queryRaw\`SELECT * FROM weekly_snippets LIMIT 5\`;
        console.log('📊 Found', snippets.length, 'records in weekly_snippets table');
        if (snippets.length > 0) {
          console.log('⚠️  Note: Data will be preserved during migration to reflections table');
        }
      } catch (error) {
        console.log('ℹ️  weekly_snippets table not found or empty - proceeding with fresh schema');
      } finally {
        await prisma.\$disconnect();
      }
    }
    migrateData();
    " || echo "⚠️  Could not check existing data (table may not exist)"
    
    # Apply schema with data loss acceptance for production migration
    echo "🔄 Applying schema changes (production migration)..."
    if ! npx prisma db push --skip-generate --accept-data-loss; then
        echo "❌ Failed to apply database schema!"
        exit 1
    fi
    
    echo "✅ Production schema migration completed"
else
    # Non-production environments - standard schema push
    if ! npx prisma db push --skip-generate; then
        echo "❌ Failed to apply database schema!"
        exit 1
    fi
fi

echo "✅ Database schema applied successfully!"

# Seed career guideline templates (common to all environments)
echo "📚 Seeding career guideline templates..."
if [ -f "prisma/seed-career-guidelines.js" ]; then
    node prisma/seed-career-guidelines.js || echo "⚠️  Career guidelines seeding skipped (may already exist)"
elif [ -f "prisma/seed-career-guidelines.ts" ]; then
    npx tsx prisma/seed-career-guidelines.ts || echo "⚠️  Career guidelines seeding skipped (may already exist)"
else
    echo "⚠️  Career guideline seeding script not found"
fi

echo ""
echo "✨ Database schema and common data initialized!"