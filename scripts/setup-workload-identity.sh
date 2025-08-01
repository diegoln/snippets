#!/bin/bash

# Setup Workload Identity Federation for GitHub Actions
# This script creates the necessary infrastructure for secure authentication
# without storing service account keys as GitHub secrets.

set -e

PROJECT_ID="advanceweekly-prod"
PROJECT_NUMBER="926387508050"
POOL_ID="github-actions-pool"
PROVIDER_ID="github-actions-provider"
SERVICE_ACCOUNT_ID="github-actions-sa"
REPO="diegoln/snippets"  # Your GitHub repository

echo "🔧 Setting up Workload Identity Federation for GitHub Actions..."

# Enable required APIs
echo "📋 Enabling required Google Cloud APIs..."
gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudresourcemanager.googleapis.com --project=$PROJECT_ID
gcloud services enable sts.googleapis.com --project=$PROJECT_ID

# Create service account for GitHub Actions
echo "👤 Creating service account for GitHub Actions..."
if ! gcloud iam service-accounts describe $SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com --project=$PROJECT_ID &>/dev/null; then
    gcloud iam service-accounts create $SERVICE_ACCOUNT_ID \
        --display-name="GitHub Actions Service Account" \
        --description="Service account for GitHub Actions deployments" \
        --project=$PROJECT_ID
    echo "⏳ Waiting for service account to propagate..."
    sleep 10
else
    echo "✅ Service account already exists, continuing..."
fi

# Grant necessary permissions to the service account
echo "🔐 Granting permissions to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

# Create Workload Identity Pool
echo "🏊 Creating Workload Identity Pool..."
if ! gcloud iam workload-identity-pools describe $POOL_ID --location="global" --project=$PROJECT_ID &>/dev/null; then
    gcloud iam workload-identity-pools create $POOL_ID \
        --location="global" \
        --display-name="GitHub Actions Pool" \
        --description="Workload Identity Pool for GitHub Actions" \
        --project=$PROJECT_ID
else
    echo "✅ Workload Identity Pool already exists, continuing..."
fi

# Create Workload Identity Provider
echo "🔗 Creating Workload Identity Provider..."
if ! gcloud iam workload-identity-pools providers describe $PROVIDER_ID --location="global" --workload-identity-pool=$POOL_ID --project=$PROJECT_ID &>/dev/null; then
    gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID \
        --location="global" \
        --workload-identity-pool=$POOL_ID \
        --display-name="GitHub Actions Provider" \
        --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository=='diegoln/snippets'" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        --project=$PROJECT_ID
else
    echo "✅ Workload Identity Provider already exists, continuing..."
fi

# Allow GitHub Actions to impersonate the service account
echo "🎭 Configuring service account impersonation..."
gcloud iam service-accounts add-iam-policy-binding \
    "$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/diegoln/snippets" \
    --project=$PROJECT_ID

# Display the configuration values needed for GitHub Actions
echo ""
echo "✅ Workload Identity Federation setup complete!"
echo ""
echo "📋 Configuration values for GitHub Actions workflow:"
echo "=================================================================="
echo "WORKLOAD_IDENTITY_PROVIDER: projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
echo "SERVICE_ACCOUNT: $SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com"
echo "PROJECT_ID: $PROJECT_ID"
echo "=================================================================="
echo ""
echo "🔧 Next steps:"
echo "1. Update your .github/workflows/deploy-production.yml file"
echo "2. Remove the old GCP_SA_KEY secret from GitHub (no longer needed)"
echo "3. Add PROJECT_ID secret to GitHub if you want to keep it as a secret"
echo "4. Test the deployment"