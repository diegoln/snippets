#!/bin/bash

# Development Database Stop Script
# Stops local PostgreSQL container for development

set -e

echo "🐘 Stopping local PostgreSQL for development..."

# Stop the development database
docker-compose -f docker-compose.dev-local.yml down

echo "✅ PostgreSQL stopped successfully!"
echo ""
echo "💡 To start again: npm run dev:db:start"
echo "🗑️  To remove all data: npm run dev:db:reset"