#!/usr/bin/env node

/**
 * Staging Environment Initialization Script
 * 
 * Uses the unified data-seeding-service for consistency across environments.
 * Creates staging-specific mock users and data patterns.
 * 
 * Usage: NODE_ENV=production DATABASE_URL=<prod_db_url> node init-staging-environment.js
 */

const { PrismaClient } = require('@prisma/client');
const { initializeMockData } = require('../lib/data-seeding-service');

async function initStagingEnvironment() {
  console.log('🎭 Initializing staging environment...');
  
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error']
  });

  try {
    // Use the unified seeding service with staging configuration
    await initializeMockData({
      environment: 'staging',
      userIdPrefix: 'staging_',
      emailSuffix: '+staging@'
    }, prisma);

    console.log('🎉 Staging environment initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Staging initialization failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  initStagingEnvironment().catch((error) => {
    console.error('Staging initialization failed:', error);
    process.exit(1);
  });
}

module.exports = { initStagingEnvironment };