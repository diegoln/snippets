#!/bin/sh

# Production startup script for AdvanceWeekly
set -e

echo "🚀 Starting AdvanceWeekly in production mode..."

# Skip schema generation and client generation in production
# These should be done during build time, not runtime

# Check if we need to seed career guideline templates
echo "🌱 Seeding career guideline templates..."
if [ -f "prisma/seed-career-guidelines.js" ]; then
  node prisma/seed-career-guidelines.js || echo "⚠️  Career guideline seeding skipped (may not be critical)"
else
  echo "⚠️  Career guideline seeding script not found, skipping"
fi

# Start the custom Next.js server
echo "▶️  Starting custom Next.js server..."
exec node custom-server.js