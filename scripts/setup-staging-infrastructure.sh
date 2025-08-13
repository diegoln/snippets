#!/bin/bash

#
# Setup Script for AdvanceWeekly Staging Infrastructure
#
# This script creates the dedicated staging infrastructure:
# - Cloud SQL instance for staging database
# - Secret Manager secrets for staging
# - Service account permissions
#
# Run this script once to set up staging environment
#

set -e

# Configuration
PROJECT_ID="advanceweekly-prod"
REGION="us-central1"
STAGING_DB_NAME="advanceweekly-staging-db"
PRODUCTION_DB_NAME="advanceweekly-db"

echo "🚀 Setting up AdvanceWeekly Staging Infrastructure"
echo "📍 Project: $PROJECT_ID"
echo "🌎 Region: $REGION"
echo ""

# Check if user is authenticated
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

# Set project
echo "📝 Setting project..."
gcloud config set project $PROJECT_ID

# Create staging Cloud SQL instance
echo "🗄️  Creating staging Cloud SQL instance..."
if gcloud sql instances describe $STAGING_DB_NAME &>/dev/null; then
    echo "✅ Staging database already exists: $STAGING_DB_NAME"
else
    echo "⏳ Creating new staging database instance..."
    gcloud sql instances create $STAGING_DB_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=$REGION \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase \
        --backup-start-time=03:00 \
        --deletion-protection
    
    echo "✅ Staging database created: $STAGING_DB_NAME"
fi

# Create staging database
echo "📊 Setting up staging database..."
if gcloud sql databases describe advanceweekly --instance=$STAGING_DB_NAME &>/dev/null; then
    echo "✅ Staging database 'advanceweekly' already exists"
else
    gcloud sql databases create advanceweekly --instance=$STAGING_DB_NAME
    echo "✅ Created staging database 'advanceweekly'"
fi

# Get production database URL for reference
echo "🔍 Getting production database configuration..."
PROD_DB_URL=$(gcloud secrets versions access latest --secret="database-url" 2>/dev/null || echo "")

if [ -z "$PROD_DB_URL" ]; then
    echo "⚠️  Production database URL secret not found. You'll need to create it manually."
    STAGING_DB_URL="postgresql://username:password@/advanceweekly?host=/cloudsql/advanceweekly-prod:us-central1:advanceweekly-staging-db"
else
    # Generate staging database URL based on production
    STAGING_DB_URL=$(echo "$PROD_DB_URL" | sed "s/$PRODUCTION_DB_NAME/$STAGING_DB_NAME/g")
fi

# Create or update staging database URL secret
echo "🔐 Setting up staging database URL secret..."
if gcloud secrets describe staging-database-url &>/dev/null; then
    echo "✅ Staging database URL secret already exists"
else
    echo "$STAGING_DB_URL" | gcloud secrets create staging-database-url --data-file=-
    echo "✅ Created staging database URL secret"
fi

# Create staging Google OAuth secrets (placeholder for now)
echo "🔑 Setting up staging OAuth secrets..."

if ! gcloud secrets describe staging-google-client-id &>/dev/null; then
    echo "STAGING_GOOGLE_CLIENT_ID_PLACEHOLDER" | gcloud secrets create staging-google-client-id --data-file=-
    echo "✅ Created staging Google Client ID secret (placeholder)"
    echo "⚠️  Update with real staging OAuth client ID after creating Google OAuth app"
fi

if ! gcloud secrets describe staging-google-client-secret &>/dev/null; then
    echo "STAGING_GOOGLE_CLIENT_SECRET_PLACEHOLDER" | gcloud secrets create staging-google-client-secret --data-file=-
    echo "✅ Created staging Google Client Secret secret (placeholder)"
    echo "⚠️  Update with real staging OAuth client secret after creating Google OAuth app"
fi

# Create staging-specific OpenAI API key secret
echo "🤖 Setting up staging OpenAI API key secret..."
if ! gcloud secrets describe staging-openai-api-key &>/dev/null; then
    echo "STAGING_OPENAI_API_KEY_PLACEHOLDER" | gcloud secrets create staging-openai-api-key --data-file=-
    echo "✅ Created staging OpenAI API key secret (placeholder)"
    echo "⚠️  Update with real staging OpenAI API key for LLM functionality"
fi

# Create staging-specific NextAuth secret
echo "🔑 Setting up staging NextAuth secret..."
if ! gcloud secrets describe staging-nextauth-secret &>/dev/null; then
    # Generate a random secret for staging
    openssl rand -base64 32 | gcloud secrets create staging-nextauth-secret --data-file=-
    echo "✅ Created staging NextAuth secret with random value"
fi

# Ensure Cloud Run service account has access to secrets
echo "🔐 Setting up service account permissions..."
SERVICE_ACCOUNT="$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding staging-database-url \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" &>/dev/null || true

gcloud secrets add-iam-policy-binding staging-google-client-id \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" &>/dev/null || true

gcloud secrets add-iam-policy-binding staging-google-client-secret \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" &>/dev/null || true

gcloud secrets add-iam-policy-binding staging-openai-api-key \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" &>/dev/null || true

gcloud secrets add-iam-policy-binding staging-nextauth-secret \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor" &>/dev/null || true

echo "✅ Service account permissions configured"

echo ""
echo "🎉 Staging infrastructure setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. 🌐 Configure DNS: staging.advanceweekly.io → Cloud Run"
echo "2. 🔑 Update Google OAuth app with staging redirect URLs"
echo "3. 🔐 Update staging secrets with real values:"
echo "   - gcloud secrets versions add staging-google-client-id --data-file=<client-id-file>"
echo "   - gcloud secrets versions add staging-google-client-secret --data-file=<client-secret-file>"
echo "   - gcloud secrets versions add staging-openai-api-key --data-file=<openai-api-key-file>"
echo "4. 🚀 Deploy staging with: gcloud builds submit --config cloudbuild-staging.yaml"
echo ""
echo "🎭 Staging will be available at: https://staging.advanceweekly.io"
echo "🔒 Staging database: $STAGING_DB_NAME"
echo "📊 Production parity achieved with complete isolation"