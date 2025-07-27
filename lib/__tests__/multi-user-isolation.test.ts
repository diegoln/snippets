/**
 * Multi-User Data Isolation Tests
 * 
 * This test suite verifies that user data is properly isolated and users
 * cannot access or modify each other's data. It tests the core security
 * requirements for the multi-user system.
 */

import { PrismaClient } from '@prisma/client'
import { createUserDataService } from '../user-scoped-data'

describe('Multi-User Data Isolation', () => {
  let prisma: PrismaClient
  let user1Id: string
  let user2Id: string
  let user3Id: string
  
  beforeAll(async () => {
    prisma = new PrismaClient()
    
    // Create test users
    const user1 = await prisma.user.create({
      data: {
        email: 'test-user-1@example.com',
        name: 'Test User 1',
        jobTitle: 'Software Engineer',
        seniorityLevel: 'Senior'
      }
    })
    user1Id = user1.id
    
    const user2 = await prisma.user.create({
      data: {
        email: 'test-user-2@example.com',
        name: 'Test User 2',
        jobTitle: 'Staff Engineer',
        seniorityLevel: 'Staff'
      }
    })
    user2Id = user2.id
    
    const user3 = await prisma.user.create({
      data: {
        email: 'test-user-3@example.com',
        name: 'Test User 3',
        jobTitle: 'Principal Engineer',
        seniorityLevel: 'Principal'
      }
    })
    user3Id = user3.id
  })
  
  afterAll(async () => {
    // Clean up test data
    await prisma.weeklySnippet.deleteMany({
      where: {
        userId: { in: [user1Id, user2Id, user3Id] }
      }
    })
    
    await prisma.performanceAssessment.deleteMany({
      where: {
        userId: { in: [user1Id, user2Id, user3Id] }
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        id: { in: [user1Id, user2Id, user3Id] }
      }
    })
    
    await prisma.$disconnect()
  })
  
  describe('Snippet Data Isolation', () => {
    let user1SnippetId: string
    let user2SnippetId: string
    
    beforeEach(async () => {
      // Create snippets for each user
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      
      try {
        const user1Snippet = await user1Service.createSnippet({
          weekNumber: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          content: 'User 1 secret work content'
        })
        user1SnippetId = user1Snippet.id
        
        const user2Snippet = await user2Service.createSnippet({
          weekNumber: 1,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-05'),
          content: 'User 2 confidential work content'
        })
        user2SnippetId = user2Snippet.id
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
      }
    })
    
    afterEach(async () => {
      // Clean up snippets after each test
      await prisma.weeklySnippet.deleteMany({
        where: {
          id: { in: [user1SnippetId, user2SnippetId].filter(Boolean) }
        }
      })
    })
    
    test('users can only see their own snippets', async () => {
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      const user3Service = createUserDataService(user3Id)
      
      try {
        const user1Snippets = await user1Service.getSnippets()
        const user2Snippets = await user2Service.getSnippets()
        const user3Snippets = await user3Service.getSnippets()
        
        // User 1 should only see their own snippet
        expect(user1Snippets).toHaveLength(1)
        expect(user1Snippets[0].content).toBe('User 1 secret work content')
        expect(user1Snippets[0].id).toBe(user1SnippetId)
        
        // User 2 should only see their own snippet
        expect(user2Snippets).toHaveLength(1)
        expect(user2Snippets[0].content).toBe('User 2 confidential work content')
        expect(user2Snippets[0].id).toBe(user2SnippetId)
        
        // User 3 should see no snippets
        expect(user3Snippets).toHaveLength(0)
        
        // Verify cross-contamination doesn't exist
        const allSnippetIds = [...user1Snippets, ...user2Snippets, ...user3Snippets]
          .map(s => s.id)
        const uniqueIds = new Set(allSnippetIds)
        expect(uniqueIds.size).toBe(2) // Only 2 unique snippets across all users
        
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
        await user3Service.disconnect()
      }
    })
    
    test('users cannot update other users\' snippets', async () => {
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      
      try {
        // User 2 attempts to update User 1's snippet
        await expect(
          user2Service.updateSnippet(user1SnippetId, 'Malicious content update')
        ).rejects.toThrow('Snippet not found or access denied')
        
        // User 1 attempts to update User 2's snippet
        await expect(
          user1Service.updateSnippet(user2SnippetId, 'Another malicious update')
        ).rejects.toThrow('Snippet not found or access denied')
        
        // Verify original content is unchanged
        const user1Snippets = await user1Service.getSnippets()
        const user2Snippets = await user2Service.getSnippets()
        
        expect(user1Snippets[0].content).toBe('User 1 secret work content')
        expect(user2Snippets[0].content).toBe('User 2 confidential work content')
        
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
      }
    })
    
    test('users cannot delete other users\' snippets', async () => {
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      
      try {
        // User 2 attempts to delete User 1's snippet
        await expect(
          user2Service.deleteSnippet(user1SnippetId)
        ).rejects.toThrow('Snippet not found or access denied')
        
        // User 1 attempts to delete User 2's snippet
        await expect(
          user1Service.deleteSnippet(user2SnippetId)
        ).rejects.toThrow('Snippet not found or access denied')
        
        // Verify snippets still exist
        const user1Snippets = await user1Service.getSnippets()
        const user2Snippets = await user2Service.getSnippets()
        
        expect(user1Snippets).toHaveLength(1)
        expect(user2Snippets).toHaveLength(1)
        
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
      }
    })
  })
  
  describe('Assessment Data Isolation', () => {
    let user1AssessmentId: string
    let user2AssessmentId: string
    
    beforeEach(async () => {
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      
      try {
        const user1Assessment = await user1Service.createAssessment({
          cycleName: 'Q1 2024',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          generatedDraft: 'User 1 confidential performance assessment'
        })
        user1AssessmentId = user1Assessment.id
        
        const user2Assessment = await user2Service.createAssessment({
          cycleName: 'Q1 2024',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          generatedDraft: 'User 2 secret performance evaluation'
        })
        user2AssessmentId = user2Assessment.id
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
      }
    })
    
    afterEach(async () => {
      await prisma.performanceAssessment.deleteMany({
        where: {
          id: { in: [user1AssessmentId, user2AssessmentId].filter(Boolean) }
        }
      })
    })
    
    test('users can only see their own assessments', async () => {
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      const user3Service = createUserDataService(user3Id)
      
      try {
        const user1Assessments = await user1Service.getAssessments()
        const user2Assessments = await user2Service.getAssessments()
        const user3Assessments = await user3Service.getAssessments()
        
        // User 1 should only see their own assessment
        expect(user1Assessments).toHaveLength(1)
        expect(user1Assessments[0].generatedDraft).toBe('User 1 confidential performance assessment')
        expect(user1Assessments[0].id).toBe(user1AssessmentId)
        
        // User 2 should only see their own assessment
        expect(user2Assessments).toHaveLength(1)
        expect(user2Assessments[0].generatedDraft).toBe('User 2 secret performance evaluation')
        expect(user2Assessments[0].id).toBe(user2AssessmentId)
        
        // User 3 should see no assessments
        expect(user3Assessments).toHaveLength(0)
        
        // Verify no cross-contamination
        const allAssessmentIds = [...user1Assessments, ...user2Assessments, ...user3Assessments]
          .map(a => a.id)
        const uniqueIds = new Set(allAssessmentIds)
        expect(uniqueIds.size).toBe(2) // Only 2 unique assessments
        
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
        await user3Service.disconnect()
      }
    })
  })
  
  describe('User Profile Isolation', () => {
    test('users can only access their own profile', async () => {
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      const user3Service = createUserDataService(user3Id)
      
      try {
        const user1Profile = await user1Service.getUserProfile()
        const user2Profile = await user2Service.getUserProfile()
        const user3Profile = await user3Service.getUserProfile()
        
        // Verify each user gets their own profile
        expect(user1Profile?.email).toBe('test-user-1@example.com')
        expect(user1Profile?.jobTitle).toBe('Software Engineer')
        expect(user1Profile?.seniorityLevel).toBe('Senior')
        
        expect(user2Profile?.email).toBe('test-user-2@example.com')
        expect(user2Profile?.jobTitle).toBe('Staff Engineer')
        expect(user2Profile?.seniorityLevel).toBe('Staff')
        
        expect(user3Profile?.email).toBe('test-user-3@example.com')
        expect(user3Profile?.jobTitle).toBe('Principal Engineer')
        expect(user3Profile?.seniorityLevel).toBe('Principal')
        
        // Verify no cross-contamination
        expect(user1Profile?.id).toBe(user1Id)
        expect(user2Profile?.id).toBe(user2Id)
        expect(user3Profile?.id).toBe(user3Id)
        
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
        await user3Service.disconnect()
      }
    })
    
    test('users can only update their own profile', async () => {
      const user1Service = createUserDataService(user1Id)
      
      try {
        // User 1 updates their own profile
        const updatedProfile = await user1Service.updateUserProfile({
          jobTitle: 'Senior Software Engineer',
          performanceFeedback: 'Great work this quarter!'
        })
        
        expect(updatedProfile.jobTitle).toBe('Senior Software Engineer')
        expect(updatedProfile.performanceFeedback).toBe('Great work this quarter!')
        expect(updatedProfile.id).toBe(user1Id)
        
        // Verify other users' profiles are unaffected
        const user2Service = createUserDataService(user2Id)
        try {
          const user2Profile = await user2Service.getUserProfile()
          expect(user2Profile?.jobTitle).toBe('Staff Engineer') // Unchanged
          expect(user2Profile?.performanceFeedback).toBeNull() // Unchanged
        } finally {
          await user2Service.disconnect()
        }
        
      } finally {
        await user1Service.disconnect()
      }
    })
  })
  
  describe('Concurrent User Operations', () => {
    test('parallel operations from different users remain isolated', async () => {
      const user1Service = createUserDataService(user1Id)
      const user2Service = createUserDataService(user2Id)
      const user3Service = createUserDataService(user3Id)
      
      try {
        // Simulate concurrent operations from different users
        const operations = await Promise.all([
          user1Service.createSnippet({
            weekNumber: 10,
            startDate: new Date('2024-03-04'),
            endDate: new Date('2024-03-08'),
            content: 'User 1 concurrent snippet'
          }),
          user2Service.createSnippet({
            weekNumber: 10,
            startDate: new Date('2024-03-04'),
            endDate: new Date('2024-03-08'),
            content: 'User 2 concurrent snippet'
          }),
          user3Service.createSnippet({
            weekNumber: 10,
            startDate: new Date('2024-03-04'),
            endDate: new Date('2024-03-08'),
            content: 'User 3 concurrent snippet'
          })
        ])
        
        // Verify all operations succeeded and data is properly isolated
        const [user1Snippet, user2Snippet, user3Snippet] = operations
        
        expect(user1Snippet.content).toBe('User 1 concurrent snippet')
        expect(user2Snippet.content).toBe('User 2 concurrent snippet')
        expect(user3Snippet.content).toBe('User 3 concurrent snippet')
        
        // Verify each user can only see their own snippet
        const user1Snippets = await user1Service.getSnippets()
        const user2Snippets = await user2Service.getSnippets()
        const user3Snippets = await user3Service.getSnippets()
        
        expect(user1Snippets.find(s => s.content.includes('User 1'))).toBeDefined()
        expect(user1Snippets.find(s => s.content.includes('User 2'))).toBeUndefined()
        expect(user1Snippets.find(s => s.content.includes('User 3'))).toBeUndefined()
        
        expect(user2Snippets.find(s => s.content.includes('User 2'))).toBeDefined()
        expect(user2Snippets.find(s => s.content.includes('User 1'))).toBeUndefined()
        expect(user2Snippets.find(s => s.content.includes('User 3'))).toBeUndefined()
        
        expect(user3Snippets.find(s => s.content.includes('User 3'))).toBeDefined()
        expect(user3Snippets.find(s => s.content.includes('User 1'))).toBeUndefined()
        expect(user3Snippets.find(s => s.content.includes('User 2'))).toBeUndefined()
        
      } finally {
        await user1Service.disconnect()
        await user2Service.disconnect()
        await user3Service.disconnect()
      }
    })
  })
})