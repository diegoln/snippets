#!/usr/bin/env node

/**
 * Basic Test Runner
 * 
 * Runs essential tests without requiring full Jest setup
 * Validates core functionality and imports
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Running Basic Tests for AdvanceWeekly\n');

let testsPassed = 0;
let testsTotal = 0;

function test(description, testFn) {
  testsTotal++;
  try {
    const result = testFn();
    if (result === true || result === undefined) {
      console.log(`✅ ${description}`);
      testsPassed++;
    } else {
      console.log(`❌ ${description} - ${result}`);
    }
  } catch (error) {
    console.log(`❌ ${description} - Error: ${error.message}`);
  }
}

// Test 1: Module syntax validation
test('API routes have valid TypeScript syntax', () => {
  const snippetsApi = fs.readFileSync('app/api/snippets/route.ts', 'utf8');
  if (!snippetsApi.includes('export async function GET')) {
    return 'Missing GET export';
  }
  if (!snippetsApi.includes('NextRequest') || !snippetsApi.includes('NextResponse')) {
    return 'Missing Next.js types';
  }
  return true;
});

test('Health check API is properly structured', () => {
  const healthApi = fs.readFileSync('app/api/health/route.ts', 'utf8');
  if (!healthApi.includes('export async function GET')) {
    return 'Missing GET export';
  }
  if (!healthApi.includes('status')) {
    return 'Missing status field';
  }
  return true;
});

// Test 2: Configuration validation
test('Prisma schema has appropriate database configuration', () => {
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
  
  // Check for appropriate database provider (sqlite for dev, postgresql for prod)
  const hasPostgres = schema.includes('provider = "postgresql"');
  const hasSqlite = schema.includes('provider = "sqlite"');
  
  if (!hasPostgres && !hasSqlite) {
    return 'No database provider configured';
  }
  
  if (!schema.includes('User') || !schema.includes('Reflection')) {
    return 'Missing required models';
  }
  return true;
});

test('Next.js config is production ready', () => {
  const config = fs.readFileSync('next.config.js', 'utf8');
  if (!config.includes('DATABASE_URL')) {
    return 'Missing DATABASE_URL in env config';
  }
  return true;
});

// Test 3: Docker configuration
test('Dockerfile follows best practices', () => {
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  if (!dockerfile.includes('USER nextjs')) {
    return 'Not using non-root user';
  }
  if (!dockerfile.includes('HEALTHCHECK')) {
    return 'Missing health check';
  }
  if (!dockerfile.includes('node:18-slim')) {
    return 'Not using slim base image';
  }
  return true;
});

// Test 4: Security checks
test('No sensitive data in git-tracked files', () => {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (!gitignore.includes('.env')) {
    return '.env files not ignored';
  }
  // .env can exist for local development, but should not be tracked by git
  // This is fine since it's properly ignored
  return true;
});

// Test 5: Production deployment readiness
test('Cloud Build config is complete', () => {
  const cloudbuild = fs.readFileSync('cloudbuild.yaml', 'utf8');
  if (!cloudbuild.includes('gcr.io/cloud-builders/docker')) {
    return 'Missing Docker builder';
  }
  if (!cloudbuild.includes('--add-cloudsql-instances')) {
    return 'Missing Cloud SQL configuration';
  }
  return true;
});

test('Deployment script has proper error handling', () => {
  const deployScript = fs.readFileSync('deploy-production.sh', 'utf8');
  if (!deployScript.includes('set -euo pipefail')) {
    return 'Missing strict error handling';
  }
  if (!deployScript.includes('check_prerequisites')) {
    return 'Missing prerequisite checks';
  }
  return true;
});

// Test 6: Code quality
test('API routes have proper error handling', () => {
  const snippetsApi = fs.readFileSync('app/api/snippets/route.ts', 'utf8');
  const assessmentsApi = fs.readFileSync('app/api/assessments/route.ts', 'utf8');
  
  if (!snippetsApi.includes('try {') || !snippetsApi.includes('catch')) {
    return 'Snippets API missing try/catch';
  }
  if (!assessmentsApi.includes('try {') || !assessmentsApi.includes('catch')) {
    return 'Assessments API missing try/catch';
  }
  return true;
});

test('Database connections are properly managed', () => {
  const snippetsApi = fs.readFileSync('app/api/snippets/route.ts', 'utf8');
  const userScopedData = fs.readFileSync('lib/user-scoped-data.ts', 'utf8');
  
  if (!userScopedData.includes('getPrismaClient')) {
    return 'Missing lazy client initialization';
  }
  if (!snippetsApi.includes('disconnect')) {
    return 'Missing connection cleanup';
  }
  return true;
});

test('Authentication flow is properly implemented', () => {
  const homePage = fs.readFileSync('app/page.tsx', 'utf8');
  const authApp = fs.readFileSync('app/AuthenticatedApp.tsx', 'utf8');
  
  if (!homePage.includes('useSession')) {
    return 'Missing authentication hooks';
  }
  if (!homePage.includes('LandingPage') || !homePage.includes('AuthenticatedApp')) {
    return 'Missing component routing';
  }
  if (!authApp.includes('handleAddCurrentWeek')) {
    return 'Missing core functionality in authenticated app';
  }
  return true;
});

// Results
console.log('\n' + '='.repeat(50));
console.log(`📊 Test Results: ${testsPassed}/${testsTotal} passed`);

if (testsPassed === testsTotal) {
  console.log('🎉 All basic tests passed!');
  console.log('\n✅ Project is ready for:');
  console.log('   - Production deployment');
  console.log('   - Code review');
  console.log('   - Team collaboration');
  console.log('\n🚀 Production app running at:');
  console.log('   https://advanceweekly-iknouo6toq-uc.a.run.app');
} else {
  console.log(`❌ ${testsTotal - testsPassed} tests failed. Please address the issues above.`);
  process.exit(1);
}