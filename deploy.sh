#!/bin/bash

# AdvanceWeekly Production Deployment Script
# One-command deployment to Google Cloud Platform

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="advanceweekly-prod"
REGION="us-central1"
APP_NAME="advanceweekly"

echo -e "${BLUE}🚀 AdvanceWeekly Production Deployment${NC}"
echo "================================================"
echo -e "Project: ${YELLOW}$PROJECT_ID${NC}"
echo -e "Region: ${YELLOW}$REGION${NC}"
echo -e "App: ${YELLOW}$APP_NAME${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}📋 Checking prerequisites...${NC}"
    
    # Check if gcloud is installed and authenticated
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ gcloud CLI not found. Please install Google Cloud CLI first.${NC}"
        exit 1
    fi
    
    # Check if terraform is installed
    if ! command -v terraform &> /dev/null; then
        echo -e "${YELLOW}⚙️ Installing Terraform...${NC}"
        curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
        sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
        sudo apt-get update && sudo apt-get install terraform
    fi
    
    # Check if docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
        exit 1
    fi
    
    # Check authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
        echo -e "${RED}❌ Not authenticated with Google Cloud. Please run: gcloud auth login${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to setup secrets
setup_secrets() {
    echo -e "${BLUE}🔐 Setting up secrets...${NC}"
    
    # Check if OpenAI API key is provided
    if [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${YELLOW}Please enter your OpenAI API Key:${NC}"
        read -s OPENAI_API_KEY
        echo ""
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        echo -e "${RED}❌ OpenAI API Key is required${NC}"
        exit 1
    fi
    
    # Store OpenAI API key in Secret Manager
    echo "$OPENAI_API_KEY" | gcloud secrets versions add openai-api-key --data-file=-
    
    echo -e "${GREEN}✅ Secrets configured${NC}"
}

# Function to deploy infrastructure
deploy_infrastructure() {
    echo -e "${BLUE}🏗️ Deploying infrastructure with Terraform...${NC}"
    
    cd terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan the deployment
    terraform plan -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="app_name=$APP_NAME"
    
    # Apply the infrastructure
    terraform apply -auto-approve -var="project_id=$PROJECT_ID" -var="region=$REGION" -var="app_name=$APP_NAME"
    
    # Get outputs
    ARTIFACT_REGISTRY_URL=$(terraform output -raw artifact_registry_url)
    
    cd ..
    
    echo -e "${GREEN}✅ Infrastructure deployed${NC}"
}

# Function to build and push Docker image
build_and_push() {
    echo -e "${BLUE}🐳 Building and pushing Docker image...${NC}"
    
    # Configure Docker for Artifact Registry
    gcloud auth configure-docker $REGION-docker.pkg.dev
    
    # Build the Docker image
    docker build -f Dockerfile.prod -t $ARTIFACT_REGISTRY_URL/$APP_NAME:latest .
    
    # Push the image
    docker push $ARTIFACT_REGISTRY_URL/$APP_NAME:latest
    
    echo -e "${GREEN}✅ Docker image built and pushed${NC}"
}

# Function to deploy application
deploy_application() {
    echo -e "${BLUE}🚀 Deploying application to Cloud Run...${NC}"
    
    # Deploy to Cloud Run
    gcloud run deploy $APP_NAME \
        --image $ARTIFACT_REGISTRY_URL/$APP_NAME:latest \
        --region $REGION \
        --platform managed \
        --allow-unauthenticated \
        --memory 512Mi \
        --cpu 1 \
        --max-instances 10 \
        --set-env-vars NODE_ENV=production
    
    # Get the service URL
    SERVICE_URL=$(gcloud run services describe $APP_NAME --region=$REGION --format="value(status.url)")
    
    echo -e "${GREEN}✅ Application deployed${NC}"
    echo -e "${GREEN}🌐 Your app is live at: $SERVICE_URL${NC}"
}

# Function to run database migrations
run_migrations() {
    echo -e "${BLUE}📊 Running database migrations...${NC}"
    
    # Get database connection details from Terraform
    cd terraform
    DB_CONNECTION_NAME=$(terraform output -raw database_connection_name)
    cd ..
    
    # Run Prisma migrations via Cloud Run job
    gcloud run jobs create migration-job \
        --image $ARTIFACT_REGISTRY_URL/$APP_NAME:latest \
        --region $REGION \
        --set-env-vars NODE_ENV=production \
        --set-cloudsql-instances $DB_CONNECTION_NAME \
        --command "npx" \
        --args "prisma,migrate,deploy"
    
    gcloud run jobs execute migration-job --region $REGION --wait
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${BLUE}🔍 Verifying deployment...${NC}"
    
    # Test the health endpoint
    if curl -f -s "$SERVICE_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
    else
        echo -e "${RED}❌ Health check failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Deployment verification completed${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}Starting deployment process...${NC}"
    
    check_prerequisites
    setup_secrets
    deploy_infrastructure
    build_and_push
    run_migrations
    deploy_application
    verify_deployment
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo "================================================"
    echo -e "${GREEN}🌐 Your app: $SERVICE_URL${NC}"
    echo -e "${BLUE}📊 Monitor: https://console.cloud.google.com/run/detail/$REGION/$APP_NAME${NC}"
    echo -e "${BLUE}💾 Database: https://console.cloud.google.com/sql/instances/${NC}"
    echo ""
    echo -e "${YELLOW}💡 Next steps:${NC}"
    echo "1. Set up your Google OAuth credentials in Google Cloud Console"
    echo "2. Configure your custom domain (optional)"
    echo "3. Set up monitoring alerts"
    echo ""
}

# Handle script arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "AdvanceWeekly Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help     Show this help message"
    echo "  --skip-build   Skip Docker build (use existing image)"
    echo ""
    echo "Environment variables:"
    echo "  OPENAI_API_KEY    Your OpenAI API key (will prompt if not set)"
    echo ""
    exit 0
fi

# Run main function
main "$@"