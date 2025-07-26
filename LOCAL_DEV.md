# Local Development Setup

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   ```bash
   npm run db:push  # Push schema to local SQLite
   npm run db:generate  # Generate Prisma client
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at http://localhost:3000

## Database Setup (PostgreSQL via Docker)

**IMPORTANT**: This project uses PostgreSQL for both development and production to maintain consistency.

1. **Start PostgreSQL Database**
   ```bash
   docker-compose up -d postgres
   ```

2. **Setup Database Schema**
   ```bash
   npm run db:push  # Push schema to PostgreSQL
   npm run db:generate  # Generate Prisma client
   ```

## Environment Configuration

Create a `.env` file:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/snippets_db?schema=public"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Development vs Production

- **Local**: Uses PostgreSQL via Docker (`docker-compose up -d postgres`)
- **Production**: Uses PostgreSQL on Google Cloud SQL
- **Docker**: Multi-stage build optimized for Cloud Run

## Common Issues

### "next: not found" error
If you see this error, try:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port conflicts
The dev server uses port 3000 by default. Production uses port 8080.

### Database issues
For development, ensure PostgreSQL is running via Docker:
```bash
docker-compose up -d postgres  # Start PostgreSQL
npm run db:push               # Sync schema
```

### PostgreSQL connection issues
If you can't connect to PostgreSQL:
1. Check if Docker is running: `docker ps`
2. Verify PostgreSQL container is up: `docker-compose ps`
3. Restart if needed: `docker-compose restart postgres`

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

## Production Build Testing

To test the production build locally:
```bash
npm run build
npm start
```

This will start the production server on http://localhost:3000