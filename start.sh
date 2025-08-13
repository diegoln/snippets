#!/bin/sh

# Production startup script for AdvanceWeekly
set -e

echo "🚀 Starting AdvanceWeekly in production mode..."

# Skip schema generation and client generation in production
# These should be done during build time, not runtime

# Initialize environment-specific data
echo "🌱 Starting environment initialization..."

# Always seed career guideline templates first (needed by all environments)
echo "📚 Seeding career guideline templates..."
if [ -f "prisma/seed-career-guidelines.js" ]; then
  node prisma/seed-career-guidelines.js || echo "⚠️  pregen-guidelines.txt not found, skipping seed"
else
  echo "⚠️  Career guideline seeding script not found, skipping"
fi

# Initialize environment-specific mock data for dev-like environments
if [ "$NODE_ENV" = "staging" ] || [ "$RUNTIME_ENV" = "staging" ]; then
  echo "🎭 Staging environment detected - initializing mock data..."
  if [ -f "scripts/init-staging-environment.js" ]; then
    NODE_ENV=production node scripts/init-staging-environment.js || echo "⚠️  Staging data initialization failed, continuing..."
  else
    echo "⚠️  Staging initialization script not found"
  fi
elif [ "$NODE_ENV" = "development" ]; then
  echo "🐘 Development environment detected - mock data handled separately"
fi

# Start the custom Next.js server
echo "▶️  Starting custom Next.js server..."
exec node custom-server.js