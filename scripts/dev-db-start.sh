#!/bin/bash

# Development Database Startup Script
# Starts local PostgreSQL container for development

set -e

echo "🐘 Starting local PostgreSQL for development..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start the development database
docker-compose -f docker-compose.dev-local.yml up -d postgres-dev

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout 30s bash -c '
    until docker exec snippets-postgres-dev pg_isready -U app_user -d snippets_db > /dev/null 2>&1; do
        sleep 1
    done
'

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL is ready!"
    echo ""
    echo "🔧 Database connection details:"
    echo "   Host: localhost"
    echo "   Port: 5433"
    echo "   Database: snippets_db"
    echo "   User: app_user"
    echo "   Password: dev_password"
    echo ""
    echo "📄 Connection string:"
    echo "   DATABASE_URL=\"postgresql://app_user:dev_password@localhost:5433/snippets_db?schema=public\""
    echo ""
    echo "🏃 Next steps:"
    echo "   1. Copy .env.local.example to .env.local"
    echo "   2. Run: npm run dev:postgres"
else
    echo "❌ Timeout waiting for PostgreSQL to start"
    echo "📋 Check logs with: docker-compose -f docker-compose.dev-local.yml logs postgres-dev"
    exit 1
fi