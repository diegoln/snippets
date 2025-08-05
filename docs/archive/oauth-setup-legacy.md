# OAuth Setup and URI Management

This document explains how to manage OAuth redirect URIs for the AdvanceWeekly application when deploying to Google Cloud Run.

## The Problem

When deploying to Cloud Run, each new revision gets a unique URL like:
- `https://advanceweekly-abc123-uc.a.run.app`
- `https://advanceweekly-xyz789-uc.a.run.app`

Google OAuth requires exact redirect URI matches, so each new deployment URL needs to be added to the OAuth client configuration.

## The Solution

We've created an automated script that:
1. Fetches the current Cloud Run service URL
2. Updates the Google OAuth client with the new redirect URI
3. Updates the Cloud Run service's `NEXTAUTH_URL` environment variable

## Prerequisites

1. Ensure you have the necessary GCP permissions:
   - Cloud Run Admin or Editor
   - IAM OAuth Client Admin

2. Have `gcloud` CLI installed and authenticated

## Usage

After deploying to Cloud Run, simply run:

```bash
npm run update-oauth-uris
```

The script will automatically:
1. **Load existing environment variables** from:
   - `.env.local` (preferred)
   - `.env` (fallback)
   - Your current gcloud configuration
   - Previously saved values

2. **Prompt for missing values** if needed:
   - OAuth Client ID (found in Google Cloud Console > APIs & Services > Credentials)
   - Project ID (defaults to `advanceweekly-prod`)

3. **Offer to save values** for future use:
   - Saves to `.env.local` for persistence
   - Creates backup of existing file if present

## Environment Variable Sources

The script intelligently loads configuration from multiple sources:

1. **`.env.local`** - Your local environment file (gitignored)
2. **`.env`** - Shared environment template
3. **gcloud config** - Active Google Cloud configuration
4. **Interactive prompts** - Only when values are missing

The script recognizes these variable names:
- `GOOGLE_OAUTH_CLIENT_ID` or `GOOGLE_CLIENT_ID`
- `PROJECT_ID`

## Manual Steps (if needed)

If the script fails or you need to update manually:

1. Get your Cloud Run service URL:
   ```bash
   gcloud run services describe advanceweekly \
     --region=us-central1 \
     --format="value(status.url)"
   ```

2. Update OAuth redirect URIs:
   ```bash
   gcloud iam oauth-clients update $GOOGLE_OAUTH_CLIENT_ID \
     --project=$PROJECT_ID \
     --location=global \
     --allowed-redirect-uris="http://localhost:3000/api/auth/callback/google,https://YOUR-SERVICE-URL/api/auth/callback/google"
   ```

3. Update Cloud Run environment variable:
   ```bash
   gcloud run services update advanceweekly \
     --region=us-central1 \
     --update-env-vars="NEXTAUTH_URL=https://YOUR-SERVICE-URL"
   ```

## Continuous Deployment Integration

To integrate this into your CI/CD pipeline, add this step after deployment in your `cloudbuild.yaml`:

```yaml
# After the deploy step
- name: 'gcr.io/cloud-builders/gcloud'
  entrypoint: 'bash'
  args:
    - '-c'
    - |
      export GOOGLE_OAUTH_CLIENT_ID=your-client-id
      export PROJECT_ID=$PROJECT_ID
      npm run update-oauth-uris
```

## Troubleshooting

### Error: Missing environment variables
Make sure `GOOGLE_OAUTH_CLIENT_ID` and `PROJECT_ID` are set.

### Error: Permission denied
Ensure your Google Cloud account has the necessary IAM roles:
- `roles/run.admin` or `roles/run.developer`
- `roles/iam.oauthClientAdmin`

### Error: Cloud Run service not found
Verify the service name is `advanceweekly` and region is `us-central1`.

## Future Improvements

Consider using:
1. A custom domain to avoid URL changes
2. Cloud Run service URL mapping for stable URLs
3. Terraform to manage OAuth configurations