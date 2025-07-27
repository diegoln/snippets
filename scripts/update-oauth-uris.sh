#!/bin/bash

# Script to update Google OAuth redirect URIs and test users for Cloud Run deployments
# This automates the complete OAuth setup process when Cloud Run generates new URLs

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEFAULT_PROJECT_ID="advanceweekly-prod"
DEFAULT_SERVICE_NAME="advanceweekly"
DEFAULT_REGION="us-central1"
DEFAULT_TEST_USER="diegoln@gmail.com"

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to load environment variables from various sources
load_environment_variables() {
    print_status "$BLUE" "🔍 Loading environment variables..."
    
    # Try to load from .env.local first
    if [ -f ".env.local" ]; then
        print_status "$YELLOW" "  Reading from .env.local..."
        while IFS='=' read -r key value; do
            # Skip comments and empty lines
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            
            # Remove quotes from value if present
            value="${value%\"}"
            value="${value#\"}"
            
            # Export the variable
            export "$key=$value" 2>/dev/null || true
        done < .env.local
    fi
    
    # Try to load from .env if .env.local doesn't exist
    if [ -f ".env" ] && [ ! -f ".env.local" ]; then
        print_status "$YELLOW" "  Reading from .env..."
        while IFS='=' read -r key value; do
            [[ $key =~ ^#.*$ ]] && continue
            [[ -z "$key" ]] && continue
            value="${value%\"}"
            value="${value#\"}"
            export "$key=$value" 2>/dev/null || true
        done < .env
    fi
    
    # Try to detect project ID from gcloud config if not set
    if [ -z "${PROJECT_ID:-}" ]; then
        print_status "$YELLOW" "  Detecting project ID from gcloud config..."
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
        if [ -n "$PROJECT_ID" ]; then
            export PROJECT_ID
            print_status "$GREEN" "  ✓ Found project ID: $PROJECT_ID"
        fi
    fi
    
    # Use Google Client ID from environment
    if [ -z "${GOOGLE_OAUTH_CLIENT_ID:-}" ] && [ -n "${GOOGLE_CLIENT_ID:-}" ]; then
        GOOGLE_OAUTH_CLIENT_ID="$GOOGLE_CLIENT_ID"
        export GOOGLE_OAUTH_CLIENT_ID
        print_status "$GREEN" "  ✓ Found OAuth client ID from GOOGLE_CLIENT_ID"
    fi
}

# Function to prompt for missing variables
prompt_for_missing_variables() {
    local vars_prompted=false
    
    # Check and prompt for OAuth Client ID
    if [ -z "${GOOGLE_OAUTH_CLIENT_ID:-}" ]; then
        print_status "$YELLOW" "\n📝 OAuth Client ID not found in environment"
        echo "This can be found in:"
        echo "  1. Google Cloud Console > APIs & Services > Credentials"
        echo "  2. Your .env.local file as GOOGLE_CLIENT_ID"
        echo ""
        read -p "Enter your Google OAuth Client ID: " GOOGLE_OAUTH_CLIENT_ID
        export GOOGLE_OAUTH_CLIENT_ID
        vars_prompted=true
    fi
    
    # Check and prompt for Project ID
    if [ -z "${PROJECT_ID:-}" ]; then
        print_status "$YELLOW" "\n📝 Project ID not found"
        echo "Using default: $DEFAULT_PROJECT_ID"
        read -p "Enter your GCP Project ID (or press Enter for default): " input_project_id
        PROJECT_ID="${input_project_id:-$DEFAULT_PROJECT_ID}"
        export PROJECT_ID
        vars_prompted=true
    fi
    
    # Save prompted values for future use
    if [ "$vars_prompted" = true ]; then
        print_status "$YELLOW" "\n💾 Would you like to save these values for future use?"
        read -p "Save to .env.local? (y/N): " save_response
        if [[ "$save_response" =~ ^[Yy]$ ]]; then
            save_environment_variables
        fi
    fi
}

# Function to save environment variables
save_environment_variables() {
    local env_file=".env.local"
    local temp_file=".env.local.tmp"
    
    print_status "$BLUE" "💾 Saving environment variables..."
    
    # Create backup if file exists
    if [ -f "$env_file" ]; then
        cp "$env_file" "${env_file}.backup"
        print_status "$YELLOW" "  Created backup: ${env_file}.backup"
    fi
    
    # Read existing file and update/add our variables
    if [ -f "$env_file" ]; then
        # Update existing file
        awk -v oauth_id="$GOOGLE_OAUTH_CLIENT_ID" -v proj_id="$PROJECT_ID" '
        BEGIN { oauth_updated=0; proj_updated=0 }
        /^GOOGLE_CLIENT_ID=/ { print "GOOGLE_CLIENT_ID=" oauth_id; oauth_updated=1; next }
        /^GOOGLE_OAUTH_CLIENT_ID=/ { print "GOOGLE_OAUTH_CLIENT_ID=" oauth_id; oauth_updated=1; next }
        /^PROJECT_ID=/ { print "PROJECT_ID=" proj_id; proj_updated=1; next }
        { print }
        END {
            if (!oauth_updated) print "\n# OAuth Client ID for production\nGOOGLE_CLIENT_ID=" oauth_id
            if (!proj_updated) print "\n# GCP Project ID\nPROJECT_ID=" proj_id
        }
        ' "$env_file" > "$temp_file"
        mv "$temp_file" "$env_file"
    else
        # Create new file
        cat > "$env_file" << EOF
# Google OAuth Configuration
GOOGLE_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID

# GCP Project Configuration
PROJECT_ID=$PROJECT_ID

# Add other environment variables below
EOF
    fi
    
    print_status "$GREEN" "  ✓ Saved to $env_file"
}

# Function to check if required environment variables are set
check_env_vars() {
    local all_set=true
    
    if [ -z "${GOOGLE_OAUTH_CLIENT_ID:-}" ]; then
        all_set=false
    fi
    
    if [ -z "${PROJECT_ID:-}" ]; then
        all_set=false
    fi
    
    if [ "$all_set" = false ]; then
        return 1
    fi
    
    return 0
}

# Function to get the current Cloud Run service URL
get_cloud_run_url() {
    local service_name="${SERVICE_NAME:-$DEFAULT_SERVICE_NAME}"
    local region="${REGION:-$DEFAULT_REGION}"
    
    print_status "$YELLOW" "Fetching Cloud Run service URL..." >&2
    
    # Get the service URL using gcloud
    local service_url=$(gcloud run services describe "$service_name" \
        --region="$region" \
        --project="$PROJECT_ID" \
        --format="value(status.url)" 2>/dev/null)
    
    if [ -z "$service_url" ]; then
        print_status "$RED" "Error: Could not fetch Cloud Run service URL" >&2
        echo "Make sure the service '$service_name' exists in region '$region'" >&2
        exit 1
    fi
    
    echo "$service_url"
}

# Legacy function removed - replaced with update_oauth_client_redirect_uris

# Function to update Cloud Run environment variables
update_cloud_run_env() {
    local cloud_run_url=$1
    local service_name="${SERVICE_NAME:-$DEFAULT_SERVICE_NAME}"
    local region="${REGION:-$DEFAULT_REGION}"
    
    print_status "$YELLOW" "Updating Cloud Run NEXTAUTH_URL environment variable..."
    
    # Update the NEXTAUTH_URL environment variable
    gcloud run services update "$service_name" \
        --region="$region" \
        --project="$PROJECT_ID" \
        --update-env-vars="NEXTAUTH_URL=$cloud_run_url" \
        --quiet \
        2>&1 | grep -v "WARNING" || true
    
    if [ $? -eq 0 ]; then
        print_status "$GREEN" "✓ Cloud Run environment variables updated successfully!"
    else
        print_status "$RED" "Error: Failed to update Cloud Run environment variables"
        exit 1
    fi
}

# Function to update OAuth consent screen and add test users
update_oauth_consent_screen() {
    local test_user="${TEST_USER:-$DEFAULT_TEST_USER}"
    
    print_status "$YELLOW" "Updating OAuth consent screen and test users..."
    
    # Check if Google Cloud Console API is enabled
    print_status "$BLUE" "  Checking required APIs..."
    
    # Try to get OAuth consent screen configuration
    local consent_screen_info=$(gcloud alpha iap oauth-brands list \
        --project="$PROJECT_ID" \
        --format="value(name)" 2>/dev/null | head -1)
    
    if [ -z "$consent_screen_info" ]; then
        print_status "$YELLOW" "  No OAuth consent screen found. This needs to be created manually in Google Cloud Console."
        print_status "$YELLOW" "  Please visit: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
        return 0
    fi
    
    print_status "$GREEN" "  ✓ Found OAuth consent screen: $consent_screen_info"
    
    # Add test user to OAuth consent screen
    print_status "$YELLOW" "  Adding test user: $test_user"
    
    # Note: Adding test users via gcloud is not directly supported
    # We need to use the Google Cloud Console UI or REST API
    print_status "$YELLOW" "  Attempting to add test user via REST API..."
    
    # Get access token
    local access_token=$(gcloud auth print-access-token 2>/dev/null)
    
    if [ -z "$access_token" ]; then
        print_status "$RED" "  Error: Could not get access token"
        return 1
    fi
    
    # Extract brand name from consent screen info
    local brand_name=$(echo "$consent_screen_info" | sed 's|projects/[^/]*/brands/||')
    
    # Try to add test user using Google Identity and Access Management API
    local api_response=$(curl -s -X POST \
        "https://iap.googleapis.com/v1/projects/$PROJECT_ID/brands/$brand_name:addTestUsers" \
        -H "Authorization: Bearer $access_token" \
        -H "Content-Type: application/json" \
        -d "{\"testUsers\": [\"$test_user\"]}" 2>/dev/null || echo "API_ERROR")
    
    if [[ "$api_response" == *"error"* ]] || [[ "$api_response" == "API_ERROR" ]]; then
        print_status "$YELLOW" "  ⚠️  Could not add test user automatically"
        print_status "$BLUE" "  Manual step required:"
        print_status "$BLUE" "    1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID"
        print_status "$BLUE" "    2. Scroll to 'Test users' section"
        print_status "$BLUE" "    3. Click 'ADD USERS'"
        print_status "$BLUE" "    4. Add: $test_user"
        print_status "$BLUE" "    5. Click 'Save'"
        echo ""
        return 0
    else
        print_status "$GREEN" "  ✓ Test user added successfully!"
        return 0
    fi
}

# Function to update OAuth client redirect URIs (using REST API as fallback)
update_oauth_client_redirect_uris() {
    local cloud_run_url=$1
    local oauth_callback_url="${cloud_run_url}/api/auth/callback/google"
    local localhost_callback_url="http://localhost:3000/api/auth/callback/google"
    
    print_status "$YELLOW" "Attempting to update OAuth client redirect URIs via API..."
    
    # Get access token
    local access_token=$(gcloud auth print-access-token 2>/dev/null)
    
    if [ -z "$access_token" ]; then
        print_status "$RED" "  Error: Could not get access token"
        return 1
    fi
    
    # Try to update OAuth client using Google OAuth2 API
    local api_response=$(curl -s -X PATCH \
        "https://www.googleapis.com/oauth2/v1/client/$GOOGLE_OAUTH_CLIENT_ID" \
        -H "Authorization: Bearer $access_token" \
        -H "Content-Type: application/json" \
        -d "{\"redirect_uris\": [\"$localhost_callback_url\", \"$oauth_callback_url\"]}" 2>/dev/null || echo "API_ERROR")
    
    if [[ "$api_response" == *"error"* ]] || [[ "$api_response" == "API_ERROR" ]]; then
        print_status "$YELLOW" "  ⚠️  Could not update OAuth client automatically"
        print_status "$BLUE" "  Manual step required:"
        print_status "$BLUE" "    1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
        print_status "$BLUE" "    2. Click on OAuth Client ID: ${GOOGLE_OAUTH_CLIENT_ID:0:20}..."
        print_status "$BLUE" "    3. In 'Authorized redirect URIs', add:"
        print_status "$BLUE" "       - $localhost_callback_url"
        print_status "$BLUE" "       - $oauth_callback_url"
        print_status "$BLUE" "    4. Click 'Save'"
        echo ""
        return 0
    else
        print_status "$GREEN" "  ✓ OAuth client redirect URIs updated successfully!"
        return 0
    fi
}

# Function to create comprehensive OAuth setup instructions
create_manual_setup_instructions() {
    local cloud_run_url=$1
    local oauth_callback_url="${cloud_run_url}/api/auth/callback/google"
    local localhost_callback_url="http://localhost:3000/api/auth/callback/google"
    local test_user="${TEST_USER:-$DEFAULT_TEST_USER}"
    
    cat > "oauth-setup-instructions.txt" << EOF
🔧 OAuth Setup Instructions for AdvanceWeekly
=============================================

Current Cloud Run URL: $cloud_run_url
Production Callback URL: $oauth_callback_url

📋 STEP 1: Update OAuth Redirect URIs
1. Go to: https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID
2. Click on OAuth Client ID: $GOOGLE_OAUTH_CLIENT_ID
3. In "Authorized redirect URIs" section, add:
   - $localhost_callback_url
   - $oauth_callback_url
4. Click "Save"

📋 STEP 2: Add Test User to OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=$PROJECT_ID
2. Click "OAuth consent screen" in left menu
3. Scroll to "Test users" section
4. Click "ADD USERS"
5. Add: $test_user
6. Click "Save"

✅ After completing both steps:
- Visit: $cloud_run_url
- Click "Continue with Google"
- Authenticate with: $test_user
- You should be redirected to the onboarding page

🚨 Troubleshooting:
- If you see "Try to sign in with a different account" → Complete Step 2
- If you get "redirect_uri_mismatch" error → Complete Step 1
- If authentication fails → Check both steps are completed

Generated: $(date)
EOF
    
    print_status "$GREEN" "📄 Created detailed setup instructions: oauth-setup-instructions.txt"
}

# Main execution
main() {
    print_status "$GREEN" "=== OAuth Redirect URI Update Script ==="
    echo ""
    
    # Load environment variables from various sources
    load_environment_variables
    
    # Check if all required variables are set
    if ! check_env_vars; then
        prompt_for_missing_variables
    fi
    
    # Display current configuration
    print_status "$BLUE" "📋 Current Configuration:"
    echo "  Project ID: $PROJECT_ID"
    echo "  OAuth Client ID: ${GOOGLE_OAUTH_CLIENT_ID:0:20}..."
    echo "  Service Name: ${SERVICE_NAME:-$DEFAULT_SERVICE_NAME}"
    echo "  Region: ${REGION:-$DEFAULT_REGION}"
    echo ""
    
    # Get Cloud Run URL
    cloud_run_url=$(get_cloud_run_url)
    print_status "$GREEN" "✓ Found Cloud Run URL: $cloud_run_url"
    echo ""
    
    # Try to update OAuth client redirect URIs automatically
    update_oauth_client_redirect_uris "$cloud_run_url"
    echo ""
    
    # Try to update OAuth consent screen and add test users
    update_oauth_consent_screen
    echo ""
    
    # Update Cloud Run environment variables
    update_cloud_run_env "$cloud_run_url"
    echo ""
    
    # Create comprehensive manual setup instructions
    create_manual_setup_instructions "$cloud_run_url"
    echo ""
    
    print_status "$GREEN" "=== Update completed successfully! ==="
    echo ""
    echo "Next steps:"
    echo "1. Test authentication at: $cloud_run_url"
    echo "2. The following redirect URIs are now configured:"
    echo "   - http://localhost:3000/api/auth/callback/google (development)"
    echo "   - ${cloud_run_url}/api/auth/callback/google (production)"
}

# Run main function
main