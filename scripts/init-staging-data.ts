#!/usr/bin/env npx tsx

/**
 * CLI Script for staging data initialization
 * 
 * This script provides a command-line interface to the staging service.
 * The actual logic is in lib/staging-service.ts for better architecture.
 */

import { PrismaClient } from '@prisma/client'
import { initializeStagingData } from '../lib/staging-service'

const prisma = new PrismaClient()

async function runStagingInitialization() {
  try {
    await initializeStagingData(prisma)
  } catch (error) {
    console.error('❌ Error initializing staging data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Allow script to be run directly or imported
if (require.main === module) {
  runStagingInitialization()
    .then(() => {
      console.log('🎉 Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

export { runStagingInitialization }