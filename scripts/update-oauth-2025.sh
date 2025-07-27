#!/bin/bash

# Script to update OAuth configuration for 2025 Google Cloud Console interface
# Google has moved OAuth consent screen to Google Auth Platform

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

print_status "$GREEN" "🔐 OAuth Setup for 2025 Google Cloud Console"
echo ""

print_status "$BLUE" "📋 Updated Navigation (Google changed the interface in 2025):"
echo ""

# Updated URLs for 2025 interface
CREDENTIALS_URL="https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
AUTH_PLATFORM_URL="https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
ALTERNATIVE_AUTH_URL="https://console.cloud.google.com/apis/credentials/oauthconsent?project=$PROJECT_ID"

print_status "$YELLOW" "🚀 Opening OAuth setup pages..."

# Open OAuth Credentials page
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

sleep 3

# Try the auth platform URL
print_status "$BLUE" "Step 2: Opening Google Auth Platform..."
echo "URL: $AUTH_PLATFORM_URL"

if command -v xdg-open > /dev/null; then
    xdg-open "$AUTH_PLATFORM_URL"
elif command -v open > /dev/null; then
    open "$AUTH_PLATFORM_URL"
elif command -v start > /dev/null; then
    start "$AUTH_PLATFORM_URL"
else
    print_status "$YELLOW" "Please manually open: $AUTH_PLATFORM_URL"
fi

echo ""
print_status "$GREEN" "✅ OAuth setup pages opened!"
echo ""

print_status "$BLUE" "📋 Instructions for 2025 Interface:"
echo ""
print_status "$YELLOW" "Tab 1 - OAuth Client Credentials (SAME AS BEFORE):"
echo "  1. Click on: $OAUTH_CLIENT_ID"
echo "  2. In 'Authorized redirect URIs' section:"
echo "     - CLEAR all existing URIs"
echo "     - ADD: http://localhost:3000/api/auth/callback/google"
echo "     - ADD: https://$DOMAIN/api/auth/callback/google"
echo "  3. Click 'Save'"
echo ""

print_status "$YELLOW" "Tab 2 - Test Users (NEW 2025 INTERFACE):"
echo ""
print_status "$BLUE" "Option A: If you see OAuth Consent Screen:"
echo "  1. Look for 'Test users' section"
echo "  2. Add: $TEST_USER"
echo ""
print_status "$BLUE" "Option B: If you see Google Auth Platform Dashboard:"
echo "  1. Click on 'Audience' in the left menu"
echo "  2. Look for 'Test users' or 'User management' section"
echo "  3. Add: $TEST_USER"
echo ""
print_status "$BLUE" "Option C: If redirected to Overview:"
echo "  1. Look for 'Get Started' button"
echo "  2. Follow the setup wizard"
echo "  3. In User Type, select 'External'"
echo "  4. Add test user: $TEST_USER"
echo ""

print_status "$RED" "🚨 ALTERNATIVE METHOD (if above doesn't work):"
echo "Try these direct URLs:"
echo "  - $ALTERNATIVE_AUTH_URL"
echo "  - https://console.cloud.google.com/apis/credentials/oauthconsent?project=$PROJECT_ID"
echo ""

print_status "$GREEN" "🧪 After setup, test at: https://$DOMAIN"
echo ""

# Create comprehensive instructions
cat > "oauth-2025-interface-guide.txt" << EOF
🔐 OAuth Setup Guide for 2025 Google Cloud Console
=================================================

Google updated the interface in 2025. The OAuth consent screen is now part of "Google Auth Platform".

📋 STEP 1: Update OAuth Redirect URIs (UNCHANGED)
1. Go to: $CREDENTIALS_URL
2. Click on: $OAUTH_CLIENT_ID
3. Update "Authorized redirect URIs":
   - CLEAR all existing URIs
   - ADD: http://localhost:3000/api/auth/callback/google
   - ADD: https://$DOMAIN/api/auth/callback/google
4. Save

📋 STEP 2: Add Test User (NEW INTERFACE - MULTIPLE PATHS)

Path A - If OAuth Consent Screen loads:
1. Scroll to "Test users" section
2. Add: $TEST_USER

Path B - If Google Auth Platform Dashboard loads:
1. Click "Audience" in left menu
2. Find "Test users" section
3. Add: $TEST_USER

Path C - If Overview/Setup Wizard loads:
1. Click "Get Started" 
2. Configure app:
   - User Type: External
   - Publishing status: Testing
3. Add test user: $TEST_USER

📋 TROUBLESHOOTING:
- Interface keeps redirecting? Try: $ALTERNATIVE_AUTH_URL
- Can't find test users? Look under "Audience" → "User management"
- Still issues? Search for "test users" in the page

✅ GOAL:
Ensure $TEST_USER is whitelisted for your OAuth app in testing mode.

Generated: $(date)
EOF

print_status "$GREEN" "📄 Created comprehensive guide: oauth-2025-interface-guide.txt"
echo ""
print_status "$YELLOW" "💡 Google changed the OAuth interface in 2025 - multiple paths may work!"
print_status "$YELLOW" "   The key is to add $TEST_USER as a test user somewhere in the interface."