#!/bin/bash

# Quick script to open OAuth setup pages in browser
# This automates opening the correct Google Cloud Console pages

set -euo pipefail

# Load project configuration
PROJECT_ID="advanceweekly-prod"
OAUTH_CLIENT_ID="926387508050-qooa9pr76al06rjsma2abrqaob1e00ug.apps.googleusercontent.com"

echo "🚀 Opening OAuth setup pages in your browser..."

# URLs to open
CREDENTIALS_URL="https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
CONSENT_SCREEN_URL="https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"

echo ""
echo "Step 1: Opening OAuth Credentials page..."
echo "URL: $CREDENTIALS_URL"

# Try to open in browser (works on most systems)
if command -v xdg-open > /dev/null; then
    xdg-open "$CREDENTIALS_URL"
elif command -v open > /dev/null; then
    open "$CREDENTIALS_URL"
elif command -v start > /dev/null; then
    start "$CREDENTIALS_URL"
else
    echo "Please manually open: $CREDENTIALS_URL"
fi

echo ""
echo "Step 2: Opening OAuth Consent Screen page..."
echo "URL: $CONSENT_SCREEN_URL"

# Wait a moment before opening second URL
sleep 2

if command -v xdg-open > /dev/null; then
    xdg-open "$CONSENT_SCREEN_URL"
elif command -v open > /dev/null; then
    open "$CONSENT_SCREEN_URL"
elif command -v start > /dev/null; then
    start "$CONSENT_SCREEN_URL"
else
    echo "Please manually open: $CONSENT_SCREEN_URL"
fi

echo ""
echo "✅ OAuth setup pages should now be open in your browser!"
echo ""
echo "📋 What to do in each tab:"
echo ""
echo "Tab 1 - Credentials (OAuth Client):"
echo "  1. Click on: $OAUTH_CLIENT_ID"
echo "  2. Add redirect URIs:"
echo "     - http://localhost:3000/api/auth/callback/google"
echo "     - https://advanceweekly-iknouo6toq-uc.a.run.app/api/auth/callback/google"
echo "  3. Click Save"
echo ""
echo "Tab 2 - OAuth Consent Screen:"
echo "  1. Scroll to 'Test users' section"
echo "  2. Click 'ADD USERS'"
echo "  3. Add: diegoln@gmail.com"
echo "  4. Click Save"
echo ""
echo "🧪 Test authentication at: https://advanceweekly-iknouo6toq-uc.a.run.app"