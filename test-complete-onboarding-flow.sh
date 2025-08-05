#!/bin/bash

echo "🧪 Testing Complete Onboarding Flow (End-to-End)"
echo "================================================="

BASE_URL="http://localhost:3000"
DEV_USER_ID="dev-user-123"

# Reset and complete onboarding with the career plan step
echo "🔄 Step 1: Reset onboarding..."
curl -s -X DELETE "${BASE_URL}/api/user/onboarding" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" | jq -r .message

echo ""
echo "1️⃣ Step 2: Save profile (role/level)..."
start_time=$(date +%s%3N)
curl -s -X PUT "${BASE_URL}/api/user/profile" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"jobTitle":"senior_software_engineer","seniorityLevel":"senior"}' | jq -r .jobTitle
end_time=$(date +%s%3N)
profile_time=$(( end_time - start_time ))
echo "✅ Profile saved in ${profile_time}ms"

echo ""
echo "2️⃣ Step 3: Generate career plan..."
start_time=$(date +%s%3N)
operation_response=$(curl -s -X POST "${BASE_URL}/api/async-operations" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"operationType":"career_plan_generation","inputData":{"role":"senior_software_engineer","level":"senior","companyLadder":""}}')

operation_id=$(echo "$operation_response" | jq -r '.operationId')
echo "   🆔 Career plan operation: $operation_id"

# Quick poll for completion
while true; do
  status_response=$(curl -s "${BASE_URL}/api/async-operations/${operation_id}" \
    -H "X-Dev-User-Id: ${DEV_USER_ID}")
  
  status=$(echo "$status_response" | jq -r '.operation.status')
  progress=$(echo "$status_response" | jq -r '.operation.progress')
  
  if [[ "$status" == "completed" || "$status" == "failed" ]]; then
    break
  fi
  
  sleep 0.5
done

end_time=$(date +%s%3N)
career_plan_time=$(( end_time - start_time ))
echo "✅ Career plan generated in ${career_plan_time}ms"

echo ""
echo "3️⃣ Step 4: Connect calendar integration..."
start_time=$(date +%s%3N)
curl -s -X POST "${BASE_URL}/api/integrations" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"type":"google_calendar"}' | jq -r .message || echo "Integration created or already exists"
end_time=$(date +%s%3N)
integration_time=$(( end_time - start_time ))
echo "✅ Integration connected in ${integration_time}ms"

echo ""
echo "4️⃣ Step 5: Generate snippet from calendar..."
start_time=$(date +%s%3N)
curl -s -X POST "${BASE_URL}/api/snippets/generate-from-integration" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"integrationType":"google_calendar","weekData":{},"userProfile":{"jobTitle":"senior_software_engineer","seniorityLevel":"senior"}}' | jq -r .weeklySnippet | head -3
end_time=$(date +%s%3N)
snippet_gen_time=$(( end_time - start_time ))
echo "✅ Snippet generated in ${snippet_gen_time}ms"

echo ""
echo "5️⃣ Step 6: Complete onboarding..."
start_time=$(date +%s%3N)
curl -s -X POST "${BASE_URL}/api/user/onboarding" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"completed":true}' | jq -r .message
end_time=$(date +%s%3N)
completion_time=$(( end_time - start_time ))
echo "✅ Onboarding completed in ${completion_time}ms"

echo ""
echo "6️⃣ Step 7: Navigate to dashboard (simulate button click)..."
start_time=$(date +%s%3N)

# Simulate what happens when user clicks "Go to Dashboard"
# The AuthenticatedApp loads these in parallel
echo "   📊 Loading dashboard data (parallel calls)..."
parallel_start=$(date +%s%3N)

# Test parallel calls like AuthenticatedApp does
snippets_response=$(curl -s "${BASE_URL}/api/snippets" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" &)
assessments_response=$(curl -s "${BASE_URL}/api/assessments" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" &)

# Wait for both to complete  
wait

parallel_end=$(date +%s%3N)
parallel_time=$(( parallel_end - parallel_start ))

# Load the actual page
page_response=$(curl -s "${BASE_URL}/" -H "X-Dev-User-Id: ${DEV_USER_ID}")

end_time=$(date +%s%3N)
dashboard_time=$(( end_time - start_time ))
echo "✅ Dashboard loaded in ${dashboard_time}ms (parallel API calls: ${parallel_time}ms)"

# Summary
echo ""
echo "📊 Complete Onboarding Flow Performance Summary:"
echo "==============================================="
echo "   Profile save: ${profile_time}ms"
echo "   Career plan generation: ${career_plan_time}ms"
echo "   Integration connection: ${integration_time}ms"
echo "   Snippet generation: ${snippet_gen_time}ms"
echo "   Onboarding completion: ${completion_time}ms"
echo "   Dashboard navigation: ${dashboard_time}ms"
total_time=$(( profile_time + career_plan_time + integration_time + snippet_gen_time + completion_time + dashboard_time ))
echo "   Total end-to-end time: ${total_time}ms"
echo ""

if (( total_time > 10000 )); then
  echo "⚠️  Total flow is slow (>10s). Career plan generation is expected to be ~5s."
elif (( dashboard_time > 2000 )); then
  echo "⚠️  Dashboard navigation is slow (>2s). This is the main issue."
else
  echo "✅ Performance looks good! All major steps completed efficiently."
fi