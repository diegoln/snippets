#!/bin/bash

# OAuth Diagnostic Script - "Try signing in with a different account" error
# This script helps diagnose common OAuth issues

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

print_status "$GREEN" "🔍 OAuth Diagnostic Tool"
print_status "$GREEN" "Diagnosing: 'Try signing in with a different account' error"
echo ""

print_status "$BLUE" "📋 Checking NextAuth Configuration..."
echo ""

# Check NextAuth providers
print_status "$YELLOW" "1. NextAuth Providers Check:"
PROVIDERS_RESPONSE=$(curl -s "https://$DOMAIN/api/auth/providers" 2>/dev/null || echo "ERROR")

if [[ "$PROVIDERS_RESPONSE" == "ERROR" ]]; then
    print_status "$RED" "   ❌ Cannot reach NextAuth providers endpoint"
else
    echo "   ✅ NextAuth providers endpoint accessible"
    echo "   📋 Response: $PROVIDERS_RESPONSE"
    
    if [[ "$PROVIDERS_RESPONSE" == *"google"* ]]; then
        print_status "$GREEN" "   ✅ Google provider configured"
        
        if [[ "$PROVIDERS_RESPONSE" == *"https://$DOMAIN/api/auth/callback/google"* ]]; then
            print_status "$GREEN" "   ✅ Callback URL uses custom domain"
        else
            print_status "$RED" "   ❌ Callback URL issue detected"
        fi
    else
        print_status "$RED" "   ❌ Google provider not found"
    fi
fi
echo ""

print_status "$BLUE" "📋 Common Causes of 'Try signing in with a different account':"
echo ""

print_status "$YELLOW" "❗ MOST COMMON CAUSES:"
echo ""

print_status "$RED" "1. APP PUBLISHING STATUS:"
echo "   - If app is in 'Testing' mode, only whitelisted users can sign in"
echo "   - Refresh tokens expire in 7 days for testing apps"
echo "   - Check: OAuth Consent Screen → Publishing Status"
echo ""

print_status "$RED" "2. TEST USER NOT PROPERLY ADDED:"
echo "   - User must be in 'Test users' section of OAuth Consent Screen"
echo "   - In 2025 interface, check under 'Audience' → 'User management'"
echo "   - Verify: $TEST_USER is listed"
echo ""

print_status "$RED" "3. ORGANIZATION RESTRICTIONS:"
echo "   - OAuth client may be restricted to specific Google Cloud Organization"
echo "   - Check: OAuth Client → User type → Internal vs External"
echo "   - If Internal: Only organization members can sign in"
echo ""

print_status "$RED" "4. SCOPE VERIFICATION REQUIRED:"
echo "   - Apps requesting sensitive scopes need Google verification"
echo "   - Unverified apps show 'Try different account' to non-test users"
echo "   - Check: OAuth Consent Screen → Verification status"
echo ""

print_status "$RED" "5. BROWSER/CACHE ISSUES:"
echo "   - Clear browser cache and cookies"
echo "   - Try incognito/private mode"
echo "   - Test with different browser"
echo ""

print_status "$BLUE" "🔧 DIAGNOSTIC STEPS TO TRY:"
echo ""

print_status "$YELLOW" "Step 1: Verify App Publishing Status"
echo "   Go to: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo "   Check: Publishing status should be 'Testing' for development"
echo "   Look for: User type (External vs Internal)"
echo ""

print_status "$YELLOW" "Step 2: Verify Test User is Added"
echo "   In OAuth Consent Screen (or Google Auth Platform):"
echo "   Look for: 'Test users' section"
echo "   Ensure: $TEST_USER is listed"
echo "   Note: Case-sensitive email matching"
echo ""

print_status "$YELLOW" "Step 3: Check for Organization Restrictions"
echo "   In OAuth Client settings:"
echo "   Look for: 'Authorized domains' or organization restrictions"
echo "   Verify: No restrictions blocking your Google account"
echo ""

print_status "$YELLOW" "Step 4: Test OAuth Flow Manually"
echo "   Visit: https://$DOMAIN/api/auth/signin/google"
echo "   This bypasses NextAuth frontend and tests OAuth directly"
echo ""

print_status "$YELLOW" "Step 5: Check Browser Issues"
echo "   - Clear all cookies for google.com and $DOMAIN"
echo "   - Try incognito mode"
echo "   - Test with different Google account (if available)"
echo ""

print_status "$GREEN" "📊 QUICK VERIFICATION URLS:"
echo ""
echo "OAuth Client: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo "Consent Screen: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
echo "Direct OAuth Test: https://$DOMAIN/api/auth/signin/google"
echo "NextAuth Session: https://$DOMAIN/api/auth/session"
echo ""

# Create a detailed troubleshooting guide
cat > "oauth-troubleshooting-guide.txt" << EOF
🚨 OAuth Error: "Try signing in with a different account"
======================================================

Error Location: https://$DOMAIN
OAuth Client: $OAUTH_CLIENT_ID
Test User: $TEST_USER

🔍 ROOT CAUSE ANALYSIS:

This error typically means Google OAuth is rejecting the sign-in attempt.
The most common causes are:

1. ❌ APP IN TESTING MODE + USER NOT WHITELISTED
   - Solution: Add $TEST_USER to test users list
   - Location: OAuth Consent Screen → Test users

2. ❌ ORGANIZATION RESTRICTIONS
   - Solution: Change User type from Internal to External
   - Location: OAuth Consent Screen → User type

3. ❌ APP NEEDS VERIFICATION
   - Solution: Publish app or keep in testing with proper test users
   - Location: OAuth Consent Screen → Publishing status

4. ❌ BROWSER/CACHE ISSUES
   - Solution: Clear cookies, try incognito mode

📋 VERIFICATION CHECKLIST:

□ Test user $TEST_USER is added to OAuth Consent Screen
□ App publishing status is "Testing" (for development)
□ User type is "External" (unless you want org-only access)
□ No domain restrictions blocking the test user
□ Browser cache cleared
□ Correct redirect URIs configured:
  - http://localhost:3000/api/auth/callback/google
  - https://$DOMAIN/api/auth/callback/google

🧪 TEST URLS:
- Direct OAuth: https://$DOMAIN/api/auth/signin/google
- Session Check: https://$DOMAIN/api/auth/session
- Provider Config: https://$DOMAIN/api/auth/providers

Generated: $(date)
EOF

print_status "$GREEN" "📄 Created troubleshooting guide: oauth-troubleshooting-guide.txt"
echo ""
print_status "$YELLOW" "💡 Most likely issue: Test user not properly added in the new 2025 interface"
print_status "$YELLOW" "   Try looking under 'Audience' → 'User management' in Google Auth Platform"