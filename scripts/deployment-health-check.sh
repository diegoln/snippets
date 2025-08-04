#!/bin/bash

# Deployment Health Check Script
# Comprehensive health checks with error recovery suggestions

set -e

# Configuration
PROJECT_ID="${PROJECT_ID:-advanceweekly-prod}"
SERVICE_NAME="${SERVICE_NAME:-advanceweekly}"
REGION="${REGION:-us-central1}"
MAX_WAIT_TIME=180  # 3 minutes
CHECK_INTERVAL=10  # 10 seconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

# Check function with timeout
check_with_timeout() {
    local check_name="$1"
    local check_command="$2"
    local expected_result="$3"
    local elapsed=0
    
    log_info "Checking $check_name..."
    
    while [ $elapsed -lt $MAX_WAIT_TIME ]; do
        if result=$(eval "$check_command" 2>&1); then
            if [[ "$result" == *"$expected_result"* ]]; then
                log_success "$check_name is healthy"
                return 0
            fi
        fi
        
        if [ $elapsed -eq 0 ]; then
            log_warning "$check_name not ready, waiting..."
        fi
        
        sleep $CHECK_INTERVAL
        elapsed=$((elapsed + CHECK_INTERVAL))
    done
    
    log_error "$check_name failed after ${elapsed}s"
    return 1
}

# Main health checks
echo "🏥 Deployment Health Check"
echo "=========================="

# 1. Get service URL
log_info "Retrieving service information..."
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    log_error "Could not retrieve service URL. Deployment may have failed."
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Check Cloud Build logs: gcloud builds list --limit=1"
    echo "2. Verify service exists: gcloud run services list --region=$REGION"
    echo "3. Check deployment permissions"
    exit 1
fi

log_success "Service URL: $SERVICE_URL"

# 2. Check service readiness
if ! check_with_timeout "Service readiness" \
    "gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID --format='value(status.conditions[0].status)'" \
    "True"; then
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Check service logs: gcloud run logs read --service=$SERVICE_NAME --region=$REGION"
    echo "2. Verify container startup: Check Dockerfile and startup scripts"
    echo "3. Check resource limits: Memory/CPU might be insufficient"
fi

# 3. Check HTTP endpoint
if ! check_with_timeout "HTTP endpoint" \
    "curl -s -o /dev/null -w '%{http_code}' $SERVICE_URL" \
    "200"; then
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Check if service is publicly accessible"
    echo "2. Verify ingress settings: gcloud run services describe $SERVICE_NAME --region=$REGION"
    echo "3. Check for authentication requirements"
fi

# 4. Check NEXTAUTH_URL configuration
log_info "Checking NEXTAUTH_URL configuration..."
NEXTAUTH_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="export" 2>/dev/null | grep -oP 'NEXTAUTH_URL=\K[^"]*' || echo "")

if [ "$NEXTAUTH_URL" != "$SERVICE_URL" ]; then
    log_warning "NEXTAUTH_URL mismatch"
    echo "  Expected: $SERVICE_URL"
    echo "  Actual: $NEXTAUTH_URL"
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Update NEXTAUTH_URL:"
    echo "   gcloud run services update $SERVICE_NAME \\"
    echo "     --region=$REGION \\"
    echo "     --update-env-vars=\"NEXTAUTH_URL=$SERVICE_URL\""
else
    log_success "NEXTAUTH_URL correctly configured"
fi

# 5. Check OAuth configuration
log_info "Checking OAuth configuration..."
OAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/auth/providers" 2>/dev/null || echo "000")

if [ "$OAUTH_STATUS" != "200" ]; then
    log_warning "OAuth providers endpoint returned HTTP $OAUTH_STATUS"
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Verify OAuth secrets are set:"
    echo "   - GOOGLE_CLIENT_ID"
    echo "   - GOOGLE_CLIENT_SECRET"
    echo "   - NEXTAUTH_SECRET"
    echo "2. Check redirect URIs in Google Cloud Console:"
    echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo "3. Required redirect URIs:"
    echo "   - http://localhost:3000/api/auth/callback/google"
    echo "   - https://advanceweekly.io/api/auth/callback/google"
    echo "   - $SERVICE_URL/api/auth/callback/google"
else
    log_success "OAuth providers endpoint is accessible"
fi

# 6. Database connectivity check
log_info "Checking database connectivity..."
DB_STATUS=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(spec.template.metadata.annotations.'run.googleapis.com/cloudsql-instances')" 2>/dev/null || echo "")

if [ -n "$DB_STATUS" ]; then
    log_success "Cloud SQL connection configured: $DB_STATUS"
else
    log_warning "No Cloud SQL connection found"
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Verify Cloud SQL instance is running"
    echo "2. Check DATABASE_URL secret is set correctly"
    echo "3. Ensure Cloud SQL Admin API is enabled"
fi

# 7. Generate diagnostic report
log_info "Generating diagnostic report..."
cat > deployment-diagnostic-$(date +%Y%m%d-%H%M%S).json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "service": {
    "name": "$SERVICE_NAME",
    "url": "$SERVICE_URL",
    "region": "$REGION",
    "project": "$PROJECT_ID"
  },
  "health_checks": {
    "service_reachable": $([ "$OAUTH_STATUS" != "000" ] && echo "true" || echo "false"),
    "oauth_configured": $([ "$OAUTH_STATUS" = "200" ] && echo "true" || echo "false"),
    "nextauth_url_correct": $([ "$NEXTAUTH_URL" = "$SERVICE_URL" ] && echo "true" || echo "false"),
    "database_connected": $([ -n "$DB_STATUS" ] && echo "true" || echo "false")
  },
  "oauth": {
    "endpoint_status": "$OAUTH_STATUS",
    "nextauth_url": "$NEXTAUTH_URL",
    "required_redirects": [
      "http://localhost:3000/api/auth/callback/google",
      "https://advanceweekly.io/api/auth/callback/google",
      "$SERVICE_URL/api/auth/callback/google"
    ]
  },
  "recommendations": [
    $([ "$OAUTH_STATUS" != "200" ] && echo '"Update OAuth redirect URIs in Google Cloud Console",' || echo "")
    $([ "$NEXTAUTH_URL" != "$SERVICE_URL" ] && echo '"Fix NEXTAUTH_URL environment variable",' || echo "")
    "Monitor application logs for runtime errors"
  ]
}
EOF

# Final summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "                 Health Check Summary                        "
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Service URL: $SERVICE_URL"
echo ""
echo "Health Status:"
echo "  • Service Deployment: $([ -n "$SERVICE_URL" ] && echo "✅ Success" || echo "❌ Failed")"
echo "  • HTTP Endpoint: $([ "$OAUTH_STATUS" != "000" ] && echo "✅ Accessible" || echo "❌ Unreachable")"
echo "  • OAuth Configuration: $([ "$OAUTH_STATUS" = "200" ] && echo "✅ Ready" || echo "⚠️  Needs attention")"
echo "  • NEXTAUTH_URL: $([ "$NEXTAUTH_URL" = "$SERVICE_URL" ] && echo "✅ Correct" || echo "⚠️  Mismatch")"
echo "  • Database: $([ -n "$DB_STATUS" ] && echo "✅ Connected" || echo "⚠️  Not configured")"
echo ""

if [ "$OAUTH_STATUS" != "200" ] || [ "$NEXTAUTH_URL" != "$SERVICE_URL" ]; then
    echo "⚠️  ACTION REQUIRED:"
    echo ""
    echo "1. Update OAuth redirect URIs in Google Cloud Console:"
    echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo ""
    echo "2. Add these redirect URIs:"
    echo "   • http://localhost:3000/api/auth/callback/google"
    echo "   • https://advanceweekly.io/api/auth/callback/google"
    echo "   • $SERVICE_URL/api/auth/callback/google"
    echo ""
fi

echo "📊 Diagnostic report saved to: deployment-diagnostic-*.json"
echo "════════════════════════════════════════════════════════════"

# Exit with appropriate code
if [ "$OAUTH_STATUS" = "200" ] && [ "$NEXTAUTH_URL" = "$SERVICE_URL" ]; then
    exit 0
else
    exit 1
fi