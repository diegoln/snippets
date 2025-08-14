#!/bin/bash

# Development Startup Script
# Sets up environment and starts the development server

set -e

# Load .env.local if it exists to allow overrides
if [ -f .env.local ]; then
  set -o allexport; source .env.local; set +o allexport
fi

# Set required environment variables with defaults
export DATABASE_URL=${DATABASE_URL:-"postgresql://app_user:dev_password@localhost:5433/snippets_db?schema=public"}
export NODE_ENV=${NODE_ENV:-"development"}
export NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-"dev-secret-key-for-local-development-change-in-production"}
export NEXTAUTH_URL=${NEXTAUTH_URL:-"http://localhost:3000"}

echo "🚀 Starting AdvanceWeekly development server..."
echo "📊 Environment: $NODE_ENV"
echo "🐘 Database: PostgreSQL (localhost:5433)"

# Check if PostgreSQL is running
if ! docker ps | grep -q snippets-postgres-dev; then
    echo "❌ PostgreSQL container not running. Starting it now..."
    ./scripts/dev-db-start.sh
    echo ""
fi

# Generate schema with PostgreSQL configuration
echo "🔧 Generating Prisma schema..."
npm run generate-schema:force

# Apply database schema and seed common data
chmod +x scripts/apply-database-schema.sh
./scripts/apply-database-schema.sh

# Initialize development data
echo "📋 Initializing development data..."
npx tsx scripts/init-dev-postgres-data.ts

# Start Next.js development server
echo "🌐 Starting Next.js development server..."
echo "📱 Access the app at: http://localhost:3000"
echo ""
next dev