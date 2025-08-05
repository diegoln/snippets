#!/bin/bash

echo "🧪 Testing Updated Onboarding Flow with Career Plan Step"
echo "======================================================"

BASE_URL="http://localhost:3000"
DEV_USER_ID="dev-user-123"

# Reset onboarding
echo "🔄 Resetting onboarding..."
curl -s -X DELETE "${BASE_URL}/api/user/onboarding" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" | jq .

# Step 1: Save user profile (role/level)
echo ""
echo "1️⃣ Saving user profile (role/level step)..."
start_time=$(date +%s%3N)
curl -s -X PUT "${BASE_URL}/api/user/profile" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"jobTitle":"senior_software_engineer","seniorityLevel":"senior"}' | jq .
end_time=$(date +%s%3N)
profile_time=$(( end_time - start_time ))
echo "⏱️  Profile save time: ${profile_time}ms"

# Step 2: Test career plan generation
echo ""
echo "2️⃣ Testing career plan generation (new step)..."
start_time=$(date +%s%3N)
operation_response=$(curl -s -X POST "${BASE_URL}/api/async-operations" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"operationType":"career_plan_generation","inputData":{"role":"senior_software_engineer","level":"senior","companyLadder":""}}')

operation_id=$(echo "$operation_response" | jq -r '.operationId')
echo "🆔 Operation ID: $operation_id"

# Poll for completion
echo "⏳ Polling for career plan generation completion..."
while true; do
  status_response=$(curl -s "${BASE_URL}/api/async-operations/${operation_id}" \
    -H "X-Dev-User-Id: ${DEV_USER_ID}")
  
  status=$(echo "$status_response" | jq -r '.operation.status')
  progress=$(echo "$status_response" | jq -r '.operation.progress')
  
  echo "📊 Status: $status, Progress: $progress%"
  
  if [[ "$status" == "completed" || "$status" == "failed" ]]; then
    break
  fi
  
  sleep 1
done

end_time=$(date +%s%3N)
career_plan_time=$(( end_time - start_time ))
echo "⏱️  Career plan generation time: ${career_plan_time}ms"

if [[ "$status" == "completed" ]]; then
  echo "✅ Career plan generated successfully!"
  # Show a snippet of the result
  echo "📝 Current level plan preview:"
  echo "$status_response" | jq -r '.operation.resultData.currentLevelPlan' | head -3
else
  echo "❌ Career plan generation failed"
  echo "$status_response" | jq .
  exit 1
fi

# Step 3: Test calendar integration connection (existing flow)
echo ""
echo "3️⃣ Testing calendar integration..."
start_time=$(date +%s%3N) 
curl -s -X POST "${BASE_URL}/api/integrations" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"type":"google_calendar"}' | jq .

# Generate snippet from calendar data
curl -s -X POST "${BASE_URL}/api/snippets/generate-from-integration" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"integrationType":"google_calendar","weekData":{},"userProfile":{"jobTitle":"senior_software_engineer","seniorityLevel":"senior"}}' | jq .bullets

end_time=$(date +%s%3N)
integration_time=$(( end_time - start_time ))
echo "⏱️  Integration connection time: ${integration_time}ms"

# Step 4: Complete onboarding
echo ""
echo "4️⃣ Completing onboarding..."
start_time=$(date +%s%3N)
curl -s -X POST "${BASE_URL}/api/user/onboarding" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: ${DEV_USER_ID}" \
  -d '{"completed":true}' | jq .
end_time=$(date +%s%3N)
completion_time=$(( end_time - start_time ))
echo "⏱️  Onboarding completion time: ${completion_time}ms"

# Summary
echo ""
echo "📊 Updated Onboarding Flow Test Summary:"
echo "========================================"
echo "   Profile save: ${profile_time}ms"
echo "   Career plan generation: ${career_plan_time}ms"
echo "   Calendar integration: ${integration_time}ms"
echo "   Onboarding completion: ${completion_time}ms"
total_time=$(( profile_time + career_plan_time + integration_time + completion_time ))
echo "   Total flow time: ${total_time}ms"
echo ""
echo "🎉 Updated onboarding flow with career plan step completed successfully!"