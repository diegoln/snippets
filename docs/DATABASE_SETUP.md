# Database Setup - Environment-Aware Configuration

This project uses an environment-aware database configuration that automatically switches between SQLite (development) and PostgreSQL (production) without requiring manual schema changes.

## How It Works

### Schema Template System

- **Template**: `prisma/schema.template.prisma` - The master template with placeholders
- **Generated**: `prisma/schema.prisma` - Auto-generated based on environment
- **Script**: `scripts/generate-schema.js` - Handles the generation logic

### Environment Detection

```bash
# Development (NODE_ENV != 'production')
npm run dev          # Generates SQLite schema
npm run build        # Generates SQLite schema

# Production (NODE_ENV = 'production')
NODE_ENV=production npm run build  # Generates PostgreSQL schema
```

### Automatic Generation

The schema is automatically generated:
- **Before `npm run dev`** - Development schema (SQLite)
- **Before `npm run build`** - Environment-specific schema
- **During Docker build** - Production schema (PostgreSQL)

## Database Configurations

### Development (SQLite)
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  # file:./dev.db
}

// String fields for SQLite compatibility
metadata String @default("{}")
```

### Production (PostgreSQL)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  # postgres://...
}

// Json fields for PostgreSQL features
metadata Json @default("{}")
```

## Environment Setup

### Development (.env.local)
```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
```

### Production (Environment Variables)
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
```

## Commands

```bash
# Generate schema for current environment
npm run generate-schema

# Development workflow
npm run dev                    # Auto-generates SQLite schema + starts dev server
DATABASE_URL="file:./dev.db" npx prisma db push    # Apply to SQLite
node prisma/seed.js           # Seed with mock users

# Production workflow
NODE_ENV=production npm run generate-schema  # Generate PostgreSQL schema
npx prisma migrate deploy                    # Apply migrations to PostgreSQL
```

## Benefits

✅ **No Manual Changes**: Schema automatically adapts to environment
✅ **Type Safety**: Proper Json vs String types per database
✅ **CI/CD Ready**: Works seamlessly in build pipelines
✅ **Developer Friendly**: Just run `npm run dev` and everything works
✅ **Production Safe**: PostgreSQL features available in production

## Files

- `prisma/schema.template.prisma` - Master template (edit this)
- `prisma/schema.prisma` - Generated file (don't edit, auto-generated)
- `scripts/generate-schema.js` - Generation logic
- `.gitignore` - Excludes generated schema from version control

## Migration Strategy

When making schema changes:

1. Edit `prisma/schema.template.prisma`
2. Test locally: `npm run generate-schema && npx prisma db push`
3. Create migration: `npx prisma migrate dev --name your-change`
4. Deploy: The production build will auto-generate PostgreSQL schema

This ensures consistent behavior across all environments while maintaining database-specific optimizations.