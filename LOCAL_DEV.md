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

## Environment Configuration

Create a `.env` file:
```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Development vs Production

- **Local**: Uses SQLite database (`prisma/dev.db`)
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
For development, the app will create a local SQLite database automatically.
Run `npm run db:push` to sync the schema.

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