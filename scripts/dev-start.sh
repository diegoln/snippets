#!/bin/bash

# Development Startup Script
# Sets up environment and starts the development server

set -e

# Set required environment variables
export DATABASE_URL="postgresql://app_user:dev_password@localhost:5433/snippets_db?schema=public"
export NODE_ENV="development"
export NEXTAUTH_SECRET="dev-secret-key-for-local-development-change-in-production"
export NEXTAUTH_URL="http://localhost:3000"

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

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Apply schema to database  
echo "🗃️ Applying schema to PostgreSQL..."
npx prisma db push

# Initialize development data
echo "📋 Initializing development data..."
npx tsx scripts/init-dev-postgres-data.ts

# Start Next.js development server
echo "🌐 Starting Next.js development server..."
echo "📱 Access the app at: http://localhost:3000"
echo ""
next dev