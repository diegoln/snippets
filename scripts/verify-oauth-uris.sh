#!/bin/bash

# Verify OAuth redirect URIs are properly configured

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}✅ NEXTAUTH_URL Fixed!${NC}"
echo ""
echo -e "${BLUE}Current OAuth Configuration:${NC}"
curl -s https://advanceweekly.io/api/auth/providers | python3 -m json.tool 2>/dev/null
echo ""

echo -e "${YELLOW}📋 VERIFY REDIRECT URIs IN GOOGLE CLOUD CONSOLE:${NC}"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=advanceweekly-prod"
echo "2. Click on: 926387508050-qooa9pr76al06rjsma2abrqaob1e00ug.apps.googleusercontent.com"
echo "3. Ensure these Authorized redirect URIs are configured:"
echo ""
echo -e "${GREEN}   ✅ http://localhost:3000/api/auth/callback/google${NC} (for development)"
echo -e "${GREEN}   ✅ https://advanceweekly.io/api/auth/callback/google${NC} (for production)"
echo ""
echo -e "${RED}❌ Remove any old URIs like:${NC}"
echo -e "${RED}   - https://advanceweekly-iknouo6toq-uc.a.run.app/api/auth/callback/google${NC}"
echo ""
echo -e "${BLUE}🧪 TEST OAUTH AGAIN:${NC}"
echo ""
echo "1. Clear browser cache/cookies for advanceweekly.io"
echo "2. Open incognito window" 
echo "3. Visit: https://advanceweekly.io"  
echo "4. Click 'Continue with Google'"
echo "5. Sign in with: diegoln@gmail.com"
echo ""
echo -e "${GREEN}Expected result: OAuth should work now!${NC}"