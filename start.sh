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

# Start the custom Next.js server
echo "▶️  Starting custom Next.js server..."
exec node custom-server.js