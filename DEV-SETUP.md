# Development Environment Setup

This guide explains how to set up the development environment with realistic test data.

## Quick Start

1. **Start the services:**
   ```bash
   docker compose up -d
   ```

2. **Initialize development data:**
   ```bash
   npm run setup:dev
   ```

3. **Access the application:**
   - App: http://localhost:3000
   - Database Studio: http://localhost:5555 (run `npm run db:studio`)

## What Gets Created

The development setup automatically creates:

### Test User
- **Email**: `test@example.com`
- **Name**: Test User
- **Role**: Senior Software Engineer
- **Seniority Level**: Senior
- **Previous Feedback**: "Continue focusing on technical leadership and cross-team collaboration. Strong technical execution and mentoring contributions noted."

### Weekly Snippets (26 weeks / 6 months)
- **Date Range**: July 22, 2024 to January 17, 2025
- **Format**: Each snippet follows this structure:
  ```
  Done
  - Completed user authentication system with OAuth integration and role-based access control
  - Optimized database queries reducing response time by 40% across core API endpoints
  - Led technical design review session for the new microservices architecture proposal

  Next
  - Begin implementation of the new dashboard analytics feature for Q1 release
  - Continue working on API documentation and developer portal improvements
  - Start security penetration testing for the payment processing system
  ```
- **Content**: Realistic software engineering activities covering:
  - Technical implementations and optimizations
  - Leadership and mentoring activities  
  - Cross-team collaboration
  - System architecture and design
  - Code quality and testing initiatives
  - Performance improvements and bug fixes

## Environment-Specific Behavior

### Development Environment
- Automatically seeds with 6 months of test data
- Uses realistic engineering activities and accomplishments
- Creates sample user for immediate testing
- Perfect for testing LLM performance assessment generation

### Production Environment
- **No automatic seeding** - starts with completely blank history
- Users must create their own accounts and snippets
- Ensures clean production deployment

## Commands

| Command | Description |
|---------|-------------|
| `npm run setup:dev` | Initialize development environment with test data |
| `npm run db:seed:dev` | Seed database (development only) |
| `npm run db:studio` | Open database management interface |
| `docker compose up -d` | Start all services (PostgreSQL, Ollama, App) |

## Testing LLM Integration

After setup, you can immediately test the performance assessment feature:

1. Go to http://localhost:3000
2. Sign in as the test user
3. Navigate to Performance Assessments
4. Click "Generate Assessment" 
5. Fill in cycle details (e.g., "H1 2025", dates from last 6 months)
6. The LLM will generate a professional assessment based on the 26 weeks of realistic snippet data

## Database Schema

The system uses PostgreSQL with these main entities:
- **Users**: Profile information, job titles, seniority levels
- **WeeklySnippets**: Done/Next format snippets with date ranges  
- **PerformanceAssessments**: AI-generated assessment drafts
- **Integrations**: Third-party service connections

## Local LLM (SmolLM2)

The development environment includes a local LLM for performance assessment generation:
- **Model**: SmolLM2 1.7B (1.8GB)
- **Performance**: ~15 tokens/second
- **API**: Ollama serving at http://localhost:11434
- **No external API costs** - completely local inference

## Troubleshooting

**Database Connection Issues:**
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Reset database 
docker compose down postgres
docker compose up -d postgres
npm run setup:dev
```

**LLM Issues:**
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Restart Ollama service
docker compose restart ollama
```

**Clean Restart:**
```bash
docker compose down
docker compose up -d
npm run setup:dev
```