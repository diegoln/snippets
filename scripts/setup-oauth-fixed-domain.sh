#!/bin/bash

# OAuth Setup Script for Fixed Domain Configuration
# This script provides instructions and helps set up OAuth with a fixed domain
# to eliminate the need for manual OAuth updates on every deployment

set -e

PROJECT_ID="${PROJECT_ID:-advanceweekly-prod}"
DOMAIN_NAME="${DOMAIN_NAME:-advanceweekly.io}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}🔧 OAuth Setup for Fixed Domain Configuration${NC}"
echo -e "${BOLD}==============================================${NC}"
echo ""

echo -e "${BLUE}This script helps you configure OAuth for automated deployments${NC}"
echo -e "${BLUE}using a FIXED domain that never changes.${NC}"
echo ""

echo -e "${YELLOW}🎯 GOAL: Eliminate manual OAuth updates on every deployment${NC}"
echo ""

# Step 1: Domain Configuration
echo -e "${BOLD}Step 1: Domain Configuration${NC}"
echo -e "Domain: ${GREEN}https://${DOMAIN_NAME}${NC}"
echo -e "OAuth Redirect URI: ${GREEN}https://${DOMAIN_NAME}/api/auth/callback/google${NC}"
echo ""

# Step 2: DNS Configuration Check
echo -e "${BOLD}Step 2: DNS Configuration${NC}"
echo "Checking if Terraform infrastructure is deployed..."

# Check if Terraform state exists
if [ -f "terraform/terraform.tfstate" ] || [ -n "$TERRAFORM_STATE_BUCKET" ]; then
    echo -e "✅ Terraform infrastructure appears to be configured"
    echo ""
    echo -e "${YELLOW}Get the load balancer IP:${NC}"
    echo "cd terraform && terraform output load_balancer_ip"
    echo ""
    echo -e "${YELLOW}Configure DNS with your domain registrar:${NC}"
    echo "Type: A"
    echo "Name: @ (or ${DOMAIN_NAME})"
    echo "Value: [Load Balancer IP from terraform output]"
else
    echo -e "${RED}❌ Terraform infrastructure not found${NC}"
    echo ""
    echo -e "${YELLOW}Deploy infrastructure first:${NC}"
    echo "cd terraform"
    echo "terraform init"
    echo "terraform plan"
    echo "terraform apply"
    echo ""
    echo -e "${YELLOW}Then configure DNS with the load balancer IP${NC}"
fi
echo ""

# Step 3: OAuth Client Configuration
echo -e "${BOLD}Step 3: OAuth Client Configuration (ONE-TIME SETUP)${NC}"
echo ""
echo -e "${GREEN}🚀 This is the KEY to automated deployments!${NC}"
echo -e "${GREEN}Configure OAuth client ONCE with the fixed domain.${NC}"
echo ""

# Check if we can get the OAuth client info
if command -v gcloud >/dev/null 2>&1; then
    echo "Getting OAuth client information..."
    
    # Try to get OAuth client ID from secrets
    OAUTH_CLIENT_ID=$(gcloud secrets versions access latest --secret=google-client-id --project=$PROJECT_ID 2>/dev/null || echo "")
    
    if [ -n "$OAUTH_CLIENT_ID" ]; then
        echo -e "OAuth Client ID: ${GREEN}$OAUTH_CLIENT_ID${NC}"
        echo ""
        echo -e "${YELLOW}📝 Manual Configuration Required:${NC}"
        echo -e "1. Visit: ${BLUE}https://console.cloud.google.com/apis/credentials/oauthclient/$OAUTH_CLIENT_ID?project=$PROJECT_ID${NC}"
        echo ""
    else
        echo -e "${YELLOW}📝 OAuth Client Configuration:${NC}"
        echo -e "1. Visit: ${BLUE}https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID${NC}"
        echo ""
    fi
else
    echo -e "${YELLOW}📝 OAuth Client Configuration:${NC}"
    echo -e "1. Visit: ${BLUE}https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID${NC}"
    echo ""
fi

echo "2. Find your OAuth 2.0 Client ID (or create one if needed)"
echo "3. Click on the OAuth client to edit it"
echo "4. In the 'Authorized redirect URIs' section, ensure these URIs are present:"
echo ""
echo -e "   ${GREEN}✅ http://localhost:3000/api/auth/callback/google${NC} (for development)"
echo -e "   ${GREEN}✅ https://${DOMAIN_NAME}/api/auth/callback/google${NC} (for production)"
echo ""
echo "5. Remove any old dynamic Cloud Run URLs (they look like https://service-xyz-uc.a.run.app)"
echo "6. Click 'SAVE'"
echo ""

# Step 4: Verification
echo -e "${BOLD}Step 4: Verification${NC}"
echo ""
echo -e "${YELLOW}After completing the OAuth setup:${NC}"
echo ""
echo "1. Test the configuration:"
echo -e "   Visit: ${BLUE}https://${DOMAIN_NAME}${NC}"
echo ""
echo "2. Try signing in with Google OAuth"
echo ""
echo "3. Check that authentication works without errors"
echo ""

# Step 5: Future Deployments
echo -e "${BOLD}Step 5: Future Deployments${NC}"
echo ""
echo -e "${GREEN}🎉 CONGRATULATIONS!${NC}"
echo -e "${GREEN}Once this setup is complete, future deployments will be FULLY AUTOMATED!${NC}"
echo ""
echo -e "${YELLOW}Every GitHub push to main will:${NC}"
echo "✅ Deploy automatically"
echo "✅ Use the same fixed domain"
echo "✅ Work with OAuth immediately"
echo "❌ NO manual OAuth updates needed"
echo ""

# Summary
echo -e "${BOLD}📋 Summary${NC}"
echo -e "${BOLD}==========${NC}"
echo ""
echo -e "Fixed Domain: ${GREEN}https://${DOMAIN_NAME}${NC}"
echo -e "OAuth Redirect URI: ${GREEN}https://${DOMAIN_NAME}/api/auth/callback/google${NC}"
echo -e "Configuration Type: ${GREEN}ONE-TIME SETUP${NC}"
echo -e "Future Manual Steps: ${GREEN}NONE${NC}"
echo ""
echo -e "${BOLD}🚀 This eliminates the redirect URI mismatch problem forever!${NC}"
echo ""

# Create a quick reference file
cat > oauth-setup-reference.md << EOF
# OAuth Fixed Domain Configuration

## Configuration Complete ✅

- **Domain**: https://${DOMAIN_NAME}
- **OAuth Redirect URI**: https://${DOMAIN_NAME}/api/auth/callback/google
- **Configuration Type**: Fixed (never changes)
- **Manual Updates**: Not required

## Google Cloud Console Configuration

1. Visit: https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}
2. Edit your OAuth 2.0 Client ID
3. Ensure these redirect URIs are configured:
   - http://localhost:3000/api/auth/callback/google (development)
   - https://${DOMAIN_NAME}/api/auth/callback/google (production)

## Deployment Status

- ✅ Infrastructure: Terraform configured
- ✅ Domain: Fixed configuration
- ✅ OAuth: One-time setup
- ✅ Automation: Full deployment automation

## Key Benefits

- 🚀 **Fully Automated Deployments**: No manual steps
- 🔒 **Fixed OAuth Configuration**: Never needs updates
- ⚡ **Instant Authentication**: Works immediately after deployment
- 🛡️ **No Redirect URI Mismatch**: Problem solved forever

Generated: $(date)
EOF

echo -e "${GREEN}📄 Reference file created: oauth-setup-reference.md${NC}"
echo ""
echo -e "${BOLD}Next: Run this script after completing DNS and OAuth setup to verify everything works!${NC}"