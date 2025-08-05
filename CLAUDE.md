# Claude Code Instructions

## System Overview
**AdvanceWeekly**: Next.js app for weekly accomplishments with AI-powered career assessments.
**Stack**: Next.js 14, TypeScript, Tailwind, PostgreSQL/Prisma, NextAuth, GCP

## Development Flow

### 🚀 Quick Start
```bash
npm run dev                 # Start development (auto-generates schema)
npm run check:dev          # Quick validation before commit (~5s, includes API tests)
npm run test               # Run all tests before push
```

### 🔧 Common Tasks
```bash
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
|---------|------------|------------|
| Database | PostgreSQL (Docker) | Cloud SQL |
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
- For any mock behavior that would connect to a database or remote service in production:
  * Abstract the interface between production and dev environments
  * Always fetch data from the back-end 
  * Maintain consistent data retrieval behavior across different environments
  * Avoid using static mock content from the front-end
  * Minimize potential environment-specific bugs by keeping data fetching consistent

## Observations and Insights
- Dev server PostgreSQL configuration:
  * Noted that dev server is NOT using a local Docker-initialized PostgreSQL server
  * This deviates from the expected setup where dev and prod environments should have consistent data interface to prevent deployment errors

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

---
**Full Details**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) • [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)