#!/bin/sh

# Production startup script for AdvanceWeekly
set -e

echo "🚀 Starting AdvanceWeekly in production mode..."

# Generate production schema if needed
echo "📋 Generating production Prisma schema..."
NODE_ENV=production npm run generate-schema

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate

# Seed career guideline templates (critical for issue #73 fix)
echo "🌱 Seeding career guideline templates..."
node prisma/seed-career-guidelines.js
if [ $? -eq 0 ]; then
  echo "✅ Career guideline templates seeded successfully"
else
  echo "⚠️  Career guideline seeding failed, but continuing (templates may already exist)"
fi

# Start the custom Next.js server
echo "▶️  Starting custom Next.js server..."
exec node custom-server.js