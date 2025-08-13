# Staging OAuth Configuration Guide

## Overview

While staging uses **mock authentication** by default, you may want to test real Google OAuth flows in staging. This guide shows how to configure Google OAuth for the staging environment.

## Current Configuration

By design, staging uses mock authentication for easier testing:

- **Development**: Mock authentication (`/mock-signin`)
- **Staging**: Mock authentication (`/mock-signin`) 
- **Production**: Real Google OAuth

## Optional: Enable Real OAuth in Staging

If you need to test real OAuth flows in staging, follow these steps:

### 1. Create Staging OAuth Application

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" > "Credentials"
3. Click "Create Credentials" > "OAuth 2.0 Client IDs"
4. Configure:
   - **Application type**: Web application
   - **Name**: `AdvanceWeekly Staging`
   - **Authorized redirect URIs**: 
     ```
     https://staging.advanceweekly.io/api/auth/callback/google
     ```

### 2. Update Staging Secrets

Update the staging OAuth secrets with real values:

```bash
# Update staging Google Client ID
echo "YOUR_STAGING_CLIENT_ID" | gcloud secrets versions add staging-google-client-id --data-file=-

# Update staging Google Client Secret  
echo "YOUR_STAGING_CLIENT_SECRET" | gcloud secrets versions add staging-google-client-secret --data-file=-
```

### 3. Update Staging Environment Configuration

Modify `lib/environment.ts` to enable OAuth in staging:

```typescript
staging: {
  database: 'postgresql',
  auth: 'oauth',  // Change from 'mock' to 'oauth'
  integrations: 'mock',
  devTools: true
},
```

### 4. Deploy Updated Configuration

```bash
# Deploy staging with OAuth enabled
gcloud builds submit --config cloudbuild-staging.yaml
```

## Recommended: Keep Mock Authentication

For most staging testing, **mock authentication is recommended** because:

✅ **Faster Testing**: No Google sign-in flow required
✅ **Predictable Users**: Known test users with consistent data
✅ **No External Dependencies**: Works even if Google services are down
✅ **Easy Automation**: Can be automated in CI/CD pipelines
✅ **Privacy**: No real Google accounts needed for testing

## OAuth Environment Matrix

| Environment | Domain | Authentication | Use Case |
|-------------|---------|----------------|----------|
| **Development** | `localhost:3000` | Mock | Local development |
| **Staging** | `staging.advanceweekly.io` | Mock (default) | Feature testing |
| **Staging (OAuth)** | `staging.advanceweekly.io` | Real OAuth | OAuth flow testing |
| **Production** | `advanceweekly.io` | Real OAuth | Live users |

## Testing OAuth in Staging

If you enable real OAuth in staging:

1. **Access staging**: https://staging.advanceweekly.io
2. **Click "Sign In"**: Should redirect to Google OAuth
3. **Sign in with Google**: Use a test Google account
4. **Verify redirect**: Should return to staging with authenticated session
5. **Test functionality**: Ensure all features work with OAuth user

## Redirect URI Configuration

Ensure these redirect URIs are configured in Google OAuth:

```
# Production (required)
https://advanceweekly.io/api/auth/callback/google

# Staging (optional, if testing OAuth)
https://staging.advanceweekly.io/api/auth/callback/google

# Development (optional, for local OAuth testing)
http://localhost:3000/api/auth/callback/google
```

## Security Considerations

🔒 **Staging OAuth Best Practices**:
- Use separate OAuth application for staging
- Never use production OAuth credentials in staging
- Limit staging OAuth to test Google accounts
- Monitor staging OAuth usage
- Disable staging OAuth when not needed

## Switching Back to Mock Auth

To return staging to mock authentication:

1. **Update environment config**:
   ```typescript
   staging: {
     auth: 'mock',  // Back to mock
   }
   ```

2. **Deploy changes**:
   ```bash
   gcloud builds submit --config cloudbuild-staging.yaml
   ```

Mock authentication will be immediately available at `/mock-signin`.