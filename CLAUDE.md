# Claude Code Instructions

## System Overview
**AdvanceWeekly**: Next.js app for weekly accomplishments with AI-powered career assessments.
**Stack**: Next.js 14, TypeScript, Tailwind, PostgreSQL/Prisma, NextAuth, GCP

## User Problems & Pain Points

### 👩‍💻 Individual Contributor — living the weekly blur
Most weeks feel like a sprint through a maze that keeps redrawing itself: stand-ups spawn follow-up huddles, a single prod bug swallows an afternoon, and priority lists reshuffle faster than Jira updates. Heads-down focus ships work, but the company's career ladder sits offstage, written in a language—scope, breadth, cross-team influence—that rarely intersects today's bug queue.

Then review season hits and the conversation flips overnight. Yesterday was throughput; today is "evidence of strategic influence." ICs must translate months of adrenaline-driven tasks into rubric-ready prose. Colleagues who can rapidly excavate and reframe their wins look brilliant; everyone else scours calendars and Slack threads, playing frantic historian. The result is a jarring mode-switch that leaves even strong performers wondering if promotion hinges more on narrative skill than on steady impact.

### 👩‍🏫 Manager — steering the ship while judging the voyage
Org charts are flattening; AI tools expand surface area; spans of control keep widening. You're juggling incidents, unblocking dependencies, and answering executive timeline pings while also coaching a dozen ICs. Raw work signals scatter across GitHub, Jira, Confluence, Figma—enough to trust delivery, not enough to chart growth.

Calibration week arrives: self-reviews range from minimalist bullets to epic manifestos. Quiet high-performers submit three lines; eloquent mid-levels submit novellas. You cross-reference claims against fragmented artifacts, translating ladder jargon on a deadline. With fewer middle leads, your insight fidelity thins and the risk grows that narrative skill outweighs genuine impact. What you need is a lightweight, continuous bridge between everyday sprint work and long-term development—one that surfaces coaching signals without stealing cycles from the delivery grind you're measured on every sprint.

**Development Priority**: Always consider how features serve these core pain points—reducing the narrative burden on ICs and giving managers continuous visibility into growth patterns.

## Development Flow

### 🚀 Quick Start
```bash
npm run dev                 # Start development (auto-generates schema)
npm run check:dev          # Quick validation before commit (~5s)
node run-basic-tests.js    # Run tests before push
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

---
**Full Details**: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) • [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md)