# Weekly Reflection Automation System

## Overview

This document describes the automated weekly reflection generation system for AdvanceWeekly. The system automatically collects integration data, consolidates it, and generates draft reflections for users based on their preferences.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                   Scheduling Layer                       │
├─────────────────────────────────────────────────────────┤
│ Production: Cloud Scheduler → Cloud Run Job             │
│ Development: Node Cron → Local Job Processor            │
└────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              Hourly Reflection Checker                   │
│  - Checks user preferences every hour                    │
│  - Identifies users ready for reflection generation      │
│  - Enqueues jobs for processing                         │
└────────────────┬────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│           Weekly Reflection Job Handler                  │
│  - Fetches integration data (Calendar, Todoist, etc.)   │
│  - Consolidates using existing service                  │
│  - Retrieves previous context (last week, insights)     │
│  - Generates reflection via LLM                         │
│  - Saves as draft WeeklySnippet                        │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Trigger**: Hourly check or manual request
2. **User Selection**: Find users whose preferred time matches current hour
3. **Job Creation**: Create AsyncOperation for tracking
4. **Data Collection**: Fetch week's integration data
5. **Consolidation**: Process through IntegrationConsolidationService
6. **Context Gathering**: Get previous reflections and insights
7. **Generation**: Create reflection with LLM
8. **Storage**: Save as draft in WeeklySnippet table

## User Preferences

Users can configure their reflection generation preferences:

```typescript
interface ReflectionPreferences {
  autoGenerate: boolean           // Enable/disable automation
  preferredDay: string            // 'monday' | 'friday' | 'sunday'
  preferredHour: number           // 0-23 in user's timezone
  timezone: string                // User's timezone (e.g., 'America/New_York')
  includeIntegrations: string[]   // Which integrations to use
  notifyOnGeneration: boolean     // Email when ready
}
```

Default settings:
- **autoGenerate**: true
- **preferredDay**: 'friday'
- **preferredHour**: 14 (2 PM)
- **timezone**: Auto-detected or 'America/New_York'
- **includeIntegrations**: All connected
- **notifyOnGeneration**: false

## Implementation Details

### 1. Weekly Reflection Handler

Location: `lib/job-processor/handlers/weekly-reflection-handler.ts`

```typescript
class WeeklyReflectionHandler implements JobHandler {
  jobType = 'weekly_reflection_generation'
  
  async process(inputData: any, context: JobContext): Promise<any> {
    const { userId } = inputData
    
    // Step 1: Validate user has integrations
    await context.updateProgress(10, 'Checking integrations')
    
    // Step 2: Collect integration data
    await context.updateProgress(30, 'Fetching calendar data')
    
    // Step 3: Consolidate data
    await context.updateProgress(50, 'Consolidating weekly activities')
    
    // Step 4: Get previous context
    await context.updateProgress(60, 'Retrieving previous insights')
    
    // Step 5: Generate reflection
    await context.updateProgress(80, 'Generating reflection with AI')
    
    // Step 6: Save draft
    await context.updateProgress(95, 'Saving reflection draft')
    
    return { reflectionId, status: 'draft' }
  }
}
```

### 2. Hourly Checker Service

Location: `lib/schedulers/hourly-reflection-checker.ts`

```typescript
export class HourlyReflectionChecker {
  async checkAndProcessUsers(): Promise<void> {
    const currentHourUTC = new Date().getUTCHours()
    
    // Get all users with auto-generation enabled
    const users = await getUsersWithPreferences({
      autoGenerate: true
    })
    
    for (const user of users) {
      if (this.shouldProcessUser(user, currentHourUTC)) {
        await this.enqueueReflectionJob(user.id)
      }
    }
  }
  
  private shouldProcessUser(user: User, currentHourUTC: number): boolean {
    // Convert user's preferred time to UTC
    // Check if it matches current hour
    // Check if it's the right day of week
    // Check if not already processed this week
  }
}
```

### 3. API Endpoints

#### Process Reflection Job
`POST /api/jobs/weekly-reflection`

```typescript
// Request
{
  "userId": "user_123",
  "weekStart": "2024-01-15",
  "weekEnd": "2024-01-19",
  "includeIntegrations": ["google_calendar", "todoist"]
}

// Response
{
  "operationId": "op_abc123",
  "status": "processing",
  "estimatedCompletionTime": "2024-01-19T14:05:00Z"
}
```

#### Update Reflection Preferences
`PUT /api/user/reflection-preferences`

```typescript
// Request
{
  "autoGenerate": true,
  "preferredDay": "friday",
  "preferredHour": 14,
  "timezone": "America/New_York",
  "includeIntegrations": ["google_calendar"],
  "notifyOnGeneration": true
}

// Response
{
  "success": true,
  "preferences": { ... }
}
```

## Environment-Specific Implementation

### Production (GCP)

1. **Cloud Scheduler Job**
   - Runs every hour
   - Triggers Cloud Run Job endpoint
   - Configured in Terraform

2. **Cloud Run Job**
   - Processes all eligible users
   - Parallel processing with Cloud Tasks
   - Auto-scales based on load

3. **Error Handling**
   - Automatic retries via Cloud Tasks
   - Dead letter queue for failed jobs
   - Alerting via Cloud Monitoring

### Development

1. **Local Scheduler**
   - Uses node-cron
   - Runs when dev server is active
   - Can be manually triggered

2. **Mock Data**
   - Uses existing mock integration data
   - Faster processing for testing
   - Predictable results

3. **Testing**
   ```bash
   # Manually trigger for current user
   curl -X POST http://localhost:3000/api/jobs/weekly-reflection \
     -H "Content-Type: application/json" \
     -d '{"userId": "1"}'
   
   # Test hourly checker
   npm run dev:scheduler:test
   ```

## Database Considerations

### No Schema Changes Required

The system uses existing tables:
- `User` - Stores preferences in `metadata` JSON field
- `WeeklySnippet` - Stores generated reflections as drafts
- `IntegrationConsolidation` - Stores consolidated data
- `AsyncOperation` - Tracks job progress

### Query Patterns

```sql
-- Find users to process this hour
SELECT * FROM users 
WHERE metadata->>'autoGenerate' = 'true'
  AND metadata->>'preferredHour' = '14'
  AND metadata->>'preferredDay' = 'friday';

-- Check if user already has reflection this week
SELECT * FROM weekly_snippets
WHERE user_id = ? 
  AND week_number = ?
  AND year = ?
  AND created_at > NOW() - INTERVAL '7 days';
```

## Context Enhancement

The system retrieves and uses previous context:

1. **Previous Week's Reflection**
   - Identifies ongoing projects
   - Maintains narrative continuity
   - Highlights progress on goals

2. **Recent Insights**
   - From performance assessments
   - From career check-ins
   - From manager feedback

3. **Career Guidelines**
   - User's role expectations
   - Current level requirements
   - Growth areas

## Manual Controls

Users maintain full control:

1. **Generate Now Button**
   - Triggers immediate generation
   - Bypasses scheduling preferences
   - Available in UI

2. **Edit Generated Reflections**
   - All reflections saved as drafts
   - Users can edit before finalizing
   - Can regenerate if needed

3. **Disable Automation**
   - Simple toggle in settings
   - Preserves preferences for later
   - No data loss

## Monitoring & Observability

### Key Metrics

- **Generation Success Rate**: % of successful generations
- **Average Generation Time**: Time from trigger to completion
- **User Engagement**: % of users editing generated reflections
- **Integration Failures**: Track which integrations fail most

### Logging

```typescript
// Structured logging for debugging
logger.info('Reflection generation started', {
  userId,
  weekNumber,
  integrations: ['google_calendar', 'todoist'],
  triggerType: 'scheduled' // or 'manual'
})
```

## Future Enhancements

### Phase 2 (Next Quarter)
- Smart timing based on user activity patterns
- Multiple reflection formats (brief, detailed, bullets)
- Team-level aggregated insights

### Phase 3 (Future)
- ML-based quality improvements from user edits
- Predictive content suggestions
- Cross-week pattern recognition

## Testing Strategy

### Unit Tests
- Timezone conversion logic
- Preference matching algorithm
- Context retrieval functions

### Integration Tests
- End-to-end reflection generation
- Mock integration data processing
- Error handling scenarios

### Manual Testing Checklist
- [ ] Test with different timezones
- [ ] Verify draft creation
- [ ] Test manual trigger
- [ ] Verify previous context inclusion
- [ ] Test with missing integrations
- [ ] Verify error notifications

## Rollout Plan

1. **Week 1**: Deploy to staging, test with team
2. **Week 2**: Beta with 5 volunteer users
3. **Week 3**: Enable for all users (opt-in)
4. **Week 4**: Make default for new users

## Security Considerations

- User data isolation enforced at all levels
- No cross-user data access in batch processing
- Encrypted storage of generated content
- Rate limiting on manual triggers
- Audit logging for all generations

## Support & Troubleshooting

### Common Issues

**Reflection not generating:**
1. Check user preferences enabled
2. Verify integrations connected
3. Check AsyncOperation status
4. Review error logs

**Wrong timing:**
1. Verify timezone setting
2. Check Cloud Scheduler configuration
3. Confirm user preferences

**Poor quality reflections:**
1. Check integration data availability
2. Verify consolidation completed
3. Review LLM prompt/response

### Debug Commands

```bash
# Check user's preferences
npm run user:preferences -- --userId=123

# Manually trigger reflection
npm run reflection:generate -- --userId=123

# Check job status
npm run job:status -- --operationId=op_abc123
```

---

Last Updated: January 2025
Version: 1.0.0