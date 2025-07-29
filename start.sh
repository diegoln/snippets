#!/bin/bash

#
# Production startup script for AdvanceWeekly on Google Cloud Run
#
# This script is executed when the Docker container starts in production.
# It performs the following tasks:
# 1. Validates required environment variables
# 2. Runs database migrations using Prisma
# 3. Starts the custom Next.js server on the correct port
#
# Environment Variables Required:
# - DATABASE_URL: PostgreSQL connection string (from Secret Manager)
# - OPENAI_API_KEY: OpenAI API key (from Secret Manager)  
# - PORT: Port to bind server to (provided by Cloud Run, defaults to 8080)
#
# The script uses 'exec' for the final server start to ensure proper
# signal handling for graceful shutdowns in the container environment.
#

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🚀 Starting AdvanceWeekly production deployment..."

# Validate required environment variables
if [[ -z "${DATABASE_URL:-}" ]]; then
    log "❌ ERROR: DATABASE_URL environment variable is required"
    exit 1
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    log "❌ ERROR: OPENAI_API_KEY environment variable is required"
    exit 1
fi

# Set the port for Next.js server (Cloud Run provides this)
export PORT=${PORT:-8080}
log "📡 Server will start on port: $PORT"

# Generate schema for production environment
log "🔧 Generating Prisma schema for production..."
npm run generate-schema

# Regenerate Prisma client with correct schema
log "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations in production
log "📊 Running database migrations..."
if ! npx prisma migrate deploy; then
    log "⚠️  WARNING: Prisma migrate deploy failed (expected if no migration directory)"
fi

# Run custom migration for year column
log "🔄 Running year column migration..."
if node scripts/migrate-add-year.js; then
    log "✅ Year column migration completed"
else
    log "⚠️  WARNING: Year column migration failed or was already applied"
fi

# Verify database connectivity
log "🔍 Verifying database connection..."
if ! npx prisma db pull --print >/dev/null 2>&1; then
    log "⚠️  WARNING: Could not verify database connection, proceeding anyway..."
fi

# Start the custom Next.js server
log "🌐 Starting Next.js server on port $PORT..."
log "Environment: NODE_ENV=${NODE_ENV:-development}"

# Use exec to replace the shell process with Node.js for proper signal handling
exec node custom-server.js