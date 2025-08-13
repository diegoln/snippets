# AdvanceWeekly

A Next.js application that helps professionals create Friday Reflections and AI-powered Career Check-Ins with intelligent context extraction from integrated tools.

**Stack**: Next.js 14, TypeScript, Tailwind CSS, PostgreSQL/Prisma, NextAuth, Google Cloud Platform

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd advanceweekly
npm install

# Start dev server (auto-generates schema)
npm run dev

# Open http://localhost:3000
```

## 🔧 Development Commands

```bash
npm run dev                 # Start development server
npm run check:dev          # Quick validation (~5s, includes API tests)
npm run test               # Run all tests
npm run build              # Production build
npm run deploy             # Deploy to production
```

## 📚 Documentation

### Getting Started
- [Development Setup](./docs/DEVELOPMENT.md) - Local development environment
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and technical details
- [Design System](./docs/DESIGN_SYSTEM.md) - UI/UX guidelines and components

### Operations
- [Testing Guide](./docs/TESTING.md) - Running and writing tests  
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment
- [OAuth Setup](./docs/OAUTH_SETUP.md) - Authentication configuration
- [Database Setup](./docs/DATABASE_SETUP.md) - Database configuration

## ✨ Features

### 📝 Weekly Reflections
- Create structured Friday Reflections to document accomplishments
- Smart snippet management with year-aware organization  
- Markdown support for rich formatting

### 🚀 Career Development
- AI-powered Career Check-Ins with personalized guidance
- Seniority-aware suggestions for demonstrating impact
- Career ladder alignment and promotion readiness tracking

### 🔗 Integration Platform
- **Google Calendar**: Extract meeting insights and action items
- **Todo Applications**: Track completed tasks and project progress  
- **GitHub**: Analyze code contributions and project activity
- **Extensible Architecture**: Easy to add new integrations

### 🤖 AI-Powered Insights
- Generate performance review drafts from weekly data
- Personalized career development recommendations
- Context-aware reflection suggestions

## 🏗️ Architecture

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Authentication**: NextAuth with Google OAuth
- **Database**: PostgreSQL (production) / SQLite (development)
- **AI**: OpenAI API integration with local fallbacks
- **Infrastructure**: Google Cloud Platform (Cloud Run, Cloud SQL)
- **Environment Management**: Automatic schema generation for dev/prod# Trigger deployment with Secret Manager permissions fix
# Trigger deployment with Cloud SQL permissions granted
