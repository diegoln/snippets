# Development Environment Setup

This guide covers setting up and running AdvanceWeekly locally for development.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone git@github.com:diegoln/snippets.git
   cd thirdaw
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start Docker services:**
   ```bash
   docker compose up -d
   ```
   This starts PostgreSQL and Ollama (local LLM) services.

4. **Create environment file:**
   ```bash
   cp .env.example .env
   # Or create manually with:
   ```
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/snippets_db?schema=public"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   ```

5. **Initialize database with test data:**
   ```bash
   npm run setup:dev
   ```

6. **Start development server:**
   ```bash
   npm run dev
   ```

7. **Access the application:**
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
- **Format**: Each snippet follows Done/Next structure
- **Content**: Realistic software engineering activities covering:
  - Technical implementations and optimizations
  - Leadership and mentoring activities
  - Cross-team collaboration
  - System architecture and design
  - Code quality and testing initiatives
  - Performance improvements and bug fixes

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3000) |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run with coverage report |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run setup:dev` | Initialize development environment with test data |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed:dev` | Seed database (development only) |
| `npm run db:studio` | Open database management interface |
| `docker compose up -d` | Start all services (PostgreSQL, Ollama, App) |
| `docker compose down` | Stop all services |

## Environment-Specific Behavior

### Development Environment
- Uses mock authentication (no Google OAuth required)
- Automatically seeds with 6 months of test data
- Local LLM (SmolLM2) for AI features
- Hot module replacement enabled
- Detailed error messages

### Production Environment
- Google OAuth authentication
- No automatic data seeding
- OpenAI API for AI features
- Optimized builds
- Error tracking and monitoring

## Database Management

The system uses PostgreSQL with Prisma ORM:

### Schema Overview
- **Users**: Profile information, job titles, seniority levels
- **WeeklySnippets**: Done/Next format snippets with date ranges
- **PerformanceAssessments**: AI-generated assessment drafts
- **Integrations**: Third-party service connections

### Common Database Commands
```bash
# Push schema changes to database
npm run db:push

# Generate Prisma client after schema changes
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Open Prisma Studio for visual DB management
npm run db:studio

# Reset database (WARNING: deletes all data)
docker compose down postgres
docker compose up -d postgres
npm run setup:dev
```

## Local LLM Integration

Development uses SmolLM2 via Ollama:
- **Model**: SmolLM2 1.7B (1.8GB download)
- **Performance**: ~15 tokens/second
- **API**: http://localhost:11434
- **No external API costs**

Check LLM status:
```bash
curl http://localhost:11434/api/tags
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- AuthenticatedApp.test.tsx

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Categories
- **Unit Tests**: Component and utility function tests
- **Integration Tests**: API route and database interaction tests
- **E2E Tests**: Full user flow tests (if applicable)

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker compose ps postgres

# View PostgreSQL logs
docker compose logs postgres

# Reset database
docker compose down postgres
docker compose up -d postgres
npm run setup:dev
```

### LLM Issues
```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# View Ollama logs
docker compose logs ollama

# Restart Ollama service
docker compose restart ollama

# Manually pull model if needed
docker compose exec ollama ollama pull smollm2:1.7b
```

### Port Conflicts
- Development server uses port 3000
- PostgreSQL uses port 5432
- Ollama uses port 11434

If ports are in use:
```bash
# Find process using port
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Use different port
PORT=3001 npm run dev
```

### Clean Restart
```bash
# Stop all services
docker compose down

# Remove volumes (WARNING: deletes all data)
docker compose down -v

# Start fresh
docker compose up -d
npm run setup:dev
npm run dev
```

### Common Errors

**"next: not found"**
```bash
rm -rf node_modules package-lock.json
npm install
```

**"Cannot find module '@prisma/client'"**
```bash
npm run db:generate
```

**"Database connection failed"**
- Ensure Docker is running
- Check DATABASE_URL in .env
- Verify PostgreSQL container is healthy

## Production Build Testing

Test production build locally:
```bash
# Build production bundle
npm run build

# Start production server
npm start
```

Or use Docker:
```bash
# Build Docker image
docker build -t advanceweekly .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="your-db-url" \
  -e NEXTAUTH_SECRET="your-secret" \
  advanceweekly
```

## Code Style and Quality

Before committing:
```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck

# Run tests
npm test

# Or run all checks
npm run lint && npm run typecheck && npm test
```

## Additional Resources

- [Architecture Overview](./ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Design System](./DESIGN_SYSTEM.md)