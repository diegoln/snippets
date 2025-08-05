/**
 * Multi-User API Authentication Tests
 * 
 * This test suite verifies that API routes properly enforce authentication
 * and ensure users can only access their own data through HTTP requests.
 */

import { NextRequest } from 'next/server'
import { GET as getSnippets, POST as createSnippet, PUT as updateSnippet } from '../snippets/route'
import { GET as getAssessments, POST as createAssessment } from '../assessments/route'
import { getUserIdFromRequest } from '@/lib/auth-utils'

// Mock the auth utils
jest.mock('@/lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn()
}))

const mockGetUserId = getUserIdFromRequest as jest.MockedFunction<typeof getUserIdFromRequest>

describe('API Authentication & Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('Snippets API Authentication', () => {
    test('GET /api/snippets requires authentication', async () => {
      mockGetUserId.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await getSnippets(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
    
    test('POST /api/snippets requires authentication', async () => {
      mockGetUserId.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 1,
          content: 'Test snippet'
        })
      })
      
      const response = await createSnippet(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
    
    test('PUT /api/snippets requires authentication', async () => {
      mockGetUserId.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'test-id',
          content: 'Updated content'
        })
      })
      
      const response = await updateSnippet(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })
  
  describe('Assessments API Authentication', () => {
    test('GET /api/assessments requires authentication', async () => {
      mockGetUserId.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/assessments')
      const response = await getAssessments(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
    
    test('POST /api/assessments requires authentication', async () => {
      mockGetUserId.mockResolvedValue(null)
      
      const request = new NextRequest('http://localhost:3000/api/assessments', {
        method: 'POST',
        body: JSON.stringify({
          cycleName: 'Q1 2024',
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        })
      })
      
      const response = await createAssessment(request)
      
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Authentication required')
    })
  })
  
  describe('Request Validation', () => {
    test('POST /api/snippets validates required fields', async () => {
      mockGetUserId.mockResolvedValue('user-123')
      
      // Test missing weekNumber
      const request1 = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          content: 'Test snippet'
        })
      })
      
      const response1 = await createSnippet(request1)
      expect(response1.status).toBe(400)
      
      // Test missing content
      const request2 = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: JSON.stringify({
          weekNumber: 1
        })
      })
      
      const response2 = await createSnippet(request2)
      expect(response2.status).toBe(400)
    })
    
    test('PUT /api/snippets validates required fields', async () => {
      mockGetUserId.mockResolvedValue('user-123')
      
      // Test missing id
      const request1 = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'PUT',
        body: JSON.stringify({
          content: 'Updated content'
        })
      })
      
      const response1 = await updateSnippet(request1)
      expect(response1.status).toBe(400)
      
      // Test missing content
      const request2 = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'test-id'
        })
      })
      
      const response2 = await updateSnippet(request2)
      expect(response2.status).toBe(400)
    })
    
    test('POST /api/assessments validates required fields', async () => {
      mockGetUserId.mockResolvedValue('user-123')
      
      // Test missing cycleName
      const request1 = new NextRequest('http://localhost:3000/api/assessments', {
        method: 'POST',
        body: JSON.stringify({
          startDate: '2024-01-01',
          endDate: '2024-03-31'
        })
      })
      
      const response1 = await createAssessment(request1)
      expect(response1.status).toBe(400)
      
      // Test invalid date range
      const request2 = new NextRequest('http://localhost:3000/api/assessments', {
        method: 'POST',
        body: JSON.stringify({
          cycleName: 'Q1 2024',
          startDate: '2024-03-31',
          endDate: '2024-01-01'
        })
      })
      
      const response2 = await createAssessment(request2)
      expect(response2.status).toBe(400)
      const data2 = await response2.json()
      expect(data2.error).toBe('endDate must be after startDate')
    })
  })
  
  describe('User Context Isolation', () => {
    test('different user IDs receive different data contexts', async () => {
      // Mock different user IDs for different requests
      const user1Id = 'user-123'
      const user2Id = 'user-456'
      
      // Test that getUserIdFromRequest is called and returns correct user ID
      mockGetUserId.mockResolvedValueOnce(user1Id)
      const request1 = new NextRequest('http://localhost:3000/api/snippets')
      
      // Note: This test verifies the auth flow, but actual data isolation
      // is tested in the multi-user-isolation.test.ts file
      const response1 = await getSnippets(request1)
      
      expect(mockGetUserId).toHaveBeenCalledWith(request1)
      
      // Reset mock for second request
      mockGetUserId.mockResolvedValueOnce(user2Id)
      const request2 = new NextRequest('http://localhost:3000/api/snippets')
      
      const response2 = await getSnippets(request2)
      
      expect(mockGetUserId).toHaveBeenCalledWith(request2)
      expect(mockGetUserId).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('Error Handling', () => {
    test('handles authentication errors gracefully', async () => {
      // Mock auth utility throwing an error
      mockGetUserId.mockRejectedValue(new Error('Session expired'))
      
      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await getSnippets(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch snippets')
    })
    
    test('handles malformed request bodies', async () => {
      mockGetUserId.mockResolvedValue('user-123')
      
      // Create request with invalid JSON
      const request = new NextRequest('http://localhost:3000/api/snippets', {
        method: 'POST',
        body: 'invalid json'
      })
      
      const response = await createSnippet(request)
      
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create snippet')
    })
  })
  
  describe('Security Headers and Response Format', () => {
    test('API responses do not leak sensitive information', async () => {
      mockGetUserId.mockResolvedValue('user-123')
      
      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await getSnippets(request)
      
      // The response should not contain internal user IDs in headers
      expect(response.headers.get('x-user-id')).toBeFalsy()
      expect(response.headers.get('x-internal-user')).toBeFalsy()
      
      // Content-Type should be properly set
      expect(response.headers.get('content-type')).toContain('application/json')
    })
    
    test('error responses do not expose internal details', async () => {
      mockGetUserId.mockRejectedValue(new Error('Database connection failed: localhost:5432'))
      
      const request = new NextRequest('http://localhost:3000/api/snippets')
      const response = await getSnippets(request)
      
      const data = await response.json()
      
      // Error message should be generic, not expose database details
      expect(data.error).toBe('Failed to fetch snippets')
      expect(data.error).not.toContain('localhost')
      expect(data.error).not.toContain('5432')
      expect(data.details).toBeUndefined()
    })
  })
})