#!/bin/bash

# Manual staging environment initialization
# Run this script when you need to reset/initialize staging environment manually

set -e

echo "🎭 Manual Staging Environment Initialization"
echo "==========================================="

# Check prerequisites
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
    echo "❌ gcloud CLI is required but not installed" 
    exit 1
fi

echo "📋 Prerequisites check:"
echo "  ✅ Node.js: $(node --version)"
echo "  ✅ gcloud: $(gcloud --version | head -1)"
echo ""

# Load database URL and set up Cloud SQL Proxy for local execution
echo "🔐 Setting up database connection..."

# Load original DATABASE_URL
ORIGINAL_DATABASE_URL=$(gcloud secrets versions access latest --secret="database-url" --project=advanceweekly-prod)

if [[ -z "${ORIGINAL_DATABASE_URL}" ]]; then
    echo "❌ Failed to load DATABASE_URL from Secret Manager"
    exit 1
fi

# Check if we need to use Cloud SQL Proxy (local execution)
if [[ "${ORIGINAL_DATABASE_URL}" == *"cloudsql"* ]]; then
    echo "🔗 Starting Cloud SQL Proxy for local connection..."
    
    # Download Cloud SQL Proxy if not present
    if [[ ! -f "cloud_sql_proxy" ]]; then
        echo "📥 Downloading Cloud SQL Proxy..."
        curl -s -o cloud_sql_proxy https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64
        chmod +x cloud_sql_proxy
    fi
    
    # Start proxy in background
    ./cloud_sql_proxy -instances=advanceweekly-prod:us-central1:advanceweekly-db=tcp:5433 &
    PROXY_PID=$!
    
    # Wait for proxy to be ready
    echo "⏳ Waiting for Cloud SQL Proxy to initialize..."
    sleep 5
    
    # Convert DATABASE_URL to use proxy
    export DATABASE_URL=$(echo "$ORIGINAL_DATABASE_URL" | sed 's|@localhost/\([^?]*\).*|@127.0.0.1:5433/\1|')
    
    echo "✅ Cloud SQL Proxy started (PID: $PROXY_PID)"
    
    # Cleanup function
    cleanup() {
        echo "🧹 Cleaning up Cloud SQL Proxy..."
        kill $PROXY_PID 2>/dev/null || true
        rm -f cloud_sql_proxy 2>/dev/null || true
    }
    trap cleanup EXIT
    
else
    # Direct connection (e.g., in Cloud Run)
    export DATABASE_URL="$ORIGINAL_DATABASE_URL"
fi

echo "✅ Database connection configured"
echo ""

# Install dependencies if needed
if [[ ! -d "node_modules" ]] || [[ ! -f "node_modules/.package-lock.json" ]]; then
    echo "📦 Installing dependencies..."
    npm install --production --silent
    echo "✅ Dependencies installed"
    echo ""
fi

# Run staging initialization
echo "🚀 Running staging environment initialization..."
NODE_ENV=production DATABASE_URL="${DATABASE_URL}" node scripts/init-staging-environment.js

echo ""
echo "🔍 Verifying staging environment..."

# Test staging endpoint
echo "📡 Testing staging endpoint..."
STAGING_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://advanceweekly.io/staging || echo "000")

if [[ "${STAGING_RESPONSE}" == "200" ]]; then
    echo "✅ Staging endpoint responding correctly"
else
    echo "⚠️ Staging endpoint returned: ${STAGING_RESPONSE}"
    echo "   (This may be normal if deployment is still propagating)"
fi

echo ""
echo "🎉 Manual staging initialization completed!"
echo ""
echo "📋 What was initialized:"
echo "  ✅ Staging users (staging_1, staging_2, staging_3)"
echo "  ✅ Sample weekly snippets for demonstration"
echo "  ✅ Onboarding completion status"
echo "  ✅ Clean up of orphaned staging data"
echo ""
echo "🌐 Staging environment: https://advanceweekly.io/staging"