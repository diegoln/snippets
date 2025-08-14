#!/bin/bash
# Manual Testing Script for Weekly Reflection Automation
# 
# This script provides manual testing capabilities for the weekly reflection system
# Run from the project root directory

set -e

echo "🧪 Weekly Reflection Automation - Manual Testing"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if dev server is running
check_server() {
    echo -e "${BLUE}📡 Checking if development server is running...${NC}"
    if curl -s http://localhost:3000/api/environment > /dev/null; then
        echo -e "${GREEN}✅ Development server is running${NC}"
    else
        echo -e "${RED}❌ Development server is not running. Please run 'npm run dev' first${NC}"
        exit 1
    fi
}

# Get or create test user
get_test_user() {
    echo -e "${BLUE}👤 Getting test user...${NC}"
    
    # Try to get existing test user
    TEST_USER_EMAIL="test-reflection-automation@example.com"
    
    # Create test user via API if needed
    USER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/mock-users \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_USER_EMAIL\",
            \"name\": \"Test Reflection User\",
            \"jobTitle\": \"Software Engineer\",
            \"seniorityLevel\": \"Senior\",
            \"careerProgressionPlan\": \"Focus on technical leadership and mentoring\"
        }")
    
    if echo "$USER_RESPONSE" | grep -q "error"; then
        echo -e "${YELLOW}⚠️  User might already exist, continuing...${NC}"
    else
        echo -e "${GREEN}✅ Test user created/verified${NC}"
    fi
}

# Test API endpoint - Trigger reflection
test_trigger_reflection() {
    echo -e "${BLUE}🚀 Testing reflection trigger API...${NC}"
    
    TRIGGER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/jobs/weekly-reflection \
        -H "Content-Type: application/json" \
        -H "X-Test-User-Email: test-reflection-automation@example.com" \
        -d '{
            "manual": true,
            "includePreviousContext": true,
            "includeIntegrations": ["google_calendar"]
        }')
    
    echo "Response: $TRIGGER_RESPONSE"
    
    # Extract operation ID
    OPERATION_ID=$(echo "$TRIGGER_RESPONSE" | grep -o '"operationId":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$OPERATION_ID" ]; then
        echo -e "${GREEN}✅ Reflection triggered successfully${NC}"
        echo -e "${BLUE}📝 Operation ID: $OPERATION_ID${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to trigger reflection${NC}"
        return 1
    fi
}

# Test API endpoint - Check status
test_check_status() {
    if [ -z "$OPERATION_ID" ]; then
        echo -e "${YELLOW}⚠️  No operation ID available, skipping status check${NC}"
        return
    fi
    
    echo -e "${BLUE}📊 Testing status check API...${NC}"
    
    STATUS_RESPONSE=$(curl -s "http://localhost:3000/api/jobs/weekly-reflection?operationId=$OPERATION_ID" \
        -H "X-Test-User-Email: test-reflection-automation@example.com")
    
    echo "Status Response: $STATUS_RESPONSE"
    
    if echo "$STATUS_RESPONSE" | grep -q '"status"'; then
        echo -e "${GREEN}✅ Status check successful${NC}"
    else
        echo -e "${RED}❌ Status check failed${NC}"
    fi
}

# Test scheduler functionality
test_scheduler() {
    echo -e "${BLUE}⏰ Testing scheduler functionality...${NC}"
    
    # Test if we can import and use the scheduler
    node -e "
        const { getDevScheduler } = require('./lib/schedulers/dev-scheduler.ts');
        const scheduler = getDevScheduler();
        console.log('Scheduler status:', scheduler.getStatus());
        console.log('✅ Scheduler initialized successfully');
    " 2>/dev/null || echo -e "${YELLOW}⚠️  Direct scheduler test skipped (requires TypeScript compilation)${NC}"
}

# Test database state
test_database_state() {
    echo -e "${BLUE}🗄️  Checking database state...${NC}"
    
    # Check if we can connect to database and query
    DB_CHECK=$(node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        (async () => {
            try {
                const userCount = await prisma.user.count();
                const operationCount = await prisma.asyncOperation.count();
                const snippetCount = await prisma.weeklySnippet.count();
                
                console.log(\`Users: \${userCount}, Operations: \${operationCount}, Snippets: \${snippetCount}\`);
                await prisma.\$disconnect();
            } catch (error) {
                console.log('Database connection failed:', error.message);
            }
        })();
    " 2>/dev/null)
    
    echo "Database state: $DB_CHECK"
    
    if echo "$DB_CHECK" | grep -q "Users:"; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Database connection issue${NC}"
    fi
}

# Wait for job completion and check result
wait_for_completion() {
    if [ -z "$OPERATION_ID" ]; then
        echo -e "${YELLOW}⚠️  No operation ID available, skipping completion check${NC}"
        return
    fi
    
    echo -e "${BLUE}⏳ Waiting for job completion...${NC}"
    
    for i in {1..30}; do  # Wait up to 30 attempts (15 minutes max)
        sleep 30
        
        STATUS_RESPONSE=$(curl -s "http://localhost:3000/api/jobs/weekly-reflection?operationId=$OPERATION_ID" \
            -H "X-Test-User-Email: test-reflection-automation@example.com")
        
        STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
        PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
        
        echo -e "${BLUE}Attempt $i: Status=$STATUS, Progress=$PROGRESS%${NC}"
        
        if [ "$STATUS" = "completed" ]; then
            echo -e "${GREEN}✅ Job completed successfully!${NC}"
            
            # Check if reflection was created
            RESULT_DATA=$(echo "$STATUS_RESPONSE" | grep -o '"resultData":{[^}]*}')
            echo "Result: $RESULT_DATA"
            return 0
        elif [ "$STATUS" = "error" ]; then
            echo -e "${RED}❌ Job failed${NC}"
            ERROR_MSG=$(echo "$STATUS_RESPONSE" | grep -o '"errorMessage":"[^"]*' | cut -d'"' -f4)
            echo "Error: $ERROR_MSG"
            return 1
        fi
    done
    
    echo -e "${YELLOW}⚠️  Job did not complete within timeout${NC}"
    return 1
}

# Test reflection content
test_reflection_content() {
    echo -e "${BLUE}📝 Testing reflection content...${NC}"
    
    # Query snippets to verify reflection was created
    SNIPPETS_RESPONSE=$(curl -s http://localhost:3000/api/snippets \
        -H "X-Test-User-Email: test-reflection-automation@example.com")
    
    if echo "$SNIPPETS_RESPONSE" | grep -q '"content"'; then
        echo -e "${GREEN}✅ Reflection content found${NC}"
        
        # Extract and preview content
        CONTENT=$(echo "$SNIPPETS_RESPONSE" | grep -o '"content":"[^"]*' | head -1 | cut -d'"' -f4)
        echo -e "${BLUE}Preview:${NC}"
        echo "$CONTENT" | head -c 200
        echo "..."
        
        # Check for required sections
        if echo "$CONTENT" | grep -q "## Done" && echo "$CONTENT" | grep -q "## Next"; then
            echo -e "${GREEN}✅ Reflection has required sections${NC}"
        else
            echo -e "${YELLOW}⚠️  Reflection missing required sections${NC}"
        fi
    else
        echo -e "${RED}❌ No reflection content found${NC}"
    fi
}

# Cleanup test data
cleanup() {
    echo -e "${BLUE}🧹 Cleaning up test data...${NC}"
    
    # Delete test user and associated data
    CLEANUP_RESPONSE=$(curl -s -X DELETE "http://localhost:3000/api/auth/mock-users?email=test-reflection-automation@example.com")
    
    if echo "$CLEANUP_RESPONSE" | grep -q "success"; then
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    else
        echo -e "${YELLOW}⚠️  Cleanup may not have completed fully${NC}"
    fi
}

# Main test execution
main() {
    echo -e "${BLUE}Starting manual testing sequence...${NC}"
    
    check_server
    get_test_user
    test_database_state
    test_scheduler
    
    echo -e "\n${BLUE}=== API Testing ===${NC}"
    if test_trigger_reflection; then
        sleep 5  # Give the job a moment to start
        test_check_status
        
        echo -e "\n${BLUE}=== Waiting for Completion ===${NC}"
        if wait_for_completion; then
            test_reflection_content
        fi
    fi
    
    echo -e "\n${BLUE}=== Cleanup ===${NC}"
    read -p "Do you want to cleanup test data? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cleanup
    fi
    
    echo -e "\n${GREEN}🎉 Manual testing completed!${NC}"
}

# Handle script arguments
case "${1:-}" in
    "trigger")
        check_server && get_test_user && test_trigger_reflection
        ;;
    "status")
        check_server && test_check_status
        ;;
    "cleanup")
        cleanup
        ;;
    "quick")
        check_server && get_test_user && test_trigger_reflection && sleep 5 && test_check_status
        ;;
    *)
        main
        ;;
esac