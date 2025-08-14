/**
 * Jest Global Setup for Integration Tests
 * 
 * Performs one-time setup before all integration tests run.
 * This includes database preparation, service initialization, etc.
 */

const { PrismaClient } = require('@prisma/client')

module.exports = async () => {
  console.log('🔧 Setting up integration test environment...')
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
      }
    }
  })
  
  try {
    // Verify database connection
    await prisma.$connect()
    console.log('✅ Database connection verified')
    
    // Clean up any existing test data
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          startsWith: 'test-'
        }
      },
      select: { id: true }
    })
    
    const testUserIds = testUsers.map(u => u.id)
    
    if (testUserIds.length > 0) {
      await prisma.asyncOperation.deleteMany({
        where: {
          userId: { in: testUserIds }
        }
      })
      
      await prisma.weeklySnippet.deleteMany({
        where: {
          userId: { in: testUserIds }
        }
      })
      
      await prisma.integrationConsolidation.deleteMany({
        where: {
          userId: { in: testUserIds }
        }
      })
      
      await prisma.account.deleteMany({
        where: {
          userId: { in: testUserIds }
        }
      })
      
      await prisma.user.deleteMany({
        where: {
          id: { in: testUserIds }
        }
      })
    }
    
    console.log('✅ Test data cleanup completed')
    
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
  
  console.log('🚀 Integration test environment ready')
}