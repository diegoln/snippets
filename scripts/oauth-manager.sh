#!/bin/bash

# OAuth Manager Script - Comprehensive OAuth configuration management
# This script handles OAuth redirect URI updates with retry logic and better error handling

set -e

# Configuration
PROJECT_ID="${PROJECT_ID:-advanceweekly-prod}"
SERVICE_NAME="${SERVICE_NAME:-advanceweekly}"
REGION="${REGION:-us-central1}"
OAUTH_CLIENT_ID="${GOOGLE_CLIENT_ID}"
MAX_RETRIES=3
RETRY_DELAY=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Retry function
retry_command() {
    local command="$1"
    local description="$2"
    local attempt=1
    
    while [ $attempt -le $MAX_RETRIES ]; do
        log_info "Attempting $description (attempt $attempt/$MAX_RETRIES)..."
        
        if eval "$command"; then
            log_success "$description succeeded"
            return 0
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            log_warning "$description failed, retrying in $RETRY_DELAY seconds..."
            sleep $RETRY_DELAY
        fi
        
        ((attempt++))
    done
    
    log_error "$description failed after $MAX_RETRIES attempts"
    return 1
}

# Main execution
log_info "Starting OAuth Manager"
log_info "Project: $PROJECT_ID"
log_info "Service: $SERVICE_NAME"
log_info "Region: $REGION"

# Validate OAuth client ID
if [ -z "$OAUTH_CLIENT_ID" ]; then
    log_error "GOOGLE_CLIENT_ID environment variable is not set"
    exit 1
fi

# Get Cloud Run service URL
log_info "Fetching Cloud Run service URL..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    log_error "Could not retrieve Cloud Run service URL"
    exit 1
fi

log_success "Service URL: $SERVICE_URL"

# Define redirect URIs
REDIRECT_URIS=(
    "http://localhost:3000/api/auth/callback/google"
    "https://advanceweekly.io/api/auth/callback/google"
    "$SERVICE_URL/api/auth/callback/google"
)

log_info "Required redirect URIs:"
for uri in "${REDIRECT_URIS[@]}"; do
    echo "  - $uri"
done

# Update NEXTAUTH_URL with retry
update_nextauth_url() {
    gcloud run services update "$SERVICE_NAME" \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --update-env-vars="NEXTAUTH_URL=$SERVICE_URL" \
        --quiet 2>&1
}

retry_command "update_nextauth_url" "NEXTAUTH_URL update"

# Verify NEXTAUTH_URL was updated
log_info "Verifying NEXTAUTH_URL configuration..."
CURRENT_NEXTAUTH_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="export" 2>/dev/null | grep -oP 'NEXTAUTH_URL=\K[^"]*' || echo "")

if [ "$CURRENT_NEXTAUTH_URL" = "$SERVICE_URL" ]; then
    log_success "NEXTAUTH_URL correctly set to: $SERVICE_URL"
else
    log_warning "NEXTAUTH_URL mismatch. Expected: $SERVICE_URL, Got: $CURRENT_NEXTAUTH_URL"
fi

# Create OAuth configuration file
log_info "Creating OAuth configuration file..."
cat > oauth-config.json << EOF
{
  "client_id": "$OAUTH_CLIENT_ID",
  "project_id": "$PROJECT_ID",
  "service_name": "$SERVICE_NAME",
  "service_url": "$SERVICE_URL",
  "nextauth_url": "$SERVICE_URL",
  "redirect_uris": $(printf '%s\n' "${REDIRECT_URIS[@]}" | jq -R . | jq -s .),
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "manual_update_url": "https://console.cloud.google.com/apis/credentials/oauthclient/$OAUTH_CLIENT_ID?project=$PROJECT_ID"
}
EOF

log_success "OAuth configuration saved to oauth-config.json"

# Test OAuth endpoints
test_oauth_endpoint() {
    local endpoint="$1"
    local description="$2"
    
    log_info "Testing $description..."
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
    
    if [ "$status_code" = "200" ]; then
        log_success "$description is accessible (HTTP $status_code)"
        return 0
    else
        log_warning "$description returned HTTP $status_code"
        return 1
    fi
}

# Wait for service to be ready
log_info "Waiting for service to stabilize..."
sleep 10

# Test endpoints
log_info "Running endpoint tests..."
test_oauth_endpoint "$SERVICE_URL" "Main service"
test_oauth_endpoint "$SERVICE_URL/api/auth/providers" "OAuth providers endpoint"

# Generate verification script
log_info "Creating verification script..."
cat > verify-oauth-setup.sh << 'VERIFY_EOF'
#!/bin/bash

# OAuth Setup Verification Script
SERVICE_URL="${1:-$(cat oauth-config.json 2>/dev/null | jq -r '.service_url' || echo "")}"

if [ -z "$SERVICE_URL" ]; then
    echo "Usage: $0 <service-url>"
    echo "Or ensure oauth-config.json exists in the current directory"
    exit 1
fi

echo "🔍 Verifying OAuth setup for: $SERVICE_URL"
echo ""

# Test main endpoint
echo -n "Testing main endpoint... "
if curl -f -s -o /dev/null "$SERVICE_URL"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

# Test OAuth providers
echo -n "Testing OAuth providers... "
PROVIDERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/providers")
if [ "$PROVIDERS_STATUS" = "200" ]; then
    echo "✅ OK (HTTP 200)"
else
    echo "⚠️  HTTP $PROVIDERS_STATUS"
fi

# Test OAuth callback
echo -n "Testing OAuth callback... "
CALLBACK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/callback/google")
if [ "$CALLBACK_STATUS" = "405" ] || [ "$CALLBACK_STATUS" = "400" ]; then
    echo "✅ OK (endpoint exists)"
else
    echo "⚠️  HTTP $CALLBACK_STATUS"
fi

echo ""
echo "📋 Summary:"
echo "  Service URL: $SERVICE_URL"
echo "  Config file: $([ -f oauth-config.json ] && echo "✅ Found" || echo "❌ Not found")"
echo ""
echo "🔧 Next steps:"
echo "1. Ensure redirect URIs are configured in Google Cloud Console"
echo "2. Test actual OAuth login flow"
VERIFY_EOF

chmod +x verify-oauth-setup.sh
log_success "Verification script created: verify-oauth-setup.sh"

# Final summary
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "                    OAuth Manager Summary                        "
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Service URL: $SERVICE_URL"
echo "✅ NEXTAUTH_URL: $CURRENT_NEXTAUTH_URL"
echo "✅ OAuth Client ID: $OAUTH_CLIENT_ID"
echo ""
echo "📋 Required Redirect URIs:"
for uri in "${REDIRECT_URIS[@]}"; do
    echo "   • $uri"
done
echo ""
echo "🔧 Manual Configuration Required:"
echo "   1. Visit: https://console.cloud.google.com/apis/credentials"
echo "   2. Select OAuth client: $OAUTH_CLIENT_ID"
echo "   3. Add all redirect URIs listed above"
echo "   4. Save changes"
echo ""
echo "📁 Generated Files:"
echo "   • oauth-config.json - OAuth configuration"
echo "   • verify-oauth-setup.sh - Verification script"
echo ""
echo "🚀 To verify setup: ./verify-oauth-setup.sh"
echo "════════════════════════════════════════════════════════════════"

# Exit with appropriate code
if [ "$CURRENT_NEXTAUTH_URL" = "$SERVICE_URL" ]; then
    exit 0
else
    exit 1
fi