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
if ! npx prisma db push --skip-generate; then
    echo "❌ Failed to apply database schema!"
    exit 1
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