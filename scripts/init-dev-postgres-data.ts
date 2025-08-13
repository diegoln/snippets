#!/usr/bin/env npx tsx

/**
 * Development PostgreSQL Data Initialization Script
 * 
 * Uses the unified seeding service to initialize development database.
 */

import { PrismaClient } from '@prisma/client'
import { initializeMockData } from '../lib/data-seeding-service'

const prisma = new PrismaClient()

async function initializeDevPostgresData(): Promise<void> {
  await initializeMockData({
    environment: 'development',
    emailSuffix: '+dev@'
  }, prisma)
}

// Allow script to be run directly
if (require.main === module) {
  initializeDevPostgresData()
    .then(() => {
      console.log('🎉 Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { initializeDevPostgresData }