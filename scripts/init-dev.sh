#!/bin/bash

# Development Environment Setup Script
# Run this after starting Docker Compose to initialize with test data
echo "🚀 Setting up development environment with test data..."

# Check if we're in development mode
if [ "$NODE_ENV" = "production" ]; then
    echo "🚫 This script is only for development environments"
    echo "💡 Production should start with blank history"
    exit 1
fi

# Set development environment
export NODE_ENV=development

echo "🌱 Seeding database with 6 months of test snippets..."
npm run setup:dev

echo "✅ Development environment setup complete!"
echo ""
echo "📊 Available test data:"
echo "  - Test user: test@example.com"
echo "  - 26 weeks of realistic weekly snippets (6 months)"
echo "  - Each snippet has Done/Next format with 3-5 items per section"
echo ""
echo "🎯 You can now:"
echo "  - Access the app at http://localhost:3000"
echo "  - View database at http://localhost:5555 (npm run db:studio)"
echo "  - Test LLM performance assessment generation"