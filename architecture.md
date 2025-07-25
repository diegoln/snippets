# AdvanceWeekly System Architecture

## Overview

AdvanceWeekly is a Next.js application that helps professionals track their weekly accomplishments and generate AI-powered performance assessments. The system combines manual snippet creation with automated data collection from third-party tools, processing everything through LLM analysis to provide meaningful career insights.

## Development Server Architecture

### What is the Dev Server?

The **development server** is the cornerstone of AdvanceWeekly's development workflow, running locally on `http://localhost:3000` via `npm run dev`. It provides a complete working environment that mirrors production functionality while using simplified authentication and local data storage.

### Dev vs Production Environment Matrix

| Feature | Development Server | Production |
|---------|-------------------|------------|
| **Port** | 3000 (configurable) | Cloud Run managed |
| **Database** | SQLite (dev.db) | PostgreSQL (Cloud SQL) |
| **Authentication** | Mock users (localStorage) | Google OAuth (NextAuth) |
| **Build** | Development (unoptimized) | Production (optimized) |
| **Errors** | Detailed with stack traces | User-friendly messages |
| **Integrations** | Mock data / Disabled | Live OAuth connections |
| **LLM Processing** | Local model (Ollama) | OpenAI API |
| **Session Storage** | localStorage | Database sessions |

## System Architecture Diagram

![System Architecture](docs/architecture-diagram.svg)

The diagram illustrates the layered architecture with clear separation between:
- **User Interface Layer**: Landing page, snippets, performance assessments, and integration management
- **Authentication Layer**: Environment-aware auth with NextAuth supporting both mock and Google OAuth
- **API Layer**: RESTful endpoints for all system operations including scheduled processing
- **Data Storage**: Dual database support (SQLite dev, PostgreSQL prod)
- **Integration Services**: Third-party connections to Google Calendar, Todoist, and GitHub
- **AI Processing**: Environment-aware LLM integration (local models for dev, OpenAI for production)
- **Scheduled Processing**: GCP-based batch jobs for weekly data collection and analysis

## Integration System Architecture

### Scheduled Data Collection Flow

The system implements a weekly batch processing pipeline that:

1. **Cloud Scheduler** triggers data collection every Monday at 9:00 AM
2. **Cloud Run Jobs** execute the data processing pipeline
3. **Integration Collectors** gather data from each user's connected services
4. **Data Aggregator** combines and processes the collected information
5. **LLM Processor** generates insights and recommendations using AI analysis
6. **Database Storage** persists both raw data and processed insights

## Core Components

### AuthenticatedApp.tsx (Main Application)

The central React component that orchestrates the entire user experience:

**Key Features:**
- **Tab-based Navigation**: Weekly Snippets vs Performance Assessments
- **Snippet Management**: CRUD operations with Markdown support
- **Assessment Generation**: AI-powered performance draft creation
- **Settings Integration**: User profile and integration management
- **Pagination**: Efficient handling of large snippet collections

**State Management:**
- useReducer for complex assessment operations
- useState for UI state and snippet data
- Custom hooks for authentication and data fetching

### Authentication System

**Environment-Aware Design:**
- **Development**: Mock authentication with localStorage persistence
- **Production**: Google OAuth with NextAuth and database sessions

**Session Management:**
- Development: JWT strategy with localStorage persistence
- Production: Database sessions with Prisma adapter

### Database Schema

```sql
-- Core Models
User {
  id, name, email, image
  jobTitle, seniorityLevel
  performanceFeedback, careerLadderFile
  integrations[]
  snippets[]
  assessments[]
}

WeeklySnippet {
  id, userId, weekNumber, startDate, endDate
  content                    -- User-written content
  extractedTasks            -- JSON from integrations
  extractedMeetings         -- JSON from integrations  
  aiSuggestions            -- AI-generated recommendations
}

Integration {
  id, userId, type          -- "google_calendar", "todoist", "github"
  accessToken, refreshToken -- Encrypted OAuth tokens
  expiresAt, isActive
  metadata                  -- JSON config per integration
  lastSyncAt
}

IntegrationData {
  id, userId, integrationType
  weekNumber, year, dataType -- "tasks", "meetings", "commits"
  rawData                   -- Original API response
  processedData            -- Cleaned/transformed data
}

PerformanceAssessment {
  id, userId, cycleName
  startDate, endDate
  generatedDraft           -- AI-generated self-assessment
}
```

### LLM Integration (llmproxy.ts)

**Environment-Aware AI Processing:**

**Development Environment:**
- **Local LLM**: Uses Ollama or similar local model for testing
- **Fast Iteration**: Quick responses without API costs
- **Offline Development**: Works without internet connection
- **Mock Responses**: Predictable outputs for testing

**Production Environment:**
- **OpenAI API Gateway**: Single point for all LLM requests
- **Request Management**: Rate limiting, retry logic, queuing
- **Response Processing**: Standardized output formatting
- **Cost Optimization**: Intelligent caching and token management

**Usage Patterns:**
```typescript
// Performance assessment generation
const assessmentDraft = await llmProxy.generateAssessment({
  snippets: userSnippets,
  feedback: userFeedback,
  careerLadder: careerLadderDoc
});

// Integration data analysis
const weeklyInsights = await llmProxy.analyzeWeeklyData({
  meetings: calendarData,
  tasks: todoistData,
  commits: githubData
});
```

### Integration Framework

**Base Integration Architecture:**
```typescript
abstract class BaseIntegration {
  abstract authenticate(): Promise<AuthResult>;
  abstract fetchWeeklyData(weekStart: Date): Promise<IntegrationData>;
  abstract refreshTokens(): Promise<void>;
}

class GoogleCalendarIntegration extends BaseIntegration {
  async fetchWeeklyData(weekStart: Date) {
    // Fetch meetings, events, calendar data
    // Transform to standard format
    // Store in integration_data table
  }
}

class TodoistIntegration extends BaseIntegration {
  async fetchWeeklyData(weekStart: Date) {
    // Fetch completed/pending tasks
    // Extract project and label information
    // Store in integration_data table
  }
}

class GitHubIntegration extends BaseIntegration {
  async fetchWeeklyData(weekStart: Date) {
    // Fetch commits, PRs, issues
    // Extract repository and contribution data
    // Store in integration_data table
  }
}
```

## GCP Production Deployment

### Infrastructure Components

**Cloud Run Services:**
- **Main Application**: Next.js app with auto-scaling (0-10 instances)
- **Scheduled Jobs**: Weekly data collection processors
- **Memory/CPU**: 1GB RAM, 1 CPU per instance

**Cloud SQL PostgreSQL:**
- **Instance**: db-f1-micro (cost-optimized for 50 users)
- **Storage**: 10GB SSD with auto-resize
- **Backups**: Daily automated backups at 3:00 AM
- **Maintenance**: Sunday 4:00 AM window

**Secret Manager:**
- **Database credentials**: Connection string with Unix socket format
- **OAuth secrets**: Google Client ID/Secret, NextAuth secret
- **API keys**: OpenAI API key, integration API keys
- **Encryption keys**: For token encryption/decryption

**Cloud Build Pipeline:**
```yaml
# Automated deployment on git push
1. Build multi-stage Docker image
2. Push to Artifact Registry
3. Deploy to Cloud Run with:
   - Database connection via Cloud SQL Proxy
   - Secrets injection via Secret Manager
   - Auto-scaling configuration
```

### Cost Structure (50 users)

**Monthly Estimates:**
- **Cloud Run**: $5-10 (request-based pricing)
- **Cloud SQL**: $7 (db-f1-micro instance)
- **Secret Manager**: $1 (secret access)
- **Storage**: $2 (database + images)
- **Cloud Build**: $2 (automated deployments)
- **Integration APIs**: Variable (Google/Todoist quotas)
- **Total**: ~$17-25/month

## Data Flow Architecture

### User Interaction Flow
1. **Authentication**: User signs in via Google OAuth (prod) or mock selection (dev)
2. **Dashboard Access**: Route to weekly snippets or performance assessments
3. **Snippet Management**: Create/edit weekly summaries with Markdown support
4. **Integration Setup**: Connect third-party accounts via OAuth flows
5. **Automated Collection**: Background jobs gather integration data weekly
6. **AI Processing**: LLM analyzes collected data and generates insights
7. **Recommendation Display**: AI suggestions appear in snippet interface

### Weekly Processing Flow
1. **Trigger**: Cloud Scheduler initiates weekly data collection (Mondays 9 AM)
2. **User Iteration**: Process each user with active integrations
3. **Data Collection**: Parallel API calls to Google Calendar, Todoist, GitHub
4. **Data Storage**: Raw responses stored in integration_data table
5. **Data Processing**: Clean, transform, and aggregate collected data
6. **LLM Analysis**: Send aggregated data to OpenAI for insight generation
7. **Result Storage**: Update weekly_snippets with AI recommendations
8. **Error Handling**: Retry failed operations, log issues for investigation

## Security & Privacy

### Data Protection
- **Token Encryption**: All OAuth tokens encrypted before database storage
- **API Security**: Rate limiting and authentication on all endpoints
- **Data Retention**: Auto-delete integration data after 90 days
- **User Consent**: Clear permission flows for each integration

### GCP Security Features
- **IAM Roles**: Minimal service account permissions
- **VPC Integration**: Private database connections via Cloud SQL Proxy
- **Secret Management**: No hardcoded credentials, all via Secret Manager
- **HTTPS Enforcement**: TLS 1.2+ for all communications

## Technology Stack Summary

**Frontend Framework**: Next.js 14 with App Router
**Language**: TypeScript throughout
**Styling**: Tailwind CSS with custom design system
**Authentication**: NextAuth.js with Google OAuth
**Database**: PostgreSQL (prod) / SQLite (dev) via Prisma ORM
**Cloud Platform**: Google Cloud Platform
**Container Runtime**: Cloud Run with Docker
**AI Integration**: OpenAI API (prod) / Local LLM (dev) via custom proxy
**External APIs**: Google Calendar, Todoist, GitHub
**Infrastructure**: Terraform for GCP resource management
**CI/CD**: Cloud Build with automated deployments
**Monitoring**: Built-in GCP logging and metrics