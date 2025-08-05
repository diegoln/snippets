#!/usr/bin/env node

/**
 * Test Career Plan Generation
 * 
 * Simple test script to verify the new robust job processing system works
 * without the complexities of authentication and HTTP endpoints.
 */

const { PrismaClient } = require('@prisma/client')

// Test the career plan generation directly
async function testCareerPlanGeneration() {
  console.log('🧪 Testing Career Plan Generation...')
  
  // Import the job processing system
  const { InMemoryProcessor } = require('./lib/job-processor/processors/in-memory-processor')
  const { jobService } = require('./lib/job-processor/job-service')
  
  const processor = new InMemoryProcessor()
  
  // Process job directly using the job service
  const processJob = async (job) => {
    return await jobService.processJob(
      job.type,
      job.userId,
      job.operationId,
      job.inputData
    )
  }
  
  const testJob = {
    type: 'career_plan_generation',
    userId: 'test-user-123',
    operationId: 'test-operation-456', 
    inputData: {
      role: 'Software Engineer',
      level: 'Senior Software Engineer',
      companyLadder: 'We follow standard engineering levels from Junior -> Mid -> Senior -> Staff -> Principal'
    },
    metadata: {
      priority: 'high',
      estimatedDuration: 30
    }
  }

  // First, create the user and operation in the database
  const prisma = new PrismaClient()
  
  try {
    // Create test user
    await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {},
      create: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        jobTitle: 'Software Engineer',
        seniorityLevel: 'Senior Software Engineer'
      }
    })

    // Create async operation
    await prisma.asyncOperation.create({
      data: {
        id: 'test-operation-456',
        userId: 'test-user-123',
        operationType: 'career_plan_generation',
        status: 'queued',
        progress: 0,
        inputData: JSON.stringify(testJob.inputData),
        estimatedDuration: 30,
        metadata: JSON.stringify(testJob.metadata)
      }
    })

    console.log('✅ Test data created')

    // Process the job
    console.log('🚀 Processing career plan generation job...')
    const result = await processJob(testJob)
    
    console.log('📊 Job Result:')
    console.log(JSON.stringify(result, null, 2))

    // Check the final state in the database
    const finalOperation = await prisma.asyncOperation.findUnique({
      where: { id: 'test-operation-456' }
    })

    console.log('📋 Final Operation State:')
    console.log({
      status: finalOperation.status,
      progress: finalOperation.progress,
      hasResult: !!finalOperation.resultData,
      error: finalOperation.errorMessage
    })

    // Check if user profile was updated
    const updatedUser = await prisma.user.findUnique({
      where: { id: 'test-user-123' },
      select: {
        careerProgressionPlan: true,
        nextLevelExpectations: true,
        careerPlanGeneratedAt: true
      }
    })

    console.log('👤 User Profile Updated:')
    console.log({
      hasCareerPlan: !!updatedUser.careerProgressionPlan,
      hasNextLevelExpectations: !!updatedUser.nextLevelExpectations,
      planGeneratedAt: updatedUser.careerPlanGeneratedAt
    })

    if (updatedUser.careerProgressionPlan) {
      console.log('\n📈 Generated Career Plan:')
      console.log(updatedUser.careerProgressionPlan.substring(0, 200) + '...')
    }

    console.log('\n✅ Test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testCareerPlanGeneration().catch(console.error)