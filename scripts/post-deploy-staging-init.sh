#!/bin/bash

# Post-deployment staging initialization script
# This script runs after successful deployment to ensure staging environment consistency
# Should be called from GitHub Actions or manual deployment processes

set -e

echo "🚀 Post-deployment staging initialization..."

# Check if we're in a deployment context (GitHub Actions or Cloud Run)
if [[ -z "${GITHUB_ACTIONS:-}" && -z "${K_SERVICE:-}" && -z "${PROJECT_ID:-}" ]]; then
    echo "ℹ️ Not in deployment context, skipping staging initialization"
    exit 0
fi

# Set up database connection for deployment context
if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "🔐 Loading DATABASE_URL from Secret Manager..."
    
    if command -v gcloud >/dev/null 2>&1; then
        ORIGINAL_DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url" --project=advanceweekly-prod)
        
        if [[ -n "${ORIGINAL_DATABASE_URL}" ]]; then
            # GitHub Actions needs Cloud SQL Proxy, Cloud Run can use socket directly
            if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
                echo "🔗 Setting up Cloud SQL Proxy for GitHub Actions..."
                
                # Download Cloud SQL Proxy
                curl -s -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
                chmod +x cloud_sql_proxy
                
                # Start proxy in background on port 5433
                ./cloud_sql_proxy -instances=advanceweekly-prod:us-central1:advanceweekly-db=tcp:5433 &
                PROXY_PID=$!
                
                # Wait for proxy to initialize
                sleep 5
                
                # Convert DATABASE_URL to use TCP connection instead of socket
                # Original: postgresql://user:pass@localhost/snippets_db?host=/cloudsql/...
                # Target:   postgresql://user:pass@127.0.0.1:5433/snippets_db
                export DATABASE_URL=$(echo "$ORIGINAL_DATABASE_URL" | sed 's|@localhost/\([^?]*\).*|@127.0.0.1:5433/\1|')
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
        echo "Staging initialization skipped - manual initialization may be required"
        exit 0
    fi
else
    echo "✅ Using existing DATABASE_URL"
fi

echo "📦 Installing required dependencies..."

# Install production dependencies including Prisma client
# Skip postinstall scripts (like husky) which aren't needed in deployment
npm ci --production --silent --ignore-scripts || npm install --production --silent --ignore-scripts

echo "🔧 Generating Prisma schema and client..."

# First generate the correct schema for production environment
NODE_ENV=production node scripts/smart-schema-generate.js --force

# Then generate the Prisma client based on that schema
NODE_ENV=production npx prisma generate

echo "🎭 Initializing staging environment state..."

# Run the staging initialization with production environment settings
NODE_ENV=production DATABASE_URL="${DATABASE_URL}" node "$(dirname "$0")/init-staging-environment.js"

echo "✅ Staging initialization completed successfully!"

# Optional: Run basic health check on staging
echo "🔍 Running staging health check..."

if command -v curl >/dev/null 2>&1; then
    STAGING_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://advanceweekly.io/staging || echo "000")
    
    if [[ "${STAGING_HEALTH}" == "200" ]]; then
        echo "✅ Staging environment health check passed"
    else
        echo "⚠️ Staging environment health check returned: ${STAGING_HEALTH}"
    fi
else
    echo "ℹ️ curl not available, skipping health check"
fi

echo "🎉 Post-deployment staging initialization completed!"