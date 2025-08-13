#!/bin/bash

#
# Staging Database Seeding Script for AdvanceWeekly
#
# This script populates the staging database with test data for:
# - Mock users (for authentication testing)
# - Sample snippets (for UI testing)
# - Career check-ins (for assessment testing)
# - Career guidelines templates (for onboarding testing)
#
# Run this after setting up staging infrastructure
#

set -e

# Configuration
PROJECT_ID="advanceweekly-prod"
STAGING_DB_INSTANCE="advanceweekly-staging-db"
DATABASE_NAME="advanceweekly"

echo "🌱 Seeding AdvanceWeekly Staging Database"
echo "🗄️  Database: $STAGING_DB_INSTANCE"
echo ""

# Check if user is authenticated
echo "🔐 Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Run: gcloud auth login"
    exit 1
fi

# Set project
gcloud config set project $PROJECT_ID

# Get database connection info
echo "🔍 Getting database connection info..."
DB_CONNECTION_NAME="$PROJECT_ID:us-central1:$STAGING_DB_INSTANCE"
echo "📡 Connection: $DB_CONNECTION_NAME"

# Create SQL file with staging seed data
echo "📝 Creating staging seed data..."
cat > /tmp/staging-seed.sql << 'EOF'
-- AdvanceWeekly Staging Database Seed Data
-- This creates test data for staging environment testing

-- Create mock users for staging authentication
INSERT INTO "User" (id, email, name, image, "jobTitle", "seniorityLevel", "createdAt", "updatedAt") VALUES
  ('staging_jack', 'jack+staging@advanceweekly.io', 'Jack Thompson (Staging)', 'https://avatars.githubusercontent.com/u/1?v=4', 'Senior Software Engineer', 'Senior', NOW(), NOW()),
  ('staging_sarah', 'sarah+staging@advanceweekly.io', 'Sarah Chen (Staging)', 'https://avatars.githubusercontent.com/u/2?v=4', 'Product Manager', 'Mid', NOW(), NOW()),
  ('staging_mike', 'mike+staging@advanceweekly.io', 'Mike Rodriguez (Staging)', 'https://avatars.githubusercontent.com/u/3?v=4', 'Engineering Manager', 'Staff', NOW(), NOW()),
  ('staging_lisa', 'lisa+staging@advanceweekly.io', 'Lisa Wang (Staging)', 'https://avatars.githubusercontent.com/u/4?v=4', 'UX Designer', 'Mid', NOW(), NOW()),
  ('staging_alex', 'alex+staging@advanceweekly.io', 'Alex Kumar (Staging)', 'https://avatars.githubusercontent.com/u/5?v=4', 'Data Scientist', 'Principal', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  image = EXCLUDED.image,
  "jobTitle" = EXCLUDED."jobTitle",
  "seniorityLevel" = EXCLUDED."seniorityLevel",
  "updatedAt" = NOW();

-- Create sample snippets for each staging user
WITH user_ids AS (
  SELECT id FROM "User" WHERE id LIKE 'staging_%'
),
weeks AS (
  SELECT 
    generate_series(1, 52) as week_num,
    2024 as year
)
INSERT INTO "Snippet" (id, "userId", "weekNumber", year, content, "createdAt", "updatedAt")
SELECT 
  'snippet_' || u.id || '_' || w.week_num || '_' || w.year,
  u.id,
  w.week_num,
  w.year,
  CASE 
    WHEN w.week_num % 4 = 1 THEN 'Completed API refactoring for better performance. Fixed critical bug in authentication flow. Started planning Q' || (w.week_num/12 + 1) || ' roadmap.'
    WHEN w.week_num % 4 = 2 THEN 'Led team meeting on new features. Reviewed 5 pull requests. Collaborated with design team on user experience improvements.'
    WHEN w.week_num % 4 = 3 THEN 'Shipped new dashboard feature to production. Improved test coverage by 15%. Mentored junior developer on best practices.'
    ELSE 'Analyzed user feedback and created improvement plan. Fixed 3 production issues. Presented technical proposal to leadership team.'
  END || ' [Week ' || w.week_num || ' - Generated for staging testing]',
  NOW() - INTERVAL '1 week' * (52 - w.week_num),
  NOW() - INTERVAL '1 week' * (52 - w.week_num)
FROM user_ids u
CROSS JOIN weeks w
WHERE w.week_num <= 52
ON CONFLICT (id) DO NOTHING;

-- Create sample career check-ins
INSERT INTO "CareerCheckin" (id, "userId", "currentRole", "currentLevel", "nextRole", "nextLevel", "currentExpectations", "nextLevelExpectations", reflection, "createdAt", "updatedAt")
SELECT 
  'checkin_' || id || '_' || EXTRACT(MONTH FROM NOW()),
  id,
  "jobTitle",
  "seniorityLevel",
  CASE 
    WHEN "seniorityLevel" = 'Junior' THEN "jobTitle"
    WHEN "seniorityLevel" = 'Mid' THEN "jobTitle" 
    WHEN "seniorityLevel" = 'Senior' THEN "jobTitle"
    WHEN "seniorityLevel" = 'Staff' THEN "jobTitle"
    ELSE "jobTitle"
  END,
  CASE 
    WHEN "seniorityLevel" = 'Junior' THEN 'Mid'
    WHEN "seniorityLevel" = 'Mid' THEN 'Senior'
    WHEN "seniorityLevel" = 'Senior' THEN 'Staff'
    WHEN "seniorityLevel" = 'Staff' THEN 'Principal'
    ELSE 'Principal'
  END,
  'Current role expectations: Deliver high-quality work, collaborate effectively, contribute to team goals.',
  'Next level expectations: Lead projects, mentor others, drive technical decisions, influence team direction.',
  'Reflecting on recent accomplishments and growth areas. Making progress on technical skills and leadership development. Ready to take on more responsibility.',
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
FROM "User" 
WHERE id LIKE 'staging_%'
ON CONFLICT (id) DO NOTHING;

-- Show summary
SELECT 'Users' as table_name, COUNT(*) as count FROM "User" WHERE id LIKE 'staging_%'
UNION ALL
SELECT 'Snippets' as table_name, COUNT(*) as count FROM "Snippet" WHERE "userId" LIKE 'staging_%'
UNION ALL  
SELECT 'Check-ins' as table_name, COUNT(*) as count FROM "CareerCheckin" WHERE "userId" LIKE 'staging_%';
EOF

echo "🗄️  Applying database schema..."
# First ensure schema is up to date
DATABASE_URL="postgresql://username:password@/advanceweekly?host=/cloudsql/$DB_CONNECTION_NAME" \
  npx prisma db push --force-reset --accept-data-loss

echo "🌱 Seeding staging database..."
# Apply seed data
gcloud sql instances describe $STAGING_DB_INSTANCE --format="value(connectionName)" > /dev/null

# Connect and run seed SQL
gcloud sql connect $STAGING_DB_INSTANCE --user=postgres --database=$DATABASE_NAME < /tmp/staging-seed.sql

# Clean up
rm /tmp/staging-seed.sql

echo ""
echo "✅ Staging database seeded successfully!"
echo ""
echo "📊 Staging Test Data Created:"
echo "👥 5 mock users (staging_*)"
echo "📝 260 sample snippets (52 weeks × 5 users)"  
echo "📋 5 career check-ins"
echo ""
echo "🎭 Ready for staging testing at: https://staging.advanceweekly.io"
echo "🔐 Mock authentication available with staging users"
echo "📊 Full year of test data for realistic testing"
echo ""
echo "🚀 Next steps:"
echo "1. Configure DNS: staging.advanceweekly.io → Cloud Run"
echo "2. Deploy staging: gcloud builds submit --config cloudbuild-staging.yaml"
echo "3. Test staging environment with mock users"