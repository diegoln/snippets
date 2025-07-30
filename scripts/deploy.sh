#!/bin/bash

# Deployment script with comprehensive pre-flight checks
set -e  # Exit on any error

echo "🚀 Starting deployment process..."

# 1. Check current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
  echo "❌ Error: Deployments must be from main branch. Current branch: $current_branch"
  exit 1
fi

# 2. Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# 3. Run TypeScript compilation (fast mode for deployment)
echo "📦 Running TypeScript compilation check..."
npm run typecheck:fast
if [ $? -ne 0 ]; then
  echo "❌ TypeScript compilation failed. Fix errors before deploying."
  exit 1
fi

# 4. Run linting
echo "🧹 Running ESLint..."
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Linting failed. Fix errors before deploying."
  exit 1
fi

# 5. Run tests
echo "🧪 Running tests..."
node run-basic-tests.js
if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Fix errors before deploying."
  exit 1
fi

# 6. Run production build
echo "🏗️  Running production build..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed. Fix errors before deploying."
  exit 1
fi

# 7. Deploy to Google Cloud
echo "☁️  Deploying to Google Cloud Platform..."
gcloud builds submit --project=advanceweekly-prod

echo "✅ Deployment completed successfully!"