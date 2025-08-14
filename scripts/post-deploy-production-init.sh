#!/bin/bash

# Post-deployment production initialization script
# Applies database schema and seeds common data (career guidelines)

set -euo pipefail  # Exit on error, undefined variables, and pipe failures

echo "🚀 Post-deployment production initialization..."

# Check if we're in a deployment context (GitHub Actions or Cloud Run)
if [[ -z "${GITHUB_ACTIONS:-}" && -z "${K_SERVICE:-}" && -z "${PROJECT_ID:-}" ]]; then
    echo "ℹ️ Not in deployment context, skipping production initialization"
    exit 0
fi

# Set up database connection for deployment context
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "🔐 Loading DATABASE_URL from Secret Manager..."
    
    if command -v gcloud >/dev/null 2>&1; then
        # For production, use the production database URL
        ORIGINAL_DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url" --project=advanceweekly-prod)
        
        if [[ -n "${ORIGINAL_DATABASE_URL}" ]]; then
            # GitHub Actions needs Cloud SQL Proxy, Cloud Run can use socket directly
            if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
                echo "🔗 Setting up Cloud SQL Proxy for GitHub Actions (production database)..."
                
                # Download Cloud SQL Proxy
                curl -s -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
                chmod +x cloud_sql_proxy
                
                # Start proxy in background on port 5432 for PRODUCTION database
                ./cloud_sql_proxy -instances=advanceweekly-prod:us-central1:advanceweekly-db=tcp:5432 &
                PROXY_PID=$!
                
                # Wait for proxy to initialize
                sleep 5
                
                # Convert DATABASE_URL to use TCP connection instead of socket
                export DATABASE_URL=$(echo "$ORIGINAL_DATABASE_URL" | sed 's|@localhost/\([^?]*\).*|@127.0.0.1:5432/\1|')
                echo "✅ Cloud SQL Proxy started, using TCP connection"
                
                # Setup cleanup on exit
                trap "kill $PROXY_PID 2>/dev/null || true" EXIT
            else
                # Cloud Run environment - use socket connection directly
                export DATABASE_URL="${ORIGINAL_DATABASE_URL}"
                echo "✅ DATABASE_URL configured for Cloud Run environment"
            fi
        else
            echo "❌ Failed to load DATABASE_URL from secrets"
            exit 1
        fi
    else
        echo "❌ gcloud not available and DATABASE_URL not set"
        echo "Production initialization skipped - manual initialization may be required"
        exit 0
    fi
else
    echo "✅ Using existing DATABASE_URL"
fi

echo "📦 Installing required dependencies..."

# Install production dependencies including Prisma client
npm ci --production --silent --ignore-scripts || npm install --production --silent --ignore-scripts

echo "🔧 Generating Prisma schema..."

# Generate the correct schema for production environment
NODE_ENV=production node scripts/smart-schema-generate.js --force

echo "📋 Applying database schema and common data..."

# Apply schema and seed career guidelines (common to all environments)
NODE_ENV=production DATABASE_URL="${DATABASE_URL}" ./scripts/apply-database-schema.sh

echo "✅ Production initialization completed successfully!"

# Optional: Run basic health check on production
echo "🔍 Running production health check..."

if command -v curl >/dev/null 2>&1; then
    PRODUCTION_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://advanceweekly.io || echo "000")
    
    if [[ "${PRODUCTION_HEALTH}" == "200" ]]; then
        echo "✅ Production environment health check passed"
    else
        echo "⚠️ Production environment health check returned: ${PRODUCTION_HEALTH}"
    fi
else
    echo "ℹ️ curl not available, skipping health check"
fi

echo "🎉 Post-deployment production initialization completed!"