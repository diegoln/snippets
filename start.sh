#!/bin/bash

# Production startup script for AdvanceWeekly
set -e

echo "🚀 Starting AdvanceWeekly in production mode..."

# Generate production schema if needed
echo "📋 Generating production Prisma schema..."
NODE_ENV=production npm run generate-schema

# Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate

# Start the Next.js application
echo "▶️  Starting Next.js server..."
exec npm start