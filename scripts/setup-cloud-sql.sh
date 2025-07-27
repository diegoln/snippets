#!/bin/bash

# Setup Google Cloud SQL PostgreSQL for production
# Standard GCP database solution

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

PROJECT_ID="advanceweekly-prod"
SERVICE_NAME="weekly-snippets-reminder"
REGION="us-central1"
DB_INSTANCE_NAME="advanceweekly-db"
DB_NAME="snippets_db"
DB_USER="app_user"

print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_status "$PURPLE" "🗄️  SETTING UP GOOGLE CLOUD SQL POSTGRESQL"
print_status "$PURPLE" "=========================================="
echo ""

print_status "$BLUE" "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Database Instance: $DB_INSTANCE_NAME"
echo "   Database Name: $DB_NAME"
echo "   User: $DB_USER"
echo "   Region: $REGION"
echo ""

# Step 1: Enable Cloud SQL API
print_status "$YELLOW" "📋 STEP 1: Enable Cloud SQL API"
echo ""

print_status "$BLUE" "Enabling Cloud SQL Admin API..."
gcloud services enable sqladmin.googleapis.com --project="$PROJECT_ID"

print_status "$GREEN" "✅ Cloud SQL API enabled"
echo ""

# Step 2: Create Cloud SQL instance
print_status "$YELLOW" "📋 STEP 2: Create Cloud SQL PostgreSQL Instance"
echo ""

print_status "$BLUE" "Creating Cloud SQL instance (this takes 5-10 minutes)..."

# Check if instance already exists
if gcloud sql instances describe "$DB_INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    print_status "$GREEN" "✅ Cloud SQL instance already exists"
else
    # Create the instance
    gcloud sql instances create "$DB_INSTANCE_NAME" \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region="$REGION" \
        --project="$PROJECT_ID" \
        --storage-type=SSD \
        --storage-size=10GB \
        --storage-auto-increase
    
    print_status "$GREEN" "✅ Cloud SQL instance created"
fi
echo ""

# Step 3: Generate secure password
print_status "$YELLOW" "📋 STEP 3: Generate Database Password"
echo ""

DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
print_status "$BLUE" "Generated secure password for database user"
echo ""

# Step 4: Create database and user
print_status "$YELLOW" "📋 STEP 4: Create Database and User"
echo ""

# Create database
if gcloud sql databases describe "$DB_NAME" --instance="$DB_INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    print_status "$GREEN" "✅ Database already exists"
else
    gcloud sql databases create "$DB_NAME" \
        --instance="$DB_INSTANCE_NAME" \
        --project="$PROJECT_ID"
    print_status "$GREEN" "✅ Database created"
fi

# Create user
if gcloud sql users describe "$DB_USER" --instance="$DB_INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    print_status "$YELLOW" "⚠️  User already exists, updating password..."
    gcloud sql users set-password "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --project="$PROJECT_ID" \
        --password="$DB_PASSWORD"
else
    gcloud sql users create "$DB_USER" \
        --instance="$DB_INSTANCE_NAME" \
        --project="$PROJECT_ID" \
        --password="$DB_PASSWORD"
    print_status "$GREEN" "✅ Database user created"
fi
echo ""

# Step 5: Get connection details
print_status "$YELLOW" "📋 STEP 5: Get Connection Details"
echo ""

# Get the connection name for Cloud SQL Proxy
CONNECTION_NAME=$(gcloud sql instances describe "$DB_INSTANCE_NAME" --project="$PROJECT_ID" --format="value(connectionName)")
print_status "$BLUE" "Connection Name: $CONNECTION_NAME"

# Build the DATABASE_URL for Cloud Run
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?host=/cloudsql/$CONNECTION_NAME"

print_status "$GREEN" "✅ Database connection URL generated"
echo ""

# Step 6: Configure Cloud Run to use Cloud SQL
print_status "$YELLOW" "📋 STEP 6: Configure Cloud Run for Cloud SQL"
echo ""

print_status "$BLUE" "Adding Cloud SQL connection to Cloud Run service..."

# Update Cloud Run service with Cloud SQL connection
gcloud run services update "$SERVICE_NAME" \
    --add-cloudsql-instances="$CONNECTION_NAME" \
    --set-env-vars="DATABASE_URL=$DATABASE_URL" \
    --region="$REGION" \
    --project="$PROJECT_ID"

print_status "$GREEN" "✅ Cloud Run configured for Cloud SQL"
echo ""

# Step 7: Test database connection with Cloud SQL Proxy
print_status "$YELLOW" "📋 STEP 7: Test Database Connection"
echo ""

print_status "$BLUE" "Installing Cloud SQL Proxy..."
if ! command -v cloud-sql-proxy &> /dev/null; then
    # Download and install cloud-sql-proxy
    curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64
    chmod +x cloud-sql-proxy
    sudo mv cloud-sql-proxy /usr/local/bin/ 2>/dev/null || mv cloud-sql-proxy ~/bin/ 2>/dev/null || echo "Please add cloud-sql-proxy to your PATH"
fi

print_status "$BLUE" "Starting Cloud SQL Proxy for testing..."
# Start proxy in background
cloud-sql-proxy "$CONNECTION_NAME" --port=5433 &
PROXY_PID=$!

# Wait a moment for proxy to start
sleep 5

# Test connection with a local DATABASE_URL using the proxy
TEST_DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5433/$DB_NAME"
export DATABASE_URL="$TEST_DATABASE_URL"

print_status "$BLUE" "Testing database connection..."
if npx prisma db push --accept-data-loss; then
    print_status "$GREEN" "✅ Database connection successful!"
    print_status "$GREEN" "✅ Database schema synced!"
else
    print_status "$RED" "❌ Database connection failed"
    kill $PROXY_PID 2>/dev/null || true
    exit 1
fi

# Stop the proxy
kill $PROXY_PID 2>/dev/null || true

print_status "$GREEN" "✅ Database setup complete"
echo ""

# Step 8: Deploy updated service
print_status "$YELLOW" "📋 STEP 8: Deploy Updated Service"
echo ""

print_status "$BLUE" "Deploying Cloud Run service with Cloud SQL configuration..."

gcloud run deploy "$SERVICE_NAME" \
    --source=. \
    --region="$REGION" \
    --project="$PROJECT_ID" \
    --allow-unauthenticated

print_status "$GREEN" "✅ Service deployed successfully"
echo ""

# Step 9: Test OAuth
print_status "$YELLOW" "📋 STEP 9: Test OAuth Authentication"
echo ""

print_status "$BLUE" "🧪 Ready to test OAuth authentication!"
echo ""
echo "Your production database is now configured:"
echo "✅ Cloud SQL PostgreSQL instance running"
echo "✅ Database and user created"
echo "✅ Cloud Run connected to Cloud SQL"
echo "✅ NextAuth can now save users to database"
echo ""

read -p "🚀 Ready to test OAuth? Press Enter to open the site..." READY_TEST

# Open the site
if command -v open > /dev/null 2>&1; then
    open "https://advanceweekly.io"
elif command -v xdg-open > /dev/null 2>&1; then
    xdg-open "https://advanceweekly.io"
else
    echo "Please open: https://advanceweekly.io"
fi

echo ""
read -p "🔍 Did OAuth authentication work? (y/n): " SUCCESS

if [[ "$SUCCESS" == "y" ]]; then
    print_status "$GREEN" "🎉 SUCCESS! Cloud SQL + OAuth working!"
    
    # Save configuration details
    cat > "cloud-sql-setup-success.txt" << EOF
🎉 Google Cloud SQL Setup - SUCCESS
===================================
Date: $(date)

CLOUD SQL CONFIGURATION:
Instance Name: $DB_INSTANCE_NAME
Database Name: $DB_NAME
Database User: $DB_USER
Connection Name: $CONNECTION_NAME
Region: $REGION

CLOUD RUN CONFIGURATION:
Service: $SERVICE_NAME
Cloud SQL Connection: Added
Environment Variables: DATABASE_URL configured

COST INFORMATION:
- Instance Type: db-f1-micro (smallest/cheapest)
- Storage: 10GB SSD
- Estimated Cost: ~$7-10/month
- First 300 hours free with new GCP accounts

OAUTH STATUS: ✅ Working correctly
EOF
    
    print_status "$GREEN" "📄 Setup details saved to: cloud-sql-setup-success.txt"
    
else
    print_status "$YELLOW" "🔍 Let's check the logs for any issues..."
    
    echo ""
    echo "Debug commands:"
    echo "1. Check Cloud Run logs:"
    echo "   gcloud logging read 'resource.type=cloud_run_revision' --limit=10"
    echo ""
    echo "2. Verify Cloud SQL connection:"
    echo "   gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID"
    echo ""
    echo "3. Test database directly:"
    echo "   cloud-sql-proxy $CONNECTION_NAME --port=5433 &"
    echo "   psql 'postgresql://$DB_USER:$DB_PASSWORD@localhost:5433/$DB_NAME'"
fi

echo ""
print_status "$PURPLE" "🏁 CLOUD SQL SETUP COMPLETE"

# Cleanup environment variable
unset DATABASE_URL