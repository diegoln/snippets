#!/bin/bash

# Create a one-time Cloud Run job to run Prisma migrations

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Creating Migration Cloud Run Job${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Create a temporary Cloud Run job for migrations
echo -e "${BLUE}Creating Cloud Run job for migrations...${NC}"

gcloud run jobs create migrate-nextauth-tables \
  --image us-central1-docker.pkg.dev/advanceweekly-prod/advanceweekly-repo/advanceweekly:latest \
  --region us-central1 \
  --project advanceweekly-prod \
  --set-secrets DATABASE_URL=database-url:latest \
  --set-env-vars NODE_ENV=production \
  --add-cloudsql-instances advanceweekly-prod:us-central1:advanceweekly-db \
  --command npx \
  --args "prisma,migrate,deploy" \
  --memory 1Gi \
  --cpu 1 \
  --max-retries 1 \
  --parallelism 1 || echo "Job might already exist"

echo -e "${GREEN}✅ Migration job created${NC}"
echo ""

# Execute the migration job
echo -e "${BLUE}Executing migration job...${NC}"
gcloud run jobs execute migrate-nextauth-tables \
  --region us-central1 \
  --project advanceweekly-prod \
  --wait

echo -e "${GREEN}✅ Migration job completed!${NC}"
echo ""

# Clean up the job
echo -e "${BLUE}Cleaning up migration job...${NC}"
gcloud run jobs delete migrate-nextauth-tables \
  --region us-central1 \
  --project advanceweekly-prod \
  --quiet

echo -e "${GREEN}🎉 Database migrations complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Test OAuth flow again"
echo "2. The P2021 error should be resolved"
echo "3. Users should be able to sign in with Google"