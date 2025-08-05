#!/bin/bash

echo "🧪 Testing Dashboard Navigation After Onboarding"
echo "================================================"

BASE_URL="http://localhost:3000"
DEV_USER_ID="dev-user-123"

# Reset onboarding first
echo "🔄 Resetting onboarding..."
curl -s -X DELETE "${BASE_URL}/api/user/onboarding" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" | jq .

# Complete onboarding
echo ""
echo "1️⃣ Completing onboarding..."
start_time=$(date +%s%3N)
curl -s -X POST "${BASE_URL}/api/user/onboarding" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"completed":true}' | jq .
end_time=$(date +%s%3N)
completion_time=$(( end_time - start_time ))
echo "⏱️  Onboarding completion time: ${completion_time}ms"

# Test dashboard navigation - simulate what the browser does
echo ""
echo "2️⃣ Testing dashboard navigation (root page)..."
start_time=$(date +%s%3N)

# Check user profile (what dashboard usually does first)
echo "   📋 Checking user profile..."
profile_start=$(date +%s%3N)
profile_response=$(curl -s "${BASE_URL}/api/user/profile" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}")
profile_end=$(date +%s%3N)
profile_time=$(( profile_end - profile_start ))
echo "   ⏱️  Profile check: ${profile_time}ms"

# Check onboarding status (what page does to decide whether to show onboarding)
echo "   🔄 Checking onboarding status..."
onboarding_start=$(date +%s%3N)
onboarding_response=$(curl -s "${BASE_URL}/api/user/profile" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}")
onboarding_end=$(date +%s%3N)
onboarding_time=$(( onboarding_end - onboarding_start ))
echo "   ⏱️  Onboarding status check: ${onboarding_time}ms"

# Load recent snippets (what dashboard shows)
echo "   📝 Loading recent snippets..."
snippets_start=$(date +%s%3N)
curl -s "${BASE_URL}/api/snippets" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" > /dev/null
snippets_end=$(date +%s%3N)
snippets_time=$(( snippets_end - snippets_start ))
echo "   ⏱️  Snippets load: ${snippets_time}ms"

# Load integrations (what dashboard might check)
echo "   🔗 Loading integrations..."
integrations_start=$(date +%s%3N)
curl -s "${BASE_URL}/api/integrations" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" > /dev/null
integrations_end=$(date +%s%3N)
integrations_time=$(( integrations_end - integrations_start ))
echo "   ⏱️  Integrations load: ${integrations_time}ms"

# Load the actual page
echo "   🏠 Loading dashboard page..."
page_start=$(date +%s%3N)
curl -s "${BASE_URL}/" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" > /dev/null
page_end=$(date +%s%3N)
page_time=$(( page_end - page_start ))
echo "   ⏱️  Page load: ${page_time}ms"

end_time=$(date +%s%3N)
total_dashboard_time=$(( end_time - start_time ))

# Summary
echo ""
echo "📊 Dashboard Navigation Performance:"
echo "===================================="
echo "   Profile check: ${profile_time}ms"
echo "   Onboarding status: ${onboarding_time}ms"
echo "   Snippets load: ${snippets_time}ms"
echo "   Integrations load: ${integrations_time}ms"
echo "   Page load: ${page_time}ms"
echo "   Total dashboard load: ${total_dashboard_time}ms"
echo ""

if (( total_dashboard_time > 2000 )); then
  echo "⚠️  Dashboard navigation is slow (>2s). This might be the issue."
else
  echo "✅ Dashboard navigation performance looks good."
fi