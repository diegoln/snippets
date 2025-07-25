#!/bin/bash

#
# Local Development Setup Test
#
# This script verifies that the local development environment can be set up
# and tests basic functionality without requiring external dependencies.
#

set -e

echo "🔧 Testing Local Development Setup"
echo "================================="

# Test 1: Check if Node.js is available
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js $(node --version) found"
else
    echo "   ❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Test 2: Check npm
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    echo "   ✅ npm $(npm --version) found"
else
    echo "   ❌ npm not found"
    exit 1
fi

# Test 3: Validate package.json structure
echo "3. Validating package.json..."
if node -e "const pkg = require('./package.json'); console.log('   ✅ Package name:', pkg.name, 'v' + pkg.version)"; then
    echo "   ✅ package.json is valid"
else
    echo "   ❌ package.json is invalid"
    exit 1
fi

# Test 4: Check if essential directories exist
echo "4. Checking project structure..."
REQUIRED_DIRS=("app" "components" "lib" "prisma" "types")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✅ $dir/ directory exists"
    else
        echo "   ❌ $dir/ directory missing"
        exit 1
    fi
done

# Test 5: Validate TypeScript configuration
echo "5. Checking TypeScript config..."
if [ -f "tsconfig.json" ]; then
    echo "   ✅ tsconfig.json found"
else
    echo "   ❌ tsconfig.json missing"
    exit 1
fi

# Test 6: Check Prisma schema
echo "6. Validating Prisma schema..."
if grep -q "model User" prisma/schema.prisma && grep -q "model WeeklySnippet" prisma/schema.prisma; then
    echo "   ✅ Prisma schema has required models"
else
    echo "   ❌ Prisma schema missing required models"
    exit 1
fi

echo ""
echo "🎉 Local development setup validation passed!"
echo ""
echo "📋 To start development:"
echo "1. Run: npm install"
echo "2. Set up environment: cp .env.example .env (if exists)"
echo "3. Initialize database: npm run db:push"
echo "4. Start dev server: npm run dev"
echo ""
echo "📚 See LOCAL_DEV.md for detailed setup instructions"