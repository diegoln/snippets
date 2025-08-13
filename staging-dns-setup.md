# Staging DNS Setup Instructions

## DNS Issue Found
The staging subdomain (staging.advanceweekly.io) is returning DNS_PROBE_FINISHED_NXDOMAIN because the DNS record doesn't exist.

## Solution
Add the following DNS record in GoDaddy:

### CNAME Record
- **Type**: CNAME
- **Name**: staging
- **Value**: ghs.googlehosted.com.
- **TTL**: 600 (or default)

## Steps to Add in GoDaddy:
1. Log in to GoDaddy account
2. Go to DNS Management for advanceweekly.io
3. Click "Add" to create a new record
4. Select Type: CNAME
5. Enter Name: staging
6. Enter Value: ghs.googlehosted.com.
7. Save the record

## Verification
After adding the DNS record, it may take up to 48 hours to propagate, but usually happens within minutes.

To verify:
```bash
# Check if DNS resolves
dig staging.advanceweekly.io

# Should eventually show:
# staging.advanceweekly.io. IN CNAME ghs.googlehosted.com.
```

## Cloud Run Status
- **Service**: advanceweekly-staging is running ✓
- **URL**: https://advanceweekly-staging-926387508050.us-central1.run.app ✓
- **Domain Mapping**: Created and waiting for DNS ✓
- **Certificate**: Will be provisioned automatically once DNS is configured

## Current Status (Updated)
✅ Domain mapping has been created in Google Cloud Run
✅ DNS CNAME record has been added in GoDaddy
✅ DNS is resolving correctly (staging.advanceweekly.io → ghs.googlehosted.com → 142.251.132.243)
⏳ SSL certificate is being provisioned (typically takes 15-60 minutes)
✅ Service is accessible via direct Cloud Run URL: https://advanceweekly-staging-926387508050.us-central1.run.app

## Current Issue
The custom domain (staging.advanceweekly.io) shows ERR_CONNECTION_CLOSED because:
1. HTTP requests are redirected to HTTPS
2. HTTPS SSL certificate is still being provisioned by Google
3. This is normal and expected during initial setup

## Timeline
- DNS configured: ~09:18 UTC
- Certificate provisioning started: ~12:18 UTC  
- Expected completion: Within 60 minutes of DNS configuration

## Temporary Access
Until SSL certificate is ready, use the direct Cloud Run URL:
https://advanceweekly-staging-926387508050.us-central1.run.app