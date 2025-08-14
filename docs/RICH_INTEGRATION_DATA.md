# Rich Integration Data Migration Plan

## Overview
Migrate from basic Google Calendar mock data to Jack Thompson's rich dataset including meeting transcripts and Google Docs. This plan includes comprehensive testing strategy and documentation for long-term reference.

## Phase 1: Rich Data Loading Infrastructure

### Components
1. **Rich Integration Data Service** (`lib/rich-integration-data-service.ts`)
   - Load Jack's dataset from `data/mock-datasets/users/jack-thompson-oct-2024/`
   - Parse Google Calendar API v3, Meet API v2, and Docs API v1 formats
   - Provide week-based filtering (ISO weeks 40-44, 2024)
   - Handle missing data gracefully

2. **Data Models & Interfaces** 
   - `RichCalendarData` interface extending `WeeklyCalendarData`
   - Include `meetingTranscripts: MeetTranscript[]` and `meetingDocs: MeetingDoc[]`
   - Support data availability flags (`hasTranscripts`, `hasDocs`)

3. **User Detection Logic**
   - Detect Jack via email (`jack@company.com`) or dev user ID
   - Return rich data for Jack, empty/minimal for others

### Unit Tests
- `__tests__/rich-integration-data-service.test.ts`
  - Test data loading for each week (40-44, 2024)
  - Test week filtering and date range queries
  - Test missing data handling
  - Test transcript and doc parsing
  - Test Jack user detection logic

## Phase 2: Integration Service Enhancement

### Components
1. **Enhanced Calendar Integration** (`lib/calendar-integration.ts`)
   - Replace `generateJacksPreviousWeekData()` with rich data service
   - Include meeting transcripts and Google Docs in `WeeklyCalendarData`
   - Remove old Jack-specific mock generation (lines 305-456)

2. **Consolidation Prompt Updates** (`lib/consolidation-prompts/calendar-consolidation-prompt.ts`)
   - Extend prompt to include transcript excerpts and meeting notes
   - Structure data for optimal LLM processing
   - Maintain focus on career development insights

### Unit Tests
- `__tests__/enhanced-calendar-integration.test.ts`
  - Test rich data integration for Jack
  - Test transcript inclusion in calendar data
  - Test Google Docs integration
  - Test backwards compatibility for non-Jack users
- Update `__tests__/integration-consolidation.test.ts`
  - Test consolidation with rich data inputs
  - Verify transcript content in consolidation prompts
  - Test LLM response parsing with complex inputs

## Phase 3: Data Initialization & Seeding

### Components
1. **Rich Data Seeding Service** (`lib/rich-data-seeding-service.ts`)
   - Load Jack's 4-week dataset into database
   - Create `IntegrationData` records for each week (40-44, 2024)
   - Store calendar events, transcripts, and docs as structured JSON
   - Tag data with source (`jack-thompson-oct-2024`)

2. **Database Schema Extensions**
   - New `IntegrationData` model:
     ```prisma
     model IntegrationData {
       id          String   @id @default(cuid())
       userId      String
       weekNumber  Int
       year        Int
       integrationType String
       rawData     Json
       metadata    Json?
       createdAt   DateTime @default(now())
       user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
       @@unique([userId, weekNumber, year, integrationType])
     }
     ```

3. **Seeding Commands & Scripts**
   - `npm run seed:rich-data` - Load Jack's dataset into current environment
   - `npm run seed:rich-data:staging` - Initialize staging with rich data
   - Update `scripts/init-staging-environment.js` to include rich data loading
   - Add to `lib/data-seeding-service.ts` for unified seeding

### Unit Tests
- `__tests__/rich-data-seeding.test.ts`
  - Test database seeding with Jack's dataset
  - Test data integrity and structure validation
  - Test duplicate handling and updates
  - Test seeding rollback and cleanup
- `__tests__/integration-data-model.test.ts`
  - Test IntegrationData model CRUD operations
  - Test user-scoped data isolation
  - Test week-based querying

### Integration Tests  
- `__tests__/rich-data-seeding-integration.test.ts`
  - End-to-end seeding and retrieval
  - Test seeding across different environments
  - Validate data consistency after seeding

## Phase 4: API & Consolidation Integration

### Components
1. **API Route Updates**
   - `app/api/integrations/consolidate-onboarding/route.ts`: Use rich data service
   - `app/api/integrations/route.ts`: Show transcript/doc availability
   - Remove references to old mock data generation

2. **Enhanced Consolidation Processing**
   - Update `IntegrationConsolidationService` to handle transcript data
   - Include meeting conversation analysis in consolidation prompts
   - Generate more detailed evidence from rich context

### Unit Tests
- `__tests__/api/consolidate-onboarding-rich.test.ts`
  - Test API with rich data for Jack
  - Test consolidation with transcript data
  - Test response format with rich data indicators
- Update existing API tests to handle rich data scenarios

### Integration Tests
- `__tests__/rich-data-consolidation-e2e.test.ts`
  - Full flow: data loading → consolidation → reflection generation
  - Test Jack's 4-week progression consolidation
  - Validate consolidation quality with rich inputs

## Testing Strategy

### Test Categories

1. **Unit Tests (Fast)**
   - Data loading and parsing logic
   - User detection and filtering
   - Individual service methods
   - Mock data transformation

2. **Integration Tests (Medium)**
   - Database seeding and retrieval
   - API endpoints with rich data
   - Service interactions

3. **End-to-End Tests (Slow)**
   - Complete consolidation workflow with rich data
   - Multi-week data processing
   - Quality validation of LLM outputs

### Test Data Strategy
- Use subset of Jack's data for unit tests (week 40 only)
- Use full 4-week dataset for integration tests
- Create test-specific data variants for edge cases

### Performance Testing
- Measure rich data loading times
- Test consolidation processing with large transcript inputs
- Validate memory usage with full dataset

## Documentation Plan

### New Documentation Files

1. **`docs/RICH_INTEGRATION_DATA.md`** - This implementation plan
   - Architecture overview
   - Phase-by-phase implementation details
   - Testing strategy and test locations
   - Data initialization procedures
   - Future enhancement roadmap

2. **`docs/data-generation/JACK_DATASET_USAGE.md`**
   - How to use Jack's rich dataset
   - Data structure and format explanations
   - Integration with development workflow
   - Troubleshooting common issues

3. **`docs/TESTING_RICH_INTEGRATIONS.md`**
   - Test execution procedures
   - Data setup for testing
   - Expected test outcomes and validation
   - Performance benchmarks

### Updated Documentation
- Update `docs/DEVELOPMENT.md` with new seeding commands
- Update `docs/ARCHITECTURE.md` with rich data flow diagrams
- Update `CLAUDE.md` with new npm scripts

## Key Files Summary

### New Files Created
- `lib/rich-integration-data-service.ts` - Core rich data loading
- `lib/rich-data-seeding-service.ts` - Database seeding logic
- `scripts/seed-rich-data.js` - Seeding command script
- `docs/RICH_INTEGRATION_DATA.md` - This implementation plan
- 8+ new test files for comprehensive coverage

### Modified Files
- `lib/calendar-integration.ts` - Enhanced data source integration
- `lib/consolidation-prompts/calendar-consolidation-prompt.ts` - Rich context prompts
- `lib/data-seeding-service.ts` - Include rich data in unified seeding
- `scripts/init-staging-environment.js` - Add rich data loading
- `prisma/schema.prisma` - Add `IntegrationData` model
- `app/api/integrations/consolidate-onboarding/route.ts` - Use rich data service
- `package.json` - Add new npm scripts

### Removed Code
- Old Jack mock data generation in `calendar-integration.ts` (lines 305-456)
- References to simple mock data in integration routes

## Success Metrics

1. **Data Quality**: Jack's onboarding shows realistic 4-week workplace progression
2. **Consolidation Quality**: LLM generates detailed insights from transcript data  
3. **Performance**: Rich data loading < 2 seconds, consolidation < 30 seconds
4. **Test Coverage**: >90% coverage for new rich data services
5. **Development Experience**: Seamless rich data in dev/staging environments

## Implementation Status

### Completed
- [x] Documentation and planning
- [ ] Phase 1: Rich Data Loading Infrastructure
- [ ] Phase 2: Integration Service Enhancement  
- [ ] Phase 3: Data Initialization & Seeding
- [ ] Phase 4: API & Consolidation Integration
- [ ] Comprehensive Testing Suite

### Current Focus
Starting with Phase 1 implementation, focusing on:
1. Creating rich integration data service
2. Defining data models and interfaces
3. Implementing Jack user detection logic
4. Building unit tests for data loading

This plan ensures comprehensive migration to rich mock data while maintaining system reliability and providing clear documentation for future development.