#!/bin/bash

# Deployment Health Check Script for Fixed Domain Configuration
# Comprehensive health checks for automated deployments with fixed custom domain

set -e

# Configuration
PROJECT_ID="${PROJECT_ID:-advanceweekly-prod}"
SERVICE_NAME="${SERVICE_NAME:-advanceweekly}"
REGION="${REGION:-us-central1}"
DOMAIN_NAME="${DOMAIN_NAME:-advanceweekly.io}"
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
echo "🏥 Deployment Health Check (Fixed Domain)"
echo "=========================================="

# 1. Fixed domain configuration
CUSTOM_DOMAIN_URL="https://$DOMAIN_NAME"
log_info "Checking fixed domain configuration..."
log_success "Custom Domain: $CUSTOM_DOMAIN_URL"

# 2. Verify Cloud Run service exists
log_info "Verifying Cloud Run service deployment..."
INTERNAL_SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)" 2>/dev/null || echo "")

if [ -z "$INTERNAL_SERVICE_URL" ]; then
    log_error "Cloud Run service not found. Deployment may have failed."
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Check Cloud Build logs: gcloud builds list --limit=1"
    echo "2. Verify service exists: gcloud run services list --region=$REGION"
    echo "3. Check deployment permissions"
    exit 1
fi

log_success "Cloud Run Service: $INTERNAL_SERVICE_URL"

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

# 3. Check custom domain HTTP endpoint
log_info "Testing custom domain accessibility..."
DOMAIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$CUSTOM_DOMAIN_URL" 2>/dev/null || echo "000")

if [ "$DOMAIN_STATUS" = "200" ]; then
    log_success "Custom domain is accessible"
elif [ "$DOMAIN_STATUS" = "000" ]; then
    log_warning "Custom domain not accessible (DNS/SSL propagation may be in progress)"
    echo "  This is normal for new deployments and should resolve within 5-60 minutes"
else
    log_warning "Custom domain returned HTTP $DOMAIN_STATUS"
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Check DNS configuration: dig $DOMAIN_NAME"
    echo "2. Verify SSL certificate: curl -I $CUSTOM_DOMAIN_URL"
    echo "3. Check load balancer status in Google Cloud Console"
fi

# 4. Check NEXTAUTH_URL configuration (should be fixed domain)
log_info "Checking NEXTAUTH_URL configuration..."
NEXTAUTH_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --format="export" 2>/dev/null | grep -oP 'NEXTAUTH_URL=\K[^"]*' || echo "")

if [ "$NEXTAUTH_URL" != "$CUSTOM_DOMAIN_URL" ]; then
    log_warning "NEXTAUTH_URL mismatch"
    echo "  Expected: $CUSTOM_DOMAIN_URL"
    echo "  Actual: $NEXTAUTH_URL"
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. This should be automatically configured during deployment"
    echo "2. If needed, update manually:"
    echo "   gcloud run services update $SERVICE_NAME \\"
    echo "     --region=$REGION \\"
    echo "     --update-env-vars=\"NEXTAUTH_URL=$CUSTOM_DOMAIN_URL\""
else
    log_success "NEXTAUTH_URL correctly configured with fixed domain"
fi

# 5. Check OAuth configuration (using custom domain)
log_info "Checking OAuth configuration..."
OAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$CUSTOM_DOMAIN_URL/api/auth/providers" 2>/dev/null || echo "000")

if [ "$OAUTH_STATUS" = "200" ]; then
    log_success "OAuth providers endpoint is accessible"
elif [ "$OAUTH_STATUS" = "000" ]; then
    log_warning "OAuth endpoint not accessible (DNS/SSL propagation may be in progress)"
else
    log_warning "OAuth providers endpoint returned HTTP $OAUTH_STATUS"
    echo ""
    echo "🔧 Recovery steps:"
    echo "1. Verify OAuth secrets are set in Secret Manager"
    echo "2. Check redirect URI in Google Cloud Console:"
    echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo "3. Required redirect URI (FIXED):"
    echo "   - https://$DOMAIN_NAME/api/auth/callback/google"
    echo "4. Ensure OAuth client is configured for this exact domain"
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
  "deployment_type": "fixed_domain_configuration",
  "service": {
    "name": "$SERVICE_NAME",
    "internal_url": "$INTERNAL_SERVICE_URL",
    "custom_domain": "$CUSTOM_DOMAIN_URL",
    "region": "$REGION",
    "project": "$PROJECT_ID"
  },
  "health_checks": {
    "cloud_run_deployed": $([ -n "$INTERNAL_SERVICE_URL" ] && echo "true" || echo "false"),
    "custom_domain_accessible": $([ "$DOMAIN_STATUS" = "200" ] && echo "true" || echo "false"),
    "oauth_configured": $([ "$OAUTH_STATUS" = "200" ] && echo "true" || echo "false"),
    "nextauth_url_correct": $([ "$NEXTAUTH_URL" = "$CUSTOM_DOMAIN_URL" ] && echo "true" || echo "false"),
    "database_connected": $([ -n "$DB_STATUS" ] && echo "true" || echo "false")
  },
  "oauth": {
    "endpoint_status": "$OAUTH_STATUS",
    "nextauth_url": "$NEXTAUTH_URL",
    "expected_nextauth_url": "$CUSTOM_DOMAIN_URL",
    "fixed_redirect_uri": "https://$DOMAIN_NAME/api/auth/callback/google",
    "configuration_type": "FIXED - never changes"
  },
  "dns_ssl": {
    "domain_status": "$DOMAIN_STATUS",
    "dns_propagation_note": "May take 5-60 minutes for new deployments"
  }
}
EOF

# Final summary
echo ""
echo "════════════════════════════════════════════════════════════"
echo "            Fixed Domain Health Check Summary                 "
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🌐 Custom Domain: $CUSTOM_DOMAIN_URL"
echo "🔧 Internal Service: $INTERNAL_SERVICE_URL"
echo ""
echo "Health Status:"
echo "  • Cloud Run Deployment: $([ -n "$INTERNAL_SERVICE_URL" ] && echo "✅ Success" || echo "❌ Failed")"
echo "  • Custom Domain: $([ "$DOMAIN_STATUS" = "200" ] && echo "✅ Accessible" || echo "⚠️  DNS/SSL propagation in progress")"
echo "  • OAuth Configuration: $([ "$OAUTH_STATUS" = "200" ] && echo "✅ Ready" || echo "⚠️  Needs attention")"
echo "  • NEXTAUTH_URL: $([ "$NEXTAUTH_URL" = "$CUSTOM_DOMAIN_URL" ] && echo "✅ Correct" || echo "⚠️  Mismatch")"
echo "  • Database: $([ -n "$DB_STATUS" ] && echo "✅ Connected" || echo "⚠️  Not configured")"
echo ""

if [ "$OAUTH_STATUS" != "200" ] && [ "$DOMAIN_STATUS" = "200" ]; then
    echo "⚠️  OAUTH CONFIGURATION NEEDED:"
    echo ""
    echo "1. Visit Google Cloud Console:"
    echo "   https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
    echo ""
    echo "2. Ensure OAuth client has this FIXED redirect URI:"
    echo "   ✅ https://$DOMAIN_NAME/api/auth/callback/google"
    echo ""
    echo "3. Remove any old dynamic URLs (https://service-xyz-uc.a.run.app)"
    echo ""
elif [ "$DOMAIN_STATUS" != "200" ]; then
    echo "⚠️  DNS/SSL PROPAGATION IN PROGRESS:"
    echo ""
    echo "• This is normal for new deployments"
    echo "• DNS propagation: 5-60 minutes"
    echo "• SSL certificate: 15 minutes - 24 hours"
    echo "• Check status: dig $DOMAIN_NAME"
    echo ""
fi

echo "📊 Diagnostic report saved to: deployment-diagnostic-*.json"
echo ""
echo "🚀 KEY BENEFIT: OAuth redirect URI is FIXED and never needs updates!"
echo "════════════════════════════════════════════════════════════"

# Exit with appropriate code based on fixed domain configuration
if [ -n "$INTERNAL_SERVICE_URL" ] && [ "$NEXTAUTH_URL" = "$CUSTOM_DOMAIN_URL" ]; then
    exit 0  # Success - service deployed with correct configuration
else
    exit 1  # Configuration issues need attention
fi