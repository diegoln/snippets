/**
 * Schema Health Check API Endpoint
 * 
 * Validates that the current Prisma schema is compatible with the environment
 * and database connection is working properly.
 * 
 * GET /api/health/schema
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentMode } from '../../../../lib/environment'

// Force dynamic rendering for accurate environment detection
export const dynamic = 'force-dynamic'
export const revalidate = 0

let prisma: any = null

async function getPrismaClient() {
  if (!prisma) {
    const { PrismaClient } = await import('@prisma/client')
    prisma = new PrismaClient()
  }
  return prisma
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'warning'
  timestamp: string
  environment: string
  database: {
    provider: string
    connection: 'ok' | 'failed'
    error?: string
  }
  schema: {
    generated: boolean
    compatible: boolean
    issues?: string[]
  }
  version: {
    node: string
    prisma: string
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResult>> {
  const startTime = Date.now()
  
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: getEnvironmentMode(),
    database: {
      provider: 'unknown',
      connection: 'failed'
    },
    schema: {
      generated: false,
      compatible: true
    },
    version: {
      node: process.version,
      prisma: 'unknown'
    }
  }

  try {
    const client = await getPrismaClient()
    
    // Test database connection
    try {
      await client.$connect()
      await client.$queryRaw`SELECT 1`
      result.database.connection = 'ok'
    } catch (error) {
      result.database.connection = 'failed'
      result.database.error = error instanceof Error ? error.message : 'Unknown database error'
      result.status = 'unhealthy'
    }

    // Check schema compatibility
    try {
      // Attempt to query each main table to ensure schema is compatible
      const checks = []
      
      // Check User table
      checks.push(
        client.user.findFirst({ take: 1 }).then(() => ({ table: 'User', status: 'ok' }))
          .catch((error: any) => ({ table: 'User', status: 'failed', error: error.message }))
      )
      
      // Check WeeklySnippet table
      checks.push(
        client.weeklySnippet.findFirst({ take: 1 }).then(() => ({ table: 'WeeklySnippet', status: 'ok' }))
          .catch((error: any) => ({ table: 'WeeklySnippet', status: 'failed', error: error.message }))
      )
      
      // Check Integration table
      checks.push(
        client.integration.findFirst({ take: 1 }).then(() => ({ table: 'Integration', status: 'ok' }))
          .catch((error: any) => ({ table: 'Integration', status: 'failed', error: error.message }))
      )

      const checkResults = await Promise.all(checks)
      const failedChecks = checkResults.filter(check => check.status === 'failed')
      
      if (failedChecks.length > 0) {
        result.schema.compatible = false
        result.schema.issues = failedChecks.map(check => {
          const failedCheck = check as { table: string; status: string; error: string }
          return `${failedCheck.table}: ${failedCheck.error}`
        })
        result.status = 'unhealthy'
      } else {
        result.schema.generated = true
        result.schema.compatible = true
      }

    } catch (error) {
      result.schema.compatible = false
      result.schema.issues = [error instanceof Error ? error.message : 'Unknown schema error']
      result.status = 'unhealthy'
    }

    // Detect database provider
    try {
      const databaseUrl = process.env.DATABASE_URL
      if (databaseUrl) {
        if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
          result.database.provider = 'postgresql'
        } else if (databaseUrl.startsWith('file:') || databaseUrl.includes('.db')) {
          result.database.provider = 'sqlite'
        } else {
          result.database.provider = 'unknown'
        }
      }
    } catch (error) {
      // Provider detection is non-critical
    }

    // Get Prisma version
    try {
      const packageJson = require('../../../../package.json')
      result.version.prisma = packageJson.dependencies['@prisma/client'] || 'unknown'
    } catch (error) {
      // Version detection is non-critical
    }

    // Environment validation
    const envMode = getEnvironmentMode()
    const expectedProvider = (envMode === 'production' || envMode === 'staging') ? 'postgresql' : 'sqlite'
    if (result.database.provider !== expectedProvider && result.database.provider !== 'unknown') {
      result.status = 'warning'
      if (!result.schema.issues) result.schema.issues = []
      result.schema.issues.push(`Expected ${expectedProvider} for ${result.environment} environment, but found ${result.database.provider}`)
    }

  } catch (error) {
    result.status = 'unhealthy'
    result.database.error = error instanceof Error ? error.message : 'Unknown error during health check'
  } finally {
    try {
      if (prisma) {
        await prisma.$disconnect()
      }
    } catch (error) {
      // Disconnection errors are non-critical for health check
    }
  }

  const responseTime = Date.now() - startTime
  
  return NextResponse.json({
    ...result,
    responseTime: `${responseTime}ms`
  }, { 
    status: result.status === 'healthy' ? 200 : result.status === 'warning' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Content-Type': 'application/json'
    }
  })
}