# Deployment Guide

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd snippets
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local database and OAuth credentials
   ```

3. **Database setup:**
   ```bash
   # Option 1: Use Docker
   docker-compose up postgres -d
   
   # Option 2: Use local PostgreSQL
   createdb snippets_db
   ```

4. **Initialize database:**
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

## Production Deployment

### AWS Infrastructure Setup

1. **Create AWS RDS PostgreSQL instance:**
   - Instance class: db.t3.micro (or larger)
   - Public accessibility: No
   - VPC: Default or custom
   - Security groups: Allow PostgreSQL (5432) from Lambda

2. **Deploy Lambda API:**
   ```bash
   cd aws-lambda
   npm install
   npm run build
   
   # Update samconfig.toml with your RDS endpoint
   sam deploy --guided
   ```

3. **Deploy Frontend to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy
   vercel --prod
   
   # Set environment variables in Vercel dashboard
   ```

### Environment Variables

#### Frontend (Vercel)
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth.js
- `NEXTAUTH_URL`: Your Vercel domain
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `TODOIST_CLIENT_ID`: Todoist OAuth client ID
- `TODOIST_CLIENT_SECRET`: Todoist OAuth client secret
- `AWS_API_ENDPOINT`: Lambda API Gateway URL

#### Lambda (AWS)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret for JWT token signing

### OAuth Setup

#### Google Calendar Integration
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.vercel.app/api/auth/callback/google` (production)

#### Todoist Integration
1. Go to [Todoist App Management](https://developer.todoist.com/appconsole.html)
2. Create a new app
3. Set redirect URIs:
   - `http://localhost:3000/api/auth/callback/todoist` (development)
   - `https://your-domain.vercel.app/api/auth/callback/todoist` (production)

## Database Migrations

### Development
```bash
npx prisma migrate dev --name init
```

### Production
```bash
npx prisma migrate deploy
```

## Monitoring and Maintenance

- **Lambda Logs**: Check CloudWatch logs for API errors
- **Database**: Monitor RDS performance metrics
- **Frontend**: Use Vercel analytics for performance monitoring
- **Costs**: Monitor AWS costs, especially RDS and Lambda invocations