#!/usr/bin/env node

/**
 * Project Validation Script
 * 
 * This script validates the essential project structure and configuration
 * without requiring a full build or test environment setup.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AdvanceWeekly Project Validation\n');

let allPassed = true;

function check(description, condition, details = '') {
  const status = condition ? '✅' : '❌';
  console.log(`${status} ${description}`);
  if (details && !condition) {
    console.log(`   ${details}`);
  }
  if (!condition) allPassed = false;
}

// Essential files validation
check('Package.json exists', fs.existsSync('package.json'));
check('Next.js config exists', fs.existsSync('next.config.js'));
check('Prisma schema exists', fs.existsSync('prisma/schema.prisma'));
check('Main app page exists', fs.existsSync('app/page.tsx'));
check('Production Dockerfile exists', fs.existsSync('Dockerfile'));
check('Cloud Build config exists', fs.existsSync('cloudbuild.yaml'));

// Package.json validation
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check('Has dev script', pkg.scripts && pkg.scripts.dev);
  check('Has build script', pkg.scripts && pkg.scripts.build);
  check('Has Next.js dependency', pkg.dependencies && pkg.dependencies.next);
  check('Has Prisma client', pkg.dependencies && pkg.dependencies['@prisma/client']);
  check('Has Prisma CLI', pkg.devDependencies && pkg.devDependencies.prisma);
  check('Has React dependency', pkg.dependencies && pkg.dependencies.react);
}

// API routes validation
check('Snippets API exists', fs.existsSync('app/api/snippets/route.ts'));
check('Assessments API exists', fs.existsSync('app/api/assessments/route.ts'));
check('Health check API exists', fs.existsSync('app/api/health/route.ts'));

// Configuration files
check('Deployment docs exist', fs.existsSync('DEPLOYMENT.md'));
check('Git ignore configured', fs.existsSync('.gitignore'));
check('Docker ignore configured', fs.existsSync('.dockerignore'));
check('GCloud ignore configured', fs.existsSync('.gcloudignore'));

// Production deployment files
check('Production startup script exists', fs.existsSync('start.sh'));
check('Deployment script exists', fs.existsSync('deploy-production.sh'));

// Code quality checks
if (fs.existsSync('app/api/snippets/route.ts')) {
  const snippetsApi = fs.readFileSync('app/api/snippets/route.ts', 'utf8');
  check('API has lazy Prisma initialization', snippetsApi.includes('getPrismaClient'));
  check('API has error handling', snippetsApi.includes('try {') && snippetsApi.includes('catch'));
}

if (fs.existsSync('Dockerfile')) {
  const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
  check('Dockerfile uses multi-stage build', dockerfile.includes('AS deps') && dockerfile.includes('AS builder'));
  check('Dockerfile has health check', dockerfile.includes('HEALTHCHECK'));
  check('Dockerfile uses non-root user', dockerfile.includes('USER nextjs'));
}

// Project structure validation
const requiredDirs = ['app', 'components', 'lib', 'prisma', 'types'];
requiredDirs.forEach(dir => {
  check(`${dir}/ directory exists`, fs.existsSync(dir));
});

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('🎉 All validations passed! Project structure is correct.');
  console.log('\nProject is ready for:');
  console.log('- ✅ Production deployment to Google Cloud Run');
  console.log('- ✅ Code review and collaboration');
  console.log('- ✅ Local development (with proper environment setup)');
} else {
  console.log('❌ Some validations failed. Please address the issues above.');
  process.exit(1);
}

console.log('\n📋 Next steps:');
console.log('1. Set up local development environment (see LOCAL_DEV.md)');
console.log('2. Run production deployment: ./deploy-production.sh');
console.log('3. Monitor deployment: Check Cloud Run console');