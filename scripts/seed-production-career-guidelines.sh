#!/bin/bash

# Production Career Guidelines Seeding Script
# Uses the unified career guidelines seeding function for consistency
# Usage: ./scripts/seed-production-career-guidelines.sh

set -e

echo "🏭 Seeding career guideline templates in production..."

# Check if running in production context
if [[ -z "${DATABASE_URL:-}" && -z "${PRODUCTION:-}" ]]; then
    echo "❌ Error: This script is for production use only."
    echo "   Set PRODUCTION=true and DATABASE_URL to run."
    exit 1
fi

# Use the unified seeding function for true consistency
echo "📋 Running unified career guidelines seed..."

# Create a simple inline script that uses the unified function
NODE_ENV=production npx tsx -e "
import { seedCareerGuidelineTemplates } from './lib/career-guidelines-seeding';
seedCareerGuidelineTemplates().then(result => {
  console.log(\`✅ Production career guideline templates seeded successfully!\`);
  console.log(\`   Created: \${result.created}, Skipped: \${result.skipped}\`);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});
"