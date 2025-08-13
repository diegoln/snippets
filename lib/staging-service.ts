/**
 * Staging Data Management Service
 * 
 * Provides functions for initializing and managing staging environment data.
 * Uses the unified seeding service for consistency.
 */

import { PrismaClient } from '@prisma/client'
import { initializeMockData } from './data-seeding-service'

/**
 * Initialize staging database with mock data
 * Uses the unified seeding service with staging-specific configuration
 */
export async function initializeStagingData(prisma?: PrismaClient): Promise<void> {
  await initializeMockData({
    environment: 'staging',
    userIdPrefix: 'staging_',
    emailSuffix: '+staging@'
  }, prisma)
}