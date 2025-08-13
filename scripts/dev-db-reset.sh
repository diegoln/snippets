#!/bin/bash

# Development Database Reset Script
# Completely removes and recreates the development database

set -e

echo "🗑️ Resetting development database..."
echo "⚠️  This will permanently delete all development data!"

read -p "Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Reset cancelled"
    exit 1
fi

# Stop and remove containers and volumes
docker-compose -f docker-compose.dev-local.yml down -v

# Remove any orphaned volumes
docker volume rm snippets_postgres_dev_data 2>/dev/null || true

echo "✅ Development database reset complete!"
echo ""
echo "🏃 To start fresh:"
echo "   npm run dev:db:start"
echo "   npm run dev"