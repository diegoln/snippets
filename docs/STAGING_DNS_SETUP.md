# Staging DNS Configuration Guide

## Overview

Configure `staging.advanceweekly.io` to point to the staging Cloud Run service for complete environment isolation.

## DNS Configuration Steps

### 1. Get Cloud Run Service URL

After deploying staging with `cloudbuild-staging.yaml`:

```bash
# Get the staging service URL
gcloud run services describe advanceweekly-staging \
  --region=us-central1 \
  --format='value(status.url)'

# Example output: https://advanceweekly-staging-xyz-uc.a.run.app
```

### 2. Configure DNS Records

Add these DNS records to your domain registrar (wherever `advanceweekly.io` is managed):

#### Option A: CNAME Record (Recommended)
```
Type: CNAME
Name: staging
Value: advanceweekly-staging-xyz-uc.a.run.app
TTL: 300 (5 minutes)
```

#### Option B: Custom Domain in Cloud Run (Alternative)
```bash
# Map custom domain to Cloud Run service
gcloud run domain-mappings create \
  --service=advanceweekly-staging \
  --domain=staging.advanceweekly.io \
  --region=us-central1
```

### 3. Verify DNS Configuration

```bash
# Check DNS resolution
nslookup staging.advanceweekly.io

# Test HTTPS access
curl -I https://staging.advanceweekly.io/api/health
```

### 4. SSL Certificate

Cloud Run automatically provides SSL certificates for custom domains. If using CNAME, the certificate will be issued within a few minutes.

## Environment Validation

Once DNS is configured, verify each environment:

| Environment | URL | Authentication | Database |
|-------------|-----|----------------|----------|
| **Development** | `http://localhost:3000` | Mock Users | PostgreSQL (local) |
| **Staging** | `https://staging.advanceweekly.io` | Mock Users | `advanceweekly-staging-db` |
| **Production** | `https://advanceweekly.io` | Google OAuth | `advanceweekly-db` |

## Testing Staging Environment

1. **Access staging**: https://staging.advanceweekly.io
2. **Verify yellow banner**: Should show "🎭 STAGING ENVIRONMENT"
3. **Test mock authentication**: Click "Sign In" → Mock users should load
4. **Test functionality**: Create snippets, run assessments, etc.

## Troubleshooting

### DNS Not Resolving
- Wait 5-10 minutes for DNS propagation
- Check TTL settings (use 300 seconds for faster updates)
- Verify CNAME points to correct Cloud Run URL

### SSL Certificate Issues
- Custom domains in Cloud Run automatically get SSL
- DNS must resolve correctly before certificate is issued
- Check certificate status in Cloud Console

### 404 Errors
- Ensure Cloud Run service is deployed and healthy
- Check service URL matches DNS configuration
- Verify environment variables are set correctly

## Benefits of This Setup

✅ **Complete Isolation**: Staging has its own infrastructure and data
✅ **Production Parity**: Same deployment process and configuration
✅ **Clean URLs**: `staging.advanceweekly.io` vs complex `/staging` paths
✅ **Easy Testing**: Clear separation between environments
✅ **No URL Complexity**: No middleware, path rewriting, or detection logic