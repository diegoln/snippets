#!/bin/bash

# Script to update OAuth configuration for custom domain
# This opens the correct Google Cloud Console pages for OAuth and test user setup

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="advanceweekly.io"
PROJECT_ID="advanceweekly-prod"
OAUTH_CLIENT_ID="926387508050-qooa9pr76al06rjsma2abrqaob1e00ug.apps.googleusercontent.com"
TEST_USER="diegoln@gmail.com"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# URLs to open
CREDENTIALS_URL="https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
CONSENT_SCREEN_URL="https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"

print_status "$GREEN" "🔐 Updating OAuth for Custom Domain: $DOMAIN"
echo ""

print_status "$BLUE" "📋 Redirect URIs to configure:"
echo "  Development: http://localhost:3000/api/auth/callback/google"
echo "  Production:  https://$DOMAIN/api/auth/callback/google"
echo ""

print_status "$BLUE" "📋 Test user to add:"
echo "  Email: $TEST_USER"
echo ""

print_status "$YELLOW" "🚀 Opening OAuth setup pages in your browser..."

# Open OAuth Credentials page
echo ""
print_status "$BLUE" "Step 1: Opening OAuth Credentials page..."
echo "URL: $CREDENTIALS_URL"

if command -v xdg-open > /dev/null; then
    xdg-open "$CREDENTIALS_URL"
elif command -v open > /dev/null; then
    open "$CREDENTIALS_URL"
elif command -v start > /dev/null; then
    start "$CREDENTIALS_URL"
else
    print_status "$YELLOW" "Please manually open: $CREDENTIALS_URL"
fi

# Wait before opening second URL
sleep 3

# Open OAuth Consent Screen page
print_status "$BLUE" "Step 2: Opening OAuth Consent Screen page..."
echo "URL: $CONSENT_SCREEN_URL"

if command -v xdg-open > /dev/null; then
    xdg-open "$CONSENT_SCREEN_URL"
elif command -v open > /dev/null; then
    open "$CONSENT_SCREEN_URL"
elif command -v start > /dev/null; then
    start "$CONSENT_SCREEN_URL"
else
    print_status "$YELLOW" "Please manually open: $CONSENT_SCREEN_URL"
fi

echo ""
print_status "$GREEN" "✅ OAuth setup pages opened!"
echo ""

print_status "$BLUE" "📋 Instructions for each tab:"
echo ""
print_status "$YELLOW" "Tab 1 - OAuth Client Credentials:"
echo "  1. Click on: $OAUTH_CLIENT_ID"
echo "  2. In 'Authorized redirect URIs' section:"
echo "     - CLEAR all existing URIs"
echo "     - ADD: http://localhost:3000/api/auth/callback/google"
echo "     - ADD: https://$DOMAIN/api/auth/callback/google"
echo "  3. Click 'Save'"
echo ""

print_status "$YELLOW" "Tab 2 - OAuth Consent Screen:"
echo "  1. Scroll down to 'Test users' section"
echo "  2. If $TEST_USER is not listed:"
echo "     - Click 'ADD USERS'"
echo "     - Add: $TEST_USER"
echo "     - Click 'Save'"
echo "  3. If already listed, you're good to go!"
echo ""

print_status "$GREEN" "🧪 After completing both steps, test at:"
print_status "$GREEN" "   https://$DOMAIN"
echo ""

print_status "$BLUE" "💡 Benefits of custom domain OAuth setup:"
echo "  ✅ Stable redirect URIs (no more changes with deployments)"
echo "  ✅ Professional appearance"
echo "  ✅ Easier to remember and share"
echo "  ✅ Better for production use"
echo ""

# Create a detailed instruction file
cat > "oauth-custom-domain-final-setup.txt" << EOF
🔐 Final OAuth Setup for Custom Domain
=====================================

Custom Domain: https://$DOMAIN
OAuth Client ID: $OAUTH_CLIENT_ID
Test User: $TEST_USER

📋 STEP 1: Update OAuth Redirect URIs
1. Go to: $CREDENTIALS_URL
2. Click on OAuth Client ID: $OAUTH_CLIENT_ID
3. In "Authorized redirect URIs" section:
   - CLEAR all existing URIs (remove old Cloud Run URLs)
   - ADD: http://localhost:3000/api/auth/callback/google
   - ADD: https://$DOMAIN/api/auth/callback/google
4. Click "Save"

📋 STEP 2: Add Test User (if not already added)
1. Go to: $CONSENT_SCREEN_URL
2. Scroll to "Test users" section
3. If $TEST_USER is not listed:
   - Click "ADD USERS"
   - Add: $TEST_USER
   - Click "Save"

✅ Expected Result:
- Visit: https://$DOMAIN
- Click "Continue with Google"
- Sign in with: $TEST_USER
- Successful redirect to onboarding page

🚨 No More URI Mismatch Errors!
The custom domain provides stable redirect URIs that never change,
permanently solving the OAuth redirect URI mismatch problem.

Generated: $(date)
EOF

print_status "$GREEN" "📄 Created detailed instructions: oauth-custom-domain-final-setup.txt"
echo ""
print_status "$YELLOW" "⚡ Once you complete the OAuth setup, the URI mismatch errors will be gone forever!"