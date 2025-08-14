/**
 * Jest Global Teardown for Integration Tests
 * 
 * Performs cleanup after all integration tests complete.
 */

const { PrismaClient } = require('@prisma/client')

module.exports = async () => {
  console.log('🧹 Cleaning up integration test environment...')
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL
      }
    }
  })
  
  try {
    await prisma.$connect()
    
    // Final cleanup of any remaining test data
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
    
    console.log('✅ Final cleanup completed')
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw - we want tests to complete even if cleanup fails
  } finally {
    await prisma.$disconnect()
  }
  
  console.log('👋 Integration test environment cleaned up')
}