# Automated OAuth Deployment with Fixed Domain

This document explains how the AdvanceWeekly application achieves **fully automated deployments** with **zero manual OAuth configuration** using a fixed custom domain.

## 🎯 Problem Solved

**Before**: Every deployment required manual OAuth redirect URI updates because Cloud Run generated dynamic URLs.

**After**: OAuth is configured ONCE with a fixed domain, enabling fully automated deployments.

## 🏗️ Architecture Overview

```
GitHub Push → Cloud Build → Cloud Run → Load Balancer → advanceweekly.io
                                                              ↑
                                               Fixed Domain (never changes)
                                                              ↑
                                               OAuth Redirect URI (fixed)
```

## 🔧 Infrastructure Components

### 1. Custom Domain with Load Balancer
- **Fixed URL**: `https://advanceweekly.io`
- **Load Balancer**: Google Cloud Application Load Balancer
- **SSL Certificate**: Google-managed SSL certificate
- **DNS**: A record pointing to load balancer IP

### 2. OAuth Configuration
- **Redirect URI**: `https://advanceweekly.io/api/auth/callback/google` (FIXED)
- **Environment Variables**: 
  - `NEXTAUTH_URL=https://advanceweekly.io`
  - `AUTH_URL=https://advanceweekly.io`

## 🚀 Deployment Process

### Infrastructure Setup (One-time)

1. **Deploy Infrastructure with Terraform**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Configure DNS**:
   ```bash
   # Get load balancer IP
   terraform output load_balancer_ip
   
   # Configure DNS with your registrar:
   # Type: A
   # Name: @ (or advanceweekly.io)
   # Value: [Load Balancer IP]
   ```

3. **Configure OAuth Client (ONE-TIME)**:
   ```bash
   # Run the setup script for guidance
   ./scripts/setup-oauth-fixed-domain.sh
   
   # Or manually:
   # 1. Visit: https://console.cloud.google.com/apis/credentials
   # 2. Edit OAuth client
   # 3. Add redirect URI: https://advanceweekly.io/api/auth/callback/google
   ```

### Automated Deployments (Every Push)

After the one-time setup, every push to `main` branch:

1. ✅ Triggers GitHub Actions automatically
2. ✅ Builds and deploys via Cloud Build
3. ✅ Uses fixed domain configuration
4. ✅ OAuth works immediately
5. ❌ **NO manual steps required**

## 📁 Key Files

### Infrastructure
- `terraform/main.tf` - Complete infrastructure definition
- `cloudbuild.yaml` - Build and deployment configuration
- `.github/workflows/deploy-production.yml` - GitHub Actions workflow

### Configuration Scripts
- `scripts/setup-oauth-fixed-domain.sh` - OAuth setup guide
- `scripts/test-deployment.sh` - Deployment validation

## 🔍 Configuration Details

### Terraform Infrastructure

```hcl
variable "domain_name" {
  default = "advanceweekly.io"
}

# Cloud Run with fixed environment variables
env {
  name  = "NEXTAUTH_URL"
  value = "https://${var.domain_name}"
}

# Load balancer with SSL certificate
resource "google_compute_managed_ssl_certificate" "app_ssl" {
  managed {
    domains = [var.domain_name]
  }
}
```

### Cloud Build Configuration

```yaml
--set-env-vars:
  - 'NEXTAUTH_URL=https://advanceweekly.io,AUTH_URL=https://advanceweekly.io'
```

### OAuth Client Configuration

**Required Redirect URIs**:
- `http://localhost:3000/api/auth/callback/google` (development)
- `https://advanceweekly.io/api/auth/callback/google` (production)

## ✅ Benefits

### For Developers
- 🚀 **Zero Manual Work**: Push code, deployment happens automatically
- ⚡ **Instant Authentication**: OAuth works immediately after deployment
- 🛡️ **No More Redirect URI Errors**: Fixed domain eliminates the problem
- 🔄 **Consistent URLs**: Same domain for all environments

### For Operations
- 📈 **Reliable Deployments**: No human error in OAuth configuration
- 🔍 **Predictable URLs**: Always know where the app is deployed
- 📊 **Better Monitoring**: Fixed endpoints for health checks
- 🔒 **Security**: Controlled domain with proper SSL

## 🚨 Migration from Dynamic URLs

If you previously used dynamic Cloud Run URLs:

1. **Deploy New Infrastructure**:
   ```bash
   cd terraform && terraform apply
   ```

2. **Update OAuth Client** (remove old dynamic URLs):
   - Remove: `https://service-xyz-uc.a.run.app/api/auth/callback/google`  
   - Add: `https://advanceweekly.io/api/auth/callback/google`

3. **Update DNS**:
   - Point domain to new load balancer IP

4. **Test Deployment**:
   ```bash
   # Push to main branch or trigger manually
   git push origin main
   ```

## 🔧 Troubleshooting

### DNS Propagation
**Issue**: Domain not accessible immediately after setup
**Solution**: DNS propagation takes 5-60 minutes. Check status:
```bash
dig advanceweekly.io
nslookup advanceweekly.io
```

### SSL Certificate Provisioning
**Issue**: HTTPS not working immediately
**Solution**: Google-managed certificates take 15 minutes to 24 hours to provision.

### OAuth Redirect URI Mismatch
**Issue**: Still getting redirect URI errors
**Solution**: Ensure OAuth client has the correct fixed redirect URI:
1. Visit Google Cloud Console
2. Check OAuth client configuration
3. Verify: `https://advanceweekly.io/api/auth/callback/google`

## 📊 Monitoring

### Health Checks
The deployment pipeline automatically checks:
- ✅ Application deployment success
- ✅ Custom domain accessibility  
- ✅ OAuth endpoint availability
- ✅ SSL certificate status

### Key Metrics
- **Deployment Time**: ~5-10 minutes
- **DNS Propagation**: 5-60 minutes (one-time)
- **SSL Certificate**: 15 minutes - 24 hours (one-time)
- **OAuth Configuration**: Immediate (after one-time setup)

## 🎉 Success Criteria

Your automated OAuth deployment is working when:

1. ✅ You can push code to main branch
2. ✅ GitHub Actions completes successfully
3. ✅ Application is accessible at `https://advanceweekly.io`
4. ✅ Google OAuth sign-in works without errors
5. ✅ No manual configuration steps required

## 🔗 Related Documentation

- [Infrastructure Architecture](./ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Terraform Configuration](../terraform/main.tf)
- [OAuth Setup Script](../scripts/setup-oauth-fixed-domain.sh)

---

**Result**: Fully automated deployments with zero manual OAuth configuration! 🚀