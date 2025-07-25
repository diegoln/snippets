#!/bin/bash

# Production deployment script for AdvanceWeekly
# Deploys the application to Google Cloud Run using Cloud Build

set -euo pipefail

# Configuration
PROJECT_ID="advanceweekly-prod"
REGION="us-central1"
SERVICE_NAME="advanceweekly"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if gcloud is installed and authenticated
    if ! command -v gcloud &> /dev/null; then
        error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        error "Not authenticated with gcloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Check if correct project is set
    CURRENT_PROJECT=$(gcloud config get-value project)
    if [[ "$CURRENT_PROJECT" != "$PROJECT_ID" ]]; then
        warning "Current project is '$CURRENT_PROJECT', switching to '$PROJECT_ID'"
        gcloud config set project "$PROJECT_ID"
    fi
    
    # Check if required files exist
    if [[ ! -f "Dockerfile" ]]; then
        error "Dockerfile not found in current directory"
        exit 1
    fi
    
    if [[ ! -f "cloudbuild.yaml" ]]; then
        error "cloudbuild.yaml not found in current directory"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Validate environment setup
validate_environment() {
    log "Validating environment setup..."
    
    # Check if secrets exist
    if ! gcloud secrets describe database-url --quiet >/dev/null 2>&1; then
        error "Secret 'database-url' not found. Please create it first."
        exit 1
    fi
    
    if ! gcloud secrets describe openai-api-key --quiet >/dev/null 2>&1; then
        error "Secret 'openai-api-key' not found. Please create it first."
        exit 1
    fi
    
    # Check if Artifact Registry repository exists
    if ! gcloud artifacts repositories describe advanceweekly-repo --location="$REGION" --quiet >/dev/null 2>&1; then
        error "Artifact Registry repository 'advanceweekly-repo' not found in region '$REGION'"
        exit 1
    fi
    
    success "Environment validation passed"
}

# Main deployment function
deploy() {
    log "Starting deployment to Cloud Run..."
    log "Project: $PROJECT_ID"
    log "Region: $REGION"
    log "Service: $SERVICE_NAME"
    
    # Submit build to Cloud Build
    log "Submitting build to Cloud Build..."
    BUILD_ID=$(gcloud builds submit \
        --config=cloudbuild.yaml \
        --region="$REGION" \
        --format="value(id)" \
        .)
    
    if [[ -z "$BUILD_ID" ]]; then
        error "Failed to submit build"
        exit 1
    fi
    
    log "Build submitted with ID: $BUILD_ID"
    log "You can monitor the build at: https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=$PROJECT_ID"
    
    # Wait for build to complete
    log "Waiting for build to complete..."
    if ! gcloud builds log --region="$REGION" "$BUILD_ID" --stream; then
        error "Build failed. Check the logs above for details."
        exit 1
    fi
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
        --region="$REGION" \
        --format="value(status.url)")
    
    success "Deployment completed successfully!"
    success "Service URL: $SERVICE_URL"
    
    # Run post-deployment checks
    post_deployment_checks "$SERVICE_URL"
}

# Post-deployment health checks
post_deployment_checks() {
    local service_url="$1"
    
    log "Running post-deployment health checks..."
    
    # Wait a moment for the service to be ready
    sleep 10
    
    # Check health endpoint
    if curl -f -s "$service_url/api/health" >/dev/null; then
        success "Health check passed"
    else
        warning "Health check failed - service may still be starting up"
    fi
    
    # Check if the main page loads
    if curl -f -s "$service_url" >/dev/null; then
        success "Main page is accessible"
    else
        warning "Main page check failed"
    fi
}

# Rollback function (for future use)
rollback() {
    log "Rollback functionality not implemented yet"
    log "To rollback manually, use: gcloud run services update-traffic $SERVICE_NAME --to-revisions=REVISION=100 --region=$REGION"
}

# Main script execution
main() {
    log "Starting AdvanceWeekly production deployment process..."
    
    check_prerequisites
    validate_environment
    deploy
    
    success "Deployment process completed!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "check")
        check_prerequisites
        validate_environment
        ;;
    *)
        echo "Usage: $0 [deploy|rollback|check]"
        echo "  deploy   - Deploy to production (default)"
        echo "  rollback - Rollback to previous version"
        echo "  check    - Check prerequisites only"
        exit 1
        ;;
esac