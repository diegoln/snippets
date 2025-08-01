#!/bin/bash

# Fixed OAuth Redirect URI Update Script for GitHub Actions
# This script provides clear instructions and attempts to update via gcloud CLI

set -e

PROJECT_ID="${PROJECT_ID:-advanceweekly-prod}"
SERVICE_NAME="${SERVICE_NAME:-advanceweekly}"
REGION="${REGION:-us-central1}"
OAUTH_CLIENT_ID="${GOOGLE_OAUTH_CLIENT_ID}"

echo "🔧 OAuth Redirect URI Fix Script"
echo "================================="

# Validate required environment variables
if [ -z "$OAUTH_CLIENT_ID" ]; then
    echo "❌ Error: GOOGLE_OAUTH_CLIENT_ID environment variable is not set"
    exit 1
fi

# Get the current Cloud Run service URL
echo "📡 Getting Cloud Run service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null)

if [ -z "$SERVICE_URL" ]; then
    echo "❌ Error: Could not get Cloud Run service URL"
    exit 1
fi

echo "✅ Service URL: $SERVICE_URL"

# Define the required redirect URIs
LOCALHOST_URI="http://localhost:3000/api/auth/callback/google"
PRODUCTION_URI="https://advanceweekly.io/api/auth/callback/google"
CLOUD_RUN_URI="$SERVICE_URL/api/auth/callback/google"

echo ""
echo "📋 Required OAuth Redirect URIs:"
echo "  1. $LOCALHOST_URI (development)"
echo "  2. $PRODUCTION_URI (custom domain)" 
echo "  3. $CLOUD_RUN_URI (cloud run)"

# Update Cloud Run environment variable
echo ""
echo "🔄 Updating Cloud Run NEXTAUTH_URL..."
gcloud run services update "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --update-env-vars="NEXTAUTH_URL=$SERVICE_URL" \
    --quiet 2>/dev/null || {
    echo "⚠️  Warning: Could not update NEXTAUTH_URL environment variable"
}

# Create a configuration file for manual setup
echo ""
echo "📝 Creating OAuth configuration file..."
cat > oauth-redirect-uris.json << EOF
{
    "client_id": "$OAUTH_CLIENT_ID",
    "project_id": "$PROJECT_ID",
    "service_url": "$SERVICE_URL",
    "redirect_uris": [
        "$LOCALHOST_URI",
        "$PRODUCTION_URI", 
        "$CLOUD_RUN_URI"
    ],
    "setup_url": "https://console.cloud.google.com/apis/credentials/oauthclient/$OAUTH_CLIENT_ID?project=$PROJECT_ID"
}
EOF

echo "✅ Configuration saved to oauth-redirect-uris.json"

# Try to use gcloud CLI to update (this might not work but worth trying)
echo ""
echo "🔄 Attempting to update OAuth client via gcloud..."

# Create a temporary JSON file for the OAuth client update
cat > temp-oauth-config.json << EOF
{
    "web": {
        "client_id": "$OAUTH_CLIENT_ID",
        "redirect_uris": [
            "$LOCALHOST_URI",
            "$PRODUCTION_URI",
            "$CLOUD_RUN_URI"
        ]
    }
}
EOF

# Unfortunately, gcloud doesn't have a direct command to update OAuth clients
# So we'll output instructions instead
rm -f temp-oauth-config.json

echo "⚠️  Automatic OAuth client update is not supported via gcloud CLI"
echo ""
echo "🔧 MANUAL SETUP REQUIRED:"
echo "=========================================="
echo "1. Open: https://console.cloud.google.com/apis/credentials/oauthclient/$OAUTH_CLIENT_ID?project=$PROJECT_ID"
echo "2. In 'Authorized redirect URIs', ensure these URIs are present:"
echo "   • $LOCALHOST_URI"
echo "   • $PRODUCTION_URI"
echo "   • $CLOUD_RUN_URI"
echo "3. Click 'SAVE'"
echo ""
echo "🚨 This step is REQUIRED to fix the redirect_uri_mismatch error!"
echo ""
echo "✅ After manual setup, test authentication at: $SERVICE_URL"

# Exit successfully - the deployment should continue
exit 0