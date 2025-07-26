# Claude Code Instructions

## System Overview

**AdvanceWeekly**: Next.js app for tracking weekly accomplishments with AI-powered performance assessments.

**Core Flow**: Users write weekly snippets → System collects data from integrations (Calendar/Todoist/GitHub) → LLM generates insights → Performance assessments created from accumulated data.

**Tech Stack**: Next.js 14, TypeScript, Tailwind CSS, PostgreSQL/Prisma, NextAuth, Google Cloud Platform

## Critical Rules

1. **Dev Server Must Work**: ALWAYS verify `npm run dev` works before pushing code
2. **Follow Existing Patterns**: Look at neighboring files before creating new code
3. **Never Work on Main**: Create feature branches: `feat/`, `fix/`, `docs/`, `refactor/`
4. **No Over-Engineering**: Build only what's needed now, not future possibilities
5. **Respect File Structure**: Edit existing files rather than creating new ones when possible

## Architecture Summary

**Key Components**:
- `AuthenticatedApp.tsx` - Main app orchestrator with tabs for Snippets and Performance
- `lib/user-scoped-data.ts` - Data access layer ensuring user isolation
- `lib/calendar-integration.ts` - Google Calendar data extraction for career context
- `app/api/` - NextAuth, snippets, assessments, and integration endpoints

**Environment Differences**:
| Feature | Development | Production |
|---------|------------|------------|
| Database | PostgreSQL (Docker) | Cloud SQL |
| Auth | Mock users (localStorage) | Google OAuth |
| LLM | Local/Mock | OpenAI API |
| Integrations | Mock data | Real OAuth |

## Quick Reference

- **Full Architecture**: See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for detailed system design
- **Design System**: See [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) for styling rules
- **Testing**: Run `node run-basic-tests.js` before commits

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

## Before Pushing Code

```bash
npm run dev                  # Verify it starts
node run-basic-tests.js     # Run tests
npm run lint                # Check linting
```

## Common Mistakes to Avoid

- Creating unnecessary abstractions or base classes
- Adding features not explicitly requested
- Storing sensitive data (tokens) in JWT
- Creating new files when existing ones can be edited
- Working directly on main branch after PR merge