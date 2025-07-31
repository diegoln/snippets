# Claude Code Instructions

## System Overview

**AdvanceWeekly**: Next.js app for tracking weekly accomplishments with AI-powered performance assessments.

**Core Flow**: Users write Friday Reflections → System collects data from integrations (Calendar/Todoist/GitHub) → LLM generates insights → Career Check-Ins created from accumulated data.

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

**IMPORTANT: Git hooks are now enforced to prevent broken code from being committed or pushed.**

### Automatic Checks (via Git Hooks)
- **Pre-commit**: Runs TypeScript compilation, linting, and tests
- **Pre-push**: Additional build verification for main branch

### Manual Deployment
```bash
npm run deploy              # Full deployment with all checks
```

### Manual Checks (by context)

#### Quick Development Validation ⚡
```bash
npm run typecheck:quick     # ⚡ Fast: Only modified files (~2-5 seconds)
npm run lint                # ESLint check
node run-basic-tests.js     # Run tests
```

#### Comprehensive Pre-Deployment Checks 🔍
```bash
npm run typecheck           # 🐌 Full project check (~2+ minutes)
npm run build               # Production build
npm run lint                # ESLint check
```

#### Smart Check Commands (Recommended)
```bash
npm run check:dev           # ⚡ Quick: typecheck:quick + lint (~5-10s)
npm run check:pr            # 🔍 PR: typecheck:quick + lint + tests (~10-20s)  
npm run check:full          # 🐌 Full: typecheck + lint + tests + build (~2+ min)
npm run check [context]     # 🤖 Context-aware: dev|pr|full|ci
npm run show-checks         # 📋 Show all available validation scripts
```

#### Available TypeScript Check Options
| Script | Speed | Use Case | Duration |
|--------|-------|----------|----------|
| `typecheck:quick` | ⚡ Fastest | Development, PR review | ~2-5s |
| `typecheck:fast` | 🚀 Fast | Pre-commit validation | ~10-30s |
| `typecheck` | 🐌 Comprehensive | CI, pre-deployment | ~2+ min |

## Common Mistakes to Avoid

- Creating unnecessary abstractions or base classes
- Adding features not explicitly requested
- Storing sensitive data (tokens) in JWT
- Creating new files when existing ones can be edited
- Working directly on main branch after PR merge