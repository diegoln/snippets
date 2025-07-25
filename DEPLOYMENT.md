# 🚀 AdvanceWeekly Production Deployment Guide

This guide covers deploying AdvanceWeekly to Google Cloud Platform using production-ready infrastructure and deployment practices.

## 📋 Prerequisites

1. **Google Cloud Account** with billing enabled
2. **OpenAI API Key** (get one at https://platform.openai.com/api-keys)
3. **Google Cloud CLI** installed and authenticated
4. **Docker** (for local testing)

## 🔧 Infrastructure Setup

Our production setup includes:
- **Cloud Run** (Gen2): Serverless container hosting with auto-scaling
- **Cloud SQL PostgreSQL**: Managed database with automated backups
- **Secret Manager**: Secure storage for sensitive configuration
- **Artifact Registry**: Private container image storage
- **Multi-stage Docker build**: Optimized for production security and performance

## 🏗️ Deployment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloud Build   │───▶│ Artifact Registry │───▶│   Cloud Run     │
│  (Build Image)  │    │ (Store Image)     │    │ (Run Service)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │   Cloud SQL     │
                                               │  (PostgreSQL)   │
                                               └─────────────────┘
                                                         ▲
                                               ┌─────────────────┐
                                               │ Secret Manager  │
                                               │ (API Keys, DB)  │
                                               └─────────────────┘
```

## 🚀 Production Deployment

### Method 1: Automated Script (Recommended)

```bash
# Run the production deployment script
./deploy-production.sh
```

This will:
1. ✅ Verify all prerequisites
2. 🔍 Validate environment setup
3. 🐳 Build production Docker image
4. 📤 Push to Artifact Registry
5. 🚀 Deploy to Cloud Run
6. 🔍 Run health checks

### Method 2: Manual Cloud Build

```bash
# Submit build directly to Cloud Build
gcloud builds submit --config=cloudbuild.yaml .
```

### Method 3: Local Build + Deploy

```bash
# Build and test locally first
docker build -t advanceweekly-prod .
docker run --rm -p 8080:8080 advanceweekly-prod

# Then push and deploy
gcloud builds submit --tag us-central1-docker.pkg.dev/advanceweekly-prod/advanceweekly-repo/advanceweekly
gcloud run deploy advanceweekly --image us-central1-docker.pkg.dev/advanceweekly-prod/advanceweekly-repo/advanceweekly --region us-central1
```

## 📊 What Gets Created

### GCP Services
- **Cloud Run**: Serverless container hosting
- **Cloud SQL**: PostgreSQL database (db-f1-micro)
- **Secret Manager**: Secure storage for API keys
- **Artifact Registry**: Container image storage
- **IAM**: Service accounts with minimal permissions

### Estimated Monthly Cost
- **Cloud Run**: $0-5 (pay per request)
- **Cloud SQL**: ~$7 (db-f1-micro instance)
- **Storage**: ~$2 (database + container images)
- **Total**: ~$10-15/month for 50 users

## 🔧 Configuration

### Environment Variables (Managed Automatically)
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Session encryption key
- `OPENAI_API_KEY`: Your OpenAI API key
- `NODE_ENV`: Set to "production"

### Google OAuth Setup (Post-Deployment)
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials
3. Add your Cloud Run URL to authorized origins
4. Update your environment variables

## 📱 Monitoring & Management

### Cloud Console Links
- **Application**: https://console.cloud.google.com/run
- **Database**: https://console.cloud.google.com/sql
- **Logs**: https://console.cloud.google.com/logs
- **Secrets**: https://console.cloud.google.com/security/secret-manager

### Useful Commands

```bash
# View application logs
gcloud run services logs read advanceweekly --region=us-central1

# Connect to database
gcloud sql connect advanceweekly-db --user=app_user

# Update application (after code changes)
./deploy.sh --skip-infrastructure

# Scale up/down
gcloud run services update advanceweekly --max-instances=20
```

## 🔄 CI/CD (Optional)

For automatic deployments on code changes, we can set up GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Deploy
      run: ./deploy.sh
      env:
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## 🆘 Troubleshooting

### Common Issues

**"Permission denied"**
```bash
chmod +x deploy.sh
gcloud auth login
```

**"Docker not found"**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

**"Terraform command not found"**
```bash
sudo apt-get update && sudo apt-get install terraform
```

### Support
- View logs: `gcloud run services logs read advanceweekly`
- Check health: `curl https://your-app-url/api/health`
- Database status: `gcloud sql instances list`

## 🔒 Security Best Practices

✅ **What's Already Configured:**
- Secrets stored in Google Secret Manager
- Minimal IAM permissions
- HTTPS-only communication
- Container runs as non-root user
- Regular security updates via Cloud Run

✅ **Additional Recommendations:**
- Enable Cloud Armor for DDoS protection
- Set up VPC for network isolation
- Configure Cloud Monitoring alerts
- Regular backup verification

---

**🎉 Your AdvanceWeekly app is now production-ready on Google Cloud!**