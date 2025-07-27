#!/bin/bash

# Script to set up custom domain for AdvanceWeekly
# This automates Cloud Run domain mapping and provides DNS configuration

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="advanceweekly.io"
SERVICE_NAME="advanceweekly"
REGION="us-central1"
PROJECT_ID="advanceweekly-prod"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check domain verification status
check_domain_verification() {
    print_status "$BLUE" "Checking domain verification status..."
    
    local verified_domains=$(gcloud domains list-user-verified --project="$PROJECT_ID" --format="value(id)" 2>/dev/null)
    
    if echo "$verified_domains" | grep -q "^$DOMAIN$"; then
        print_status "$GREEN" "✓ Domain $DOMAIN is verified"
        return 0
    else
        print_status "$YELLOW" "⚠️  Domain $DOMAIN is not yet verified"
        return 1
    fi
}

# Function to start domain verification
start_domain_verification() {
    print_status "$YELLOW" "Starting domain verification process..."
    
    print_status "$BLUE" "📋 Steps to verify your domain:"
    echo "1. The Google Search Console should have opened in your browser"
    echo "2. If not, visit: https://search.google.com/search-console/"
    echo "3. Add property: $DOMAIN"
    echo "4. Choose 'Domain' verification method"
    echo "5. Add the TXT record to your GoDaddy DNS"
    echo ""
    
    # Start verification
    gcloud domains verify "$DOMAIN" --project="$PROJECT_ID" || true
    
    print_status "$YELLOW" "⏳ After adding the TXT record, verification may take up to 24 hours"
    print_status "$BLUE" "💡 You can check status with: gcloud domains list-user-verified"
}

# Function to create domain mapping
create_domain_mapping() {
    print_status "$YELLOW" "Creating domain mapping for $DOMAIN..."
    
    # Create domain mapping
    gcloud beta run domain-mappings create \
        --service="$SERVICE_NAME" \
        --domain="$DOMAIN" \
        --region="$REGION" \
        --project="$PROJECT_ID"
    
    if [ $? -eq 0 ]; then
        print_status "$GREEN" "✓ Domain mapping created successfully!"
    else
        print_status "$RED" "❌ Failed to create domain mapping"
        return 1
    fi
}

# Function to get domain mapping details
get_domain_mapping_details() {
    print_status "$BLUE" "Getting domain mapping details..."
    
    local mapping_info=$(gcloud beta run domain-mappings describe "$DOMAIN" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --format="export" 2>/dev/null || echo "MAPPING_NOT_FOUND")
    
    if [[ "$mapping_info" == "MAPPING_NOT_FOUND" ]]; then
        print_status "$YELLOW" "⚠️  Domain mapping not found. Create it first."
        return 1
    fi
    
    # Extract the CNAME target
    local cname_target=$(echo "$mapping_info" | grep -E "^\s*resourceRecords:" -A 10 | grep "rrdata:" | head -1 | sed 's/.*rrdata: //' | tr -d '"')
    
    if [ -n "$cname_target" ]; then
        print_status "$GREEN" "✓ CNAME target: $cname_target"
        echo "$cname_target"
        return 0
    else
        print_status "$YELLOW" "⚠️  CNAME target not yet available. Domain mapping may still be processing."
        return 1
    fi
}

# Function to create DNS configuration instructions
create_dns_instructions() {
    local cname_target=$1
    
    cat > "godaddy-dns-setup.txt" << EOF
🌐 GoDaddy DNS Configuration for $DOMAIN
========================================

📋 DNS Records to Add in GoDaddy:

1. CNAME Record (for www subdomain):
   Type: CNAME
   Name: www
   Value: $cname_target
   TTL: 600 (10 minutes)

2. A Record (for root domain):
   Type: A  
   Name: @
   Value: 216.239.32.21
   TTL: 600 (10 minutes)

3. A Record (additional):
   Type: A
   Name: @  
   Value: 216.239.34.21
   TTL: 600 (10 minutes)

4. A Record (additional):
   Type: A
   Name: @
   Value: 216.239.36.21
   TTL: 600 (10 minutes)

5. A Record (additional):
   Type: A
   Name: @
   Value: 216.239.38.21
   TTL: 600 (10 minutes)

📋 Steps in GoDaddy:
1. Log in to GoDaddy
2. Go to "My Products" → "Domains" → "$DOMAIN" → "Manage"
3. Click "DNS" tab
4. Add the records above
5. Save changes

⏳ DNS propagation takes 24-48 hours
🧪 Test with: dig $DOMAIN

Generated: $(date)
EOF
    
    print_status "$GREEN" "📄 Created GoDaddy DNS setup instructions: godaddy-dns-setup.txt"
}

# Function to update NEXTAUTH_URL
update_nextauth_url() {
    print_status "$YELLOW" "Updating NEXTAUTH_URL to use custom domain..."
    
    gcloud run services update "$SERVICE_NAME" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --update-env-vars="NEXTAUTH_URL=https://$DOMAIN" \
        --quiet
    
    if [ $? -eq 0 ]; then
        print_status "$GREEN" "✓ NEXTAUTH_URL updated to https://$DOMAIN"
    else
        print_status "$RED" "❌ Failed to update NEXTAUTH_URL"
        return 1
    fi
}

# Function to create OAuth redirect URI instructions
create_oauth_instructions() {
    cat > "oauth-custom-domain-setup.txt" << EOF
🔐 OAuth Setup for Custom Domain
================================

Now that you have a custom domain, update your OAuth configuration:

📋 Google Cloud Console OAuth Client:
1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID
2. Click on OAuth Client ID: 926387508050-qooa9pr76al06rjsma2abrqaob1e00ug.apps.googleusercontent.com
3. In "Authorized redirect URIs", REPLACE with:
   - http://localhost:3000/api/auth/callback/google (development)
   - https://$DOMAIN/api/auth/callback/google (production)
4. Click "Save"

✅ Benefits of custom domain:
- Stable redirect URIs (no more Cloud Run URL changes)
- Professional appearance
- SSL certificate automatically managed by Google
- Better SEO and branding

🧪 Test authentication at: https://$DOMAIN

Generated: $(date)
EOF
    
    print_status "$GREEN" "📄 Created OAuth setup instructions: oauth-custom-domain-setup.txt"
}

# Main execution
main() {
    print_status "$GREEN" "=== Custom Domain Setup for AdvanceWeekly ==="
    echo ""
    print_status "$BLUE" "Domain: $DOMAIN"
    print_status "$BLUE" "Service: $SERVICE_NAME"
    print_status "$BLUE" "Project: $PROJECT_ID"
    echo ""
    
    # Check domain verification
    if ! check_domain_verification; then
        start_domain_verification
        print_status "$YELLOW" "📋 Please complete domain verification first, then run this script again"
        return 0
    fi
    
    # Create domain mapping
    if ! create_domain_mapping; then
        print_status "$RED" "❌ Failed to create domain mapping"
        return 1
    fi
    
    echo ""
    print_status "$BLUE" "⏳ Waiting for domain mapping to initialize..."
    sleep 10
    
    # Get domain mapping details and CNAME target
    local cname_target
    local retries=0
    local max_retries=5
    
    while [ $retries -lt $max_retries ]; do
        if cname_target=$(get_domain_mapping_details); then
            break
        fi
        retries=$((retries + 1))
        print_status "$YELLOW" "⏳ Waiting for CNAME target... (attempt $retries/$max_retries)"
        sleep 15
    done
    
    if [ -z "$cname_target" ]; then
        print_status "$YELLOW" "⚠️  CNAME target not available yet. You can check later with:"
        print_status "$BLUE" "    gcloud beta run domain-mappings describe $DOMAIN --region=$REGION"
        return 1
    fi
    
    # Create DNS instructions
    create_dns_instructions "$cname_target"
    echo ""
    
    # Update NEXTAUTH_URL
    update_nextauth_url
    echo ""
    
    # Create OAuth instructions
    create_oauth_instructions
    echo ""
    
    print_status "$GREEN" "=== Setup Complete! ==="
    echo ""
    print_status "$BLUE" "📋 Next Steps:"
    echo "1. Configure DNS records in GoDaddy (see: godaddy-dns-setup.txt)"
    echo "2. Update OAuth redirect URIs (see: oauth-custom-domain-setup.txt)"
    echo "3. Wait 24-48 hours for DNS propagation"
    echo "4. Test at: https://$DOMAIN"
    echo ""
    print_status "$YELLOW" "💡 The domain will show SSL errors until DNS is fully propagated"
}

# Handle help
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    echo "Custom Domain Setup Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "This script sets up advanceweekly.io as a custom domain for Cloud Run"
    echo ""
    echo "Prerequisites:"
    echo "  - Domain verification completed in Google Search Console"
    echo "  - gcloud CLI authenticated with proper permissions"
    echo ""
    exit 0
fi

# Run main function
main "$@"