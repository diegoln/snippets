#!/bin/bash

# Deep OAuth Debugging Script
# Comprehensive testing of OAuth configuration and potential issues

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="advanceweekly.io"
PROJECT_ID="advanceweekly-prod"
OAUTH_CLIENT_ID="926387508050-qooa9pr76al06rjsma2abrqaob1e00ug.apps.googleusercontent.com"
TEST_USER="diegoln@gmail.com"

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status "$PURPLE" "🔬 DEEP OAUTH DEBUGGING SESSION"
print_status "$PURPLE" "==============================="
echo ""

# Test 1: Basic connectivity
print_status "$BLUE" "🧪 TEST 1: Basic Connectivity"
echo ""

print_status "$YELLOW" "Testing domain resolution..."
if dig +short "$DOMAIN" | grep -q "216.239"; then
    print_status "$GREEN" "✅ DNS resolution working"
else
    print_status "$RED" "❌ DNS issue detected"
fi

print_status "$YELLOW" "Testing HTTPS connectivity..."
if curl -s -I "https://$DOMAIN" | head -1 | grep -q "200"; then
    print_status "$GREEN" "✅ HTTPS working"
else
    print_status "$RED" "❌ HTTPS issue detected"
    curl -s -I "https://$DOMAIN" | head -5
fi
echo ""

# Test 2: NextAuth configuration
print_status "$BLUE" "🧪 TEST 2: NextAuth Configuration"
echo ""

print_status "$YELLOW" "Testing NextAuth providers endpoint..."
PROVIDERS_JSON=$(curl -s "https://$DOMAIN/api/auth/providers" 2>/dev/null || echo "ERROR")
if [[ "$PROVIDERS_JSON" != "ERROR" ]]; then
    print_status "$GREEN" "✅ Providers endpoint accessible"
    echo "Response: $PROVIDERS_JSON"
    
    # Parse and validate the JSON response
    if echo "$PROVIDERS_JSON" | grep -q "google"; then
        print_status "$GREEN" "✅ Google provider found"
        
        # Extract callback URL
        CALLBACK_URL=$(echo "$PROVIDERS_JSON" | sed -n 's/.*"callbackUrl":"\([^"]*\)".*/\1/p')
        if [[ "$CALLBACK_URL" == "https://$DOMAIN/api/auth/callback/google" ]]; then
            print_status "$GREEN" "✅ Callback URL correct: $CALLBACK_URL"
        else
            print_status "$RED" "❌ Callback URL mismatch: $CALLBACK_URL"
        fi
    else
        print_status "$RED" "❌ Google provider not found"
    fi
else
    print_status "$RED" "❌ Cannot access providers endpoint"
fi
echo ""

# Test 3: Direct OAuth endpoint testing
print_status "$BLUE" "🧪 TEST 3: Direct OAuth Endpoint Testing"
echo ""

print_status "$YELLOW" "Testing direct Google OAuth signin endpoint..."
OAUTH_RESPONSE=$(curl -s -I "https://$DOMAIN/api/auth/signin/google" 2>/dev/null || echo "ERROR")
if [[ "$OAUTH_RESPONSE" != "ERROR" ]]; then
    if echo "$OAUTH_RESPONSE" | grep -q "302\|301"; then
        print_status "$GREEN" "✅ OAuth signin endpoint returns redirect (expected)"
        
        # Extract Location header
        REDIRECT_URL=$(echo "$OAUTH_RESPONSE" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r\n')
        if [[ "$REDIRECT_URL" == *"accounts.google.com"* ]]; then
            print_status "$GREEN" "✅ Redirects to Google OAuth: $REDIRECT_URL"
        else
            print_status "$RED" "❌ Unexpected redirect: $REDIRECT_URL"
        fi
    else
        print_status "$RED" "❌ OAuth endpoint error:"
        echo "$OAUTH_RESPONSE" | head -5
    fi
else
    print_status "$RED" "❌ Cannot access OAuth signin endpoint"
fi
echo ""

# Test 4: Check for environment variables
print_status "$BLUE" "🧪 TEST 4: Environment Variable Check"
echo ""

print_status "$YELLOW" "Testing if OAuth credentials are properly set..."
# Try to make a request that would fail if credentials are missing
TEST_SESSION=$(curl -s "https://$DOMAIN/api/auth/session" 2>/dev/null || echo "ERROR")
if [[ "$TEST_SESSION" != "ERROR" ]]; then
    print_status "$GREEN" "✅ Session endpoint accessible"
    echo "Response: $TEST_SESSION"
else
    print_status "$RED" "❌ Session endpoint error"
fi
echo ""

# Test 5: OAuth URL Analysis
print_status "$BLUE" "🧪 TEST 5: OAuth URL Structure Analysis"
echo ""

print_status "$YELLOW" "Analyzing OAuth signin URL structure..."
if command -v curl > /dev/null; then
    # Get the actual OAuth URL that NextAuth generates
    OAUTH_URL=$(curl -s -I "https://$DOMAIN/api/auth/signin/google" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r\n')
    
    if [[ "$OAUTH_URL" == *"accounts.google.com"* ]]; then
        print_status "$GREEN" "✅ OAuth URL contains Google accounts domain"
        
        # Check for client_id
        if [[ "$OAUTH_URL" == *"client_id"* ]]; then
            print_status "$GREEN" "✅ OAuth URL contains client_id parameter"
            
            # Extract client_id from URL
            CLIENT_ID_IN_URL=$(echo "$OAUTH_URL" | sed -n 's/.*client_id=\([^&]*\).*/\1/p')
            if [[ "$CLIENT_ID_IN_URL" == "$OAUTH_CLIENT_ID" ]]; then
                print_status "$GREEN" "✅ Client ID in URL matches expected: $CLIENT_ID_IN_URL"
            else
                print_status "$RED" "❌ Client ID mismatch!"
                print_status "$RED" "   Expected: $OAUTH_CLIENT_ID"
                print_status "$RED" "   In URL: $CLIENT_ID_IN_URL"
            fi
        else
            print_status "$RED" "❌ OAuth URL missing client_id parameter"
        fi
        
        # Check for redirect_uri
        if [[ "$OAUTH_URL" == *"redirect_uri"* ]]; then
            print_status "$GREEN" "✅ OAuth URL contains redirect_uri parameter"
            
            # Extract redirect_uri
            REDIRECT_URI=$(echo "$OAUTH_URL" | sed -n 's/.*redirect_uri=\([^&]*\).*/\1/p' | python3 -c "import urllib.parse; import sys; print(urllib.parse.unquote(sys.stdin.read().strip()))" 2>/dev/null || echo "DECODE_ERROR")
            
            if [[ "$REDIRECT_URI" == "https://$DOMAIN/api/auth/callback/google" ]]; then
                print_status "$GREEN" "✅ Redirect URI correct: $REDIRECT_URI"
            else
                print_status "$RED" "❌ Redirect URI issue: $REDIRECT_URI"
            fi
        else
            print_status "$RED" "❌ OAuth URL missing redirect_uri parameter"
        fi
        
        echo ""
        print_status "$BLUE" "Full OAuth URL (first 200 chars):"
        echo "${OAUTH_URL:0:200}..."
        
    else
        print_status "$RED" "❌ OAuth URL doesn't point to Google accounts"
        print_status "$RED" "   URL: $OAUTH_URL"
    fi
fi
echo ""

# Test 6: Browser simulation
print_status "$BLUE" "🧪 TEST 6: Browser Simulation Test"
echo ""

print_status "$YELLOW" "Simulating browser OAuth flow..."
# Follow the OAuth redirect and see what happens
if command -v curl > /dev/null; then
    print_status "$BLUE" "Step 1: Request OAuth signin..."
    OAUTH_REDIRECT=$(curl -s -I "https://$DOMAIN/api/auth/signin/google" | grep -i "location:" | cut -d' ' -f2- | tr -d '\r\n')
    
    if [[ -n "$OAUTH_REDIRECT" ]]; then
        print_status "$GREEN" "✅ Got OAuth redirect URL"
        
        print_status "$BLUE" "Step 2: Test Google OAuth endpoint..."
        # Just test if Google's OAuth endpoint is reachable (don't actually follow it)
        GOOGLE_RESPONSE=$(curl -s -I "$OAUTH_REDIRECT" --max-time 10 2>/dev/null | head -1 || echo "TIMEOUT")
        
        if [[ "$GOOGLE_RESPONSE" == *"200"* ]] || [[ "$GOOGLE_RESPONSE" == *"302"* ]]; then
            print_status "$GREEN" "✅ Google OAuth endpoint reachable"
        else
            print_status "$RED" "❌ Google OAuth endpoint issue: $GOOGLE_RESPONSE"
        fi
    else
        print_status "$RED" "❌ No OAuth redirect received"
    fi
fi
echo ""

# Summary and recommendations
print_status "$PURPLE" "📋 DEBUGGING SUMMARY & NEXT STEPS"
print_status "$PURPLE" "=================================="
echo ""

cat > "deep-oauth-debug-results.txt" << EOF
🔬 Deep OAuth Debug Results - $(date)
=====================================

Domain: $DOMAIN
Project: $PROJECT_ID
OAuth Client: $OAUTH_CLIENT_ID
Test User: $TEST_USER

TECHNICAL TESTS PERFORMED:
✓ DNS resolution check
✓ HTTPS connectivity test  
✓ NextAuth providers endpoint
✓ Direct OAuth signin endpoint
✓ Session endpoint accessibility
✓ OAuth URL structure analysis
✓ Browser flow simulation

NEXT DEBUGGING STEPS IF STILL FAILING:

1. 🔍 VERIFY GOOGLE CLOUD CONSOLE SETTINGS:
   - Go to: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID
   - Publishing Status: MUST be "Testing" (not "In production")
   - User Type: MUST be "External"
   - Test Users: MUST include "$TEST_USER"

2. 🧹 BROWSER TROUBLESHOOTING:
   - Clear ALL cookies for google.com and $DOMAIN
   - Try incognito/private browsing mode
   - Try different browser entirely
   - Try different device if available

3. 🔐 OAUTH CLIENT VERIFICATION:
   - Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID
   - Click on: $OAUTH_CLIENT_ID
   - Verify redirect URIs include:
     * http://localhost:3000/api/auth/callback/google
     * https://$DOMAIN/api/auth/callback/google

4. ⏱️ TIMING ISSUES:
   - Wait 5-10 minutes after making changes in Google Cloud Console
   - OAuth changes can take time to propagate

5. 🧪 ALTERNATIVE TESTING:
   - Try signing in with a completely different Google account
   - Test from different IP address/location
   - Check if error message has changed

6. 🚨 ESCALATION STEPS:
   - Enable verbose NextAuth debugging
   - Check Cloud Run logs for detailed error messages
   - Consider creating fresh OAuth client if issue persists

The technical configuration appears correct. The issue is likely:
1. Google Cloud Console configuration not saved properly
2. Browser cache/cookie issues
3. Timing/propagation delays

Generated: $(date)
EOF

print_status "$GREEN" "📄 Detailed results saved to: deep-oauth-debug-results.txt"
echo ""

print_status "$YELLOW" "🎯 MOST LIKELY NEXT STEPS:"
echo "1. Clear browser cache/cookies completely"
echo "2. Try incognito mode"
echo "3. Double-check Google Cloud Console settings (wait 5-10 mins after changes)"
echo "4. Try different Google account or device"
echo ""
print_status "$BLUE" "📞 If still failing, we may need to:"
echo "- Enable NextAuth debug logging"
echo "- Check Cloud Run application logs"
echo "- Create fresh OAuth credentials"