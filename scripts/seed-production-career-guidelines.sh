#!/bin/bash

# Production Career Guidelines Seeding Script
# Uses the unified career guidelines seeding function for consistency
# Usage: ./scripts/seed-production-career-guidelines.sh

set -e

echo "🏭 Seeding career guideline templates in production..."

# Check if running in production context
if [[ -z "${DATABASE_URL:-}" && -z "${PRODUCTION:-}" ]]; then
    echo "❌ Error: This script is for production use only."
    echo "   Set PRODUCTION=true and DATABASE_URL to run."
    exit 1
fi

# Use the proven seed script directly (same as other environments use internally)
echo "📋 Running career guidelines seed..."
NODE_ENV=production node prisma/seed-career-guidelines.js