#!/bin/bash

# Script to verify OAuth configuration and provide fix instructions

set -e

echo "🔍 OAuth Configuration Verification Script"
echo "=========================================="

# Configuration
PROJECT_ID="${PROJECT_ID:-advanceweekly-prod}"
SERVICE_NAME="${SERVICE_NAME:-advanceweekly}"
REGION="${REGION:-us-central1}"
OAUTH_CLIENT_ID="${GOOGLE_OAUTH_CLIENT_ID:-926387508050-qooa9pr76al06rjsma2abrqaob1e00ug.apps.googleusercontent.com}"

# Get current Cloud Run URL
echo ""
echo "📡 Checking Cloud Run service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    echo "⚠️  Warning: Could not get Cloud Run service URL"
    echo "   Make sure you're authenticated with gcloud"
else
    echo "✅ Cloud Run URL: $SERVICE_URL"
fi

# Check current NEXTAUTH_URL
echo ""
echo "📋 Checking NEXTAUTH_URL environment variable..."
CURRENT_NEXTAUTH_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="export" 2>/dev/null | grep -E "NEXTAUTH_URL" | cut -d'=' -f2 | tr -d '"' || echo "")

if [ -n "$CURRENT_NEXTAUTH_URL" ]; then
    echo "✅ NEXTAUTH_URL: $CURRENT_NEXTAUTH_URL"
else
    echo "⚠️  NEXTAUTH_URL not found in environment variables"
fi

# Expected configuration
echo ""
echo "🎯 Expected OAuth Configuration:"
echo "================================"
echo "NEXTAUTH_URL should be: https://advanceweekly.io"
echo ""
echo "Required OAuth Redirect URIs in Google Cloud Console:"
echo "1. http://localhost:3000/api/auth/callback/google"
echo "2. https://advanceweekly.io/api/auth/callback/google"
if [ -n "$SERVICE_URL" ]; then
    echo "3. $SERVICE_URL/api/auth/callback/google (optional, for direct Cloud Run access)"
fi

# Fix instructions
echo ""
echo "🔧 TO FIX THE OAUTH ERROR:"
echo "=========================="
echo ""
echo "Step 1: Update Cloud Run environment (if needed)"
if [ "$CURRENT_NEXTAUTH_URL" != "https://advanceweekly.io" ]; then
    echo "Run this command:"
    echo ""
    echo "gcloud run services update $SERVICE_NAME \\"
    echo "  --region=$REGION \\"
    echo "  --project=$PROJECT_ID \\"
    echo "  --update-env-vars=\"NEXTAUTH_URL=https://advanceweekly.io\""
    echo ""
else
    echo "✅ NEXTAUTH_URL is already correctly set to https://advanceweekly.io"
fi

echo ""
echo "Step 2: Update OAuth Redirect URIs in Google Cloud Console"
echo "Go to: https://console.cloud.google.com/apis/credentials/oauthclient/$OAUTH_CLIENT_ID?project=$PROJECT_ID"
echo ""
echo "Add these Authorized redirect URIs:"
echo "• http://localhost:3000/api/auth/callback/google"
echo "• https://advanceweekly.io/api/auth/callback/google"
if [ -n "$SERVICE_URL" ]; then
    echo "• $SERVICE_URL/api/auth/callback/google (optional)"
fi
echo ""
echo "Then click SAVE"

# Test endpoints
echo ""
echo "🧪 Testing endpoints..."
echo "======================="

# Test custom domain
echo -n "Testing https://advanceweekly.io... "
if curl -f -s -o /dev/null "https://advanceweekly.io"; then
    echo "✅ Reachable"
else
    echo "❌ Not reachable"
fi

# Test OAuth providers endpoint
echo -n "Testing OAuth providers endpoint... "
if curl -f -s "https://advanceweekly.io/api/auth/providers" | grep -q "google"; then
    echo "✅ Google provider configured"
else
    echo "⚠️  Could not verify Google provider"
fi

echo ""
echo "📝 Summary:"
echo "==========="
echo "1. The custom domain (advanceweekly.io) provides stable OAuth URLs"
echo "2. NEXTAUTH_URL must be set to https://advanceweekly.io in production"
echo "3. OAuth redirect URIs must be manually added in Google Cloud Console"
echo "4. The redirect_uri_mismatch error occurs when these don't match"
echo ""
echo "After updating, clear cookies and test at: https://advanceweekly.io"