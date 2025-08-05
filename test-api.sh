#!/bin/bash

# Test API endpoints for career plan generation
echo "🧪 Testing AdvanceWeekly Career Plan Generation API"

# Test basic health check
echo "📡 Testing server health..."
curl -s http://localhost:3000 > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server is responding"
else
    echo "❌ Server is not responding"
    exit 1
fi

# Test job handler with proper data
echo "🚀 Testing career plan generation job handler..."

# Create test data in proper format
curl -X POST http://localhost:3000/api/jobs/career-plan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{
    "operationId": "test-job-001", 
    "userId": "test-user-001",
    "inputData": {
      "role": "Software Engineer",
      "level": "Senior Software Engineer",
      "companyLadder": "Standard tech company levels: Junior -> Mid -> Senior -> Staff -> Principal"
    }
  }' \
  --max-time 60 \
  --connect-timeout 10 | jq .

echo "📊 Test completed"