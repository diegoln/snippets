# Claude Code Instructions

## System Overview
**AdvanceWeekly**: Next.js app for weekly accomplishments with AI-powered career assessments.
**Stack**: Next.js 14, TypeScript, Tailwind, PostgreSQL/Prisma, NextAuth, GCP

## Development Flow

### 🚀 Quick Start
```bash
npm run dev                # Start development (auto-starts PostgreSQL)
npm run check:dev          # Quick validation before commit (~5s)
```

**First time setup:**
```bash
npm run dev:db:start       # Start PostgreSQL container (if not already running)
npm run dev                # Initialize and start development
```

### 🔧 Common Tasks
```bash
# Database management
npm run dev:db:start          # Start local PostgreSQL container
npm run dev:db:stop           # Stop local PostgreSQL container  
npm run dev:db:reset          # Reset PostgreSQL data (destructive)

# Development
npm run generate-schema:force  # Fix Prisma issues
npm run db:studio             # Open database browser
npm run deploy               # Deploy to production
```

### 🛡️ Before Committing
Git hooks automatically run checks, but for manual validation:
- **Development**: `npm run check:dev` (5s)
- **Pull Request**: `npm run check:pr` (20s) 
- **Pre-Deploy**: `npm run check:full` (2+ min)

## Critical Rules
1. **Dev Server Must Work**: Always verify `npm run dev` works
2. **Follow Patterns**: Check neighboring files before creating new code
3. **Feature Branches**: Create branches off main for all changes
4. **Edit > Create**: Prefer editing existing files over creating new ones

## Architecture Quick Reference
- **Main App**: `AuthenticatedApp.tsx` - Tab orchestrator
- **Data Layer**: `lib/user-scoped-data.ts` - User isolation
- **APIs**: `app/api/` - NextAuth, snippets, assessments
- **Components**: Follow existing patterns in neighboring files

## Environment Context
| Feature | Development | Production |
|---------|-------------|------------|
| Database | PostgreSQL (Docker) | Cloud SQL |
| Schema | ✅ Matches production | PostgreSQL |
| Data | Rich mock data | Real user data |
| Auth | Mock (localStorage) | Google OAuth |
| LLM | Mock/Local | OpenAI API |

## Component Pattern
```typescript
'use client' // Only when needed

interface ComponentProps {
  // Document all props
}

export function ComponentName({ props }: ComponentProps): JSX.Element {
  // Implementation
}
```

## Development Best Practices
- **PostgreSQL Development**: Use `npm run dev` for production-like development
  * Prevents schema drift between environments
  * Same data types (Json vs String) as production
  * Consistent query behavior and constraints
  * Rich mock data matching staging patterns
- For any mock behavior that would connect to a database or remote service in production:
  * Abstract the interface between production and dev environments
  * Always fetch data from the back-end 
  * Maintain consistent data retrieval behavior across different environments
  * Avoid using static mock content from the front-end
  * Minimize potential environment-specific bugs by keeping data fetching consistent

## Schema Generation & Environment Parity
- **Unified PostgreSQL**: All environments use PostgreSQL with identical schema
- **Maximum Code Reuse**: Same Prisma models, same business logic, same API contracts
- **Zero Environment-Specific Code**: Database abstraction handled entirely at the Prisma layer
- **Unified Seeding Service**: Single reusable function seeds both development and staging
- **Clean Development Start**: No pre-created reflections, start with a fresh workspace

## Error Handling and Quality Assurance
- For every bug found, implement tests that would have caught them and add the tests to the development routine

## PR and Code Review Workflow
- Whenever a PR is requested, follow this workflow:
  * Create the PR automatically
  * Wait for Claude bot to review the PR in GitHub
  * Address all comments and feedback from the review
  * Once the PR is fully approved, merge the changes

## Development Reminders
- Always check and wait for dev server to be healthy when you run it.

## LLM Integration Rules
- llmproxy should never answer with mock responses. Always request from gemini.

---
**Full Details**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) • [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)
- the way to request gemini for a code review is to comment /gemini review on the pr