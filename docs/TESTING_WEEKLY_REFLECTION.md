# Weekly Reflection Automation - Testing Guide

This guide covers all testing approaches for the weekly reflection automation system, ensuring reliability and correctness across all components.

## Overview

The weekly reflection automation system includes several layers that require comprehensive testing:

1. **Integration Tests** - End-to-end system validation
2. **API Tests** - HTTP endpoint functionality  
3. **Job Processing Tests** - Background task execution
4. **Database Tests** - Data persistence and retrieval
5. **Scheduler Tests** - Timing and user preference logic
6. **Error Handling Tests** - Graceful failure scenarios

## Test Types

### 1. DevTools Button Testing (Interactive - Recommended)

**Location**: DevTools panel (bottom-right corner) in dev and staging environments  
**Button**: "📝 Test Reflection"

**Features**:
- ✅ Tests complete end-to-end reflection automation flow
- ✅ Uses existing mock calendar data (same as onboarding)
- ✅ Real-time progress tracking with visual feedback
- ✅ Polls for completion and shows final results
- ✅ Option to navigate directly to Friday Reflections tab
- ✅ Works in both development and staging environments

**How it works**:
1. Click "📝 Test Reflection" in DevTools
2. Confirm to start the flow
3. Button shows progress: "Processing... X%"
4. Polls every 10 seconds for completion
5. Shows success/error alerts with operation details
6. Generated reflection appears in Friday Reflections tab

**Mock Data Used**:
- Uses `GoogleCalendarService.generateMockData()` with realistic events
- Same mock data used in onboarding and integration tests
- Data appears as current week regardless of actual date
- Includes meetings like: Sprint Planning, 1:1s, Code Reviews, etc.

### 2. Integration Tests (Automated)

**File**: `__tests__/weekly-reflection-automation.test.ts`  
**Command**: `npm run test:integration`

Comprehensive end-to-end testing covering:
- Complete job processing pipeline
- API endpoint functionality
- Database operations and data isolation
- Progress tracking and async operations
- Error handling and recovery

**Features Tested**:
- ✅ Full reflection generation workflow
- ✅ API POST/GET endpoints with authentication
- ✅ Progress tracking through job execution
- ✅ Database isolation between users
- ✅ Error scenarios (missing users, LLM failures)
- ✅ Duplicate detection and prevention

### 3. Manual API Testing (Interactive)

**File**: `scripts/test-weekly-reflection.sh`  
**Command**: `./scripts/test-weekly-reflection.sh`

Interactive bash script for manual validation:
- Server connectivity checks
- User creation and management
- API endpoint testing with real HTTP calls
- Job status monitoring
- Database state inspection
- Reflection content validation

**Usage Examples**:
```bash
# Full test suite
./scripts/test-weekly-reflection.sh

# Quick API test
./scripts/test-weekly-reflection.sh quick

# Just trigger reflection
./scripts/test-weekly-reflection.sh trigger

# Clean up test data
./scripts/test-weekly-reflection.sh cleanup
```

### 4. Development Test Runner (Programmatic)

**File**: `scripts/test-reflection-dev.js`  
**Command**: `npm run test:reflection`

Programmatic testing for development workflows:
- Automated test user setup and cleanup  
- Job processing validation
- Database operation testing
- Error handling verification
- Scheduler functionality checks

**Usage Examples**:
```bash
# Run all tests
npm run test:reflection

# Test specific components
node scripts/test-reflection-dev.js job
node scripts/test-reflection-dev.js db
node scripts/test-reflection-dev.js setup
```

## Running Tests

### Prerequisites

1. **Database Connection**: Ensure PostgreSQL is running
   ```bash
   npm run dev:db:start
   ```

2. **Environment Setup**: Required environment variables
   ```bash
   DATABASE_URL="postgresql://user:password@localhost:5432/advanceweekly_dev"
   NODE_ENV="development"  
   ```

3. **Dependencies**: Install required packages
   ```bash
   npm install
   ```

### Test Commands

```bash
# Integration tests (comprehensive, automated)
npm run test:integration                 # Run all integration tests
npm run test:integration:watch           # Watch mode
npm run test:integration:verbose         # Detailed output

# Manual testing (interactive, step-by-step)
./scripts/test-weekly-reflection.sh      # Full manual test suite
./scripts/test-weekly-reflection.sh quick  # Quick API validation

# Development testing (programmatic, focused)
npm run test:reflection                  # Run dev test suite
node scripts/test-reflection-dev.js job # Test job processing only
```

### Full Test Suite (Recommended)

To run comprehensive testing across all components:

```bash
# 1. Start database
npm run dev:db:start

# 2. Run integration tests
npm run test:integration

# 3. Run development tests  
npm run test:reflection

# 4. Manual validation (optional)
./scripts/test-weekly-reflection.sh
```

## Test Scenarios Covered

### ✅ Happy Path Scenarios
- User has complete profile and Google Calendar integration
- Reflection generation completes successfully
- Generated content has correct structure (## Done, ## Next, ## Notes)
- Database operations succeed
- Progress tracking works correctly

### ✅ Edge Cases
- User without Google Calendar integration
- Duplicate reflection requests for same week
- Multiple users with data isolation
- Concurrent operations
- Previous context integration

### ✅ Error Scenarios  
- Missing user profile
- Invalid user ID
- Database connection failures
- LLM service unavailable
- Calendar API errors
- Network timeouts

### ✅ Security & Isolation
- User data isolation (users can't access each other's data)
- Authentication validation
- SQL injection prevention
- Input validation and sanitization

## Test Data Management

### Automated Cleanup
All tests include automatic cleanup to prevent data pollution:
- Test users are created with `test-` prefixes
- Cleanup occurs in `beforeEach`, `afterEach`, and `afterAll` hooks
- Global setup/teardown removes any orphaned test data

### Manual Cleanup
If needed, manual cleanup is available:
```bash
# Via script
./scripts/test-weekly-reflection.sh cleanup

# Via development runner
node scripts/test-reflection-dev.js cleanup
```

## CI/CD Integration

Integration tests are included in the full check pipeline:
```bash
npm run check:full  # Includes integration tests
```

This ensures all PRs are validated against the complete reflection automation system.

## Debugging Tests

### Verbose Output
```bash
# Enable detailed logging
VERBOSE_TESTS=true npm run test:integration

# Or use verbose command
npm run test:integration:verbose
```

### Individual Test Components
```bash
# Test specific areas
node scripts/test-reflection-dev.js job      # Job processing only
node scripts/test-reflection-dev.js db       # Database operations only
node scripts/test-reflection-dev.js setup    # User setup only
```

### Database Inspection
```bash
# Open database browser during testing
npm run db:studio

# Check test data state
./scripts/test-weekly-reflection.sh database
```

## Mock Services

For consistent testing, several services are mocked:

- **LLM Proxy**: Returns consistent reflection content
- **Google Calendar**: Provides mock calendar events
- **Integration Consolidation**: Returns structured mock data
- **Email/Notifications**: Prevents external communications during tests

## Coverage Report

Integration tests provide coverage reports:
```bash
npm run test:integration  # Generates coverage/integration/index.html
```

Coverage focuses on core automation components:
- `lib/job-processor/handlers/weekly-reflection-handler.ts`
- `lib/schedulers/**/*.ts` 
- `app/api/jobs/weekly-reflection/**/*.ts`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Restart database
   npm run dev:db:stop && npm run dev:db:start
   ```

2. **Test Timeouts**
   - Integration tests have 5-minute timeout
   - LLM mocking prevents external API delays
   - Database operations should be fast

3. **Permission Issues**
   ```bash
   # Make scripts executable
   chmod +x scripts/test-weekly-reflection.sh
   chmod +x scripts/test-reflection-dev.js
   ```

4. **Port Conflicts**
   ```bash
   # Check if dev server is running on different port
   lsof -ti:3000
   ```

### Getting Help

- Check test output for detailed error messages
- Use verbose mode for additional debugging info
- Review database state with `npm run db:studio`
- Examine logs in console output

## Future Enhancements

Potential test improvements:
- [ ] Performance testing for large datasets
- [ ] Load testing for concurrent users
- [ ] UI integration testing (end-to-end)
- [ ] Notification system testing
- [ ] Multi-timezone testing scenarios