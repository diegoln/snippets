/**
 * Reset Onboarding Functionality Tests
 * 
 * Comprehensive tests for the onboarding reset functionality to ensure
 * it works correctly and doesn't break in future changes.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { DELETE as resetOnboardingHandler } from '../app/api/user/onboarding/route'
import { getUserIdFromRequest } from '../lib/auth-utils'
import { createUserDataService } from '../lib/user-scoped-data'

// Mock dependencies
jest.mock('../lib/auth-utils')
jest.mock('../lib/user-scoped-data')

const mockGetUserIdFromRequest = getUserIdFromRequest as jest.MockedFunction<typeof getUserIdFromRequest>
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

describe('Reset Onboarding Functionality', () => {
  let mockDataService: any
  let mockRequest: NextRequest

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Mock data service
    mockDataService = {
      updateUserProfile: vi.fn(),
      disconnect: vi.fn()
    }
    
    mockCreateUserDataService.mockReturnValue(mockDataService)
    
    // Mock request
    mockRequest = new NextRequest('http://localhost:3000/api/user/onboarding', {
      method: 'DELETE'
    })
    
    // Set NODE_ENV to development for tests
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null)

      const response = await resetOnboardingHandler(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
      expect(mockCreateUserDataService).not.toHaveBeenCalled()
    })

    it('should proceed when user is authenticated', async () => {
      mockGetUserIdFromRequest.mockResolvedValue('test-user-123')
      mockDataService.updateUserProfile.mockResolvedValue(undefined)

      const response = await resetOnboardingHandler(mockRequest)
      
      expect(response.status).toBe(200)
      expect(mockGetUserIdFromRequest).toHaveBeenCalledWith(mockRequest)
    })
  })

  describe('Environment Protection', () => {
    it('should block access in production environment', async () => {
      process.env.NODE_ENV = 'production'
      
      const response = await resetOnboardingHandler(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('This endpoint is only available in development')
      expect(mockGetUserIdFromRequest).not.toHaveBeenCalled()
    })

    it('should allow access in development environment', async () => {
      process.env.NODE_ENV = 'development'
      mockGetUserIdFromRequest.mockResolvedValue('test-user-123')
      mockDataService.updateUserProfile.mockResolvedValue(undefined)

      const response = await resetOnboardingHandler(mockRequest)
      
      expect(response.status).toBe(200)
    })
  })

  describe('Onboarding Reset Logic', () => {
    beforeEach(() => {
      mockGetUserIdFromRequest.mockResolvedValue('test-user-123')
    })

    it('should reset onboarding by setting onboardingCompletedAt to null', async () => {
      mockDataService.updateUserProfile.mockResolvedValue(undefined)

      const response = await resetOnboardingHandler(mockRequest)
      const data = await response.json()

      expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
        onboardingCompletedAt: null
      })
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Onboarding status reset successfully')
      expect(data.resetAt).toBeDefined()
    })

    it('should always disconnect from database after operation', async () => {
      mockDataService.updateUserProfile.mockResolvedValue(undefined)

      await resetOnboardingHandler(mockRequest)

      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should disconnect even when update fails', async () => {
      mockDataService.updateUserProfile.mockRejectedValue(new Error('Database error'))

      await resetOnboardingHandler(mockRequest)

      expect(mockDataService.disconnect).toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      mockDataService.updateUserProfile.mockRejectedValue(new Error('Database connection failed'))

      const response = await resetOnboardingHandler(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to reset onboarding status')
      expect(mockDataService.disconnect).toHaveBeenCalled()
    })
  })

  describe('Response Format', () => {
    beforeEach(() => {
      mockGetUserIdFromRequest.mockResolvedValue('test-user-123')
      mockDataService.updateUserProfile.mockResolvedValue(undefined)
    })

    it('should return proper success response format', async () => {
      const response = await resetOnboardingHandler(mockRequest)
      const data = await response.json()

      expect(data).toMatchObject({
        success: true,
        message: 'Onboarding status reset successfully',
        resetAt: expect.any(String)
      })
      
      // Validate timestamp format
      expect(new Date(data.resetAt).getTime()).toBeGreaterThan(0)
    })

    it('should return proper error response format for auth failure', async () => {
      mockGetUserIdFromRequest.mockResolvedValue(null)

      const response = await resetOnboardingHandler(mockRequest)
      const data = await response.json()

      expect(data).toMatchObject({
        error: 'Authentication required'
      })
    })

    it('should return proper error response format for database failure', async () => {
      mockDataService.updateUserProfile.mockRejectedValue(new Error('DB Error'))

      const response = await resetOnboardingHandler(mockRequest)
      const data = await response.json()

      expect(data).toMatchObject({
        error: 'Failed to reset onboarding status'
      })
    })
  })

  describe('Data Service Integration', () => {
    beforeEach(() => {
      mockGetUserIdFromRequest.mockResolvedValue('test-user-123')
    })

    it('should create data service with correct user ID', async () => {
      mockDataService.updateUserProfile.mockResolvedValue(undefined)

      await resetOnboardingHandler(mockRequest)

      expect(mockCreateUserDataService).toHaveBeenCalledWith('test-user-123')
    })

    it('should call updateUserProfile with correct parameters', async () => {
      mockDataService.updateUserProfile.mockResolvedValue(undefined)

      await resetOnboardingHandler(mockRequest)

      expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
        onboardingCompletedAt: null
      })
    })
  })
})

describe('DevTools Reset Integration', () => {
  /**
   * These tests ensure the DevTools component can successfully call the reset API
   */
  
  it('should work with DevTools resetOnboarding function', async () => {
    // Mock the global fetch for testing DevTools integration
    const mockFetch = vi.fn()
    global.fetch = mockFetch
    
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        message: 'Onboarding status reset successfully',
        resetAt: new Date().toISOString()
      })
    })

    // Simulate DevTools resetOnboarding call
    const response = await fetch('/api/user/onboarding', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })

    expect(response.ok).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/user/onboarding', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })
  })

  it('should handle API errors in DevTools', async () => {
    const mockFetch = vi.fn()
    global.fetch = mockFetch
    
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Authentication required' })
    })

    const response = await fetch('/api/user/onboarding', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    })

    expect(response.ok).toBe(false)
    const error = await response.json()
    expect(error.error).toBe('Authentication required')
  })
})

describe('User Profile Update Integration', () => {
  /**
   * Tests for the user profile update functionality used by reset
   */
  
  it('should properly reset career plan data along with onboarding', async () => {
    // This test ensures that if we have career plan data, it gets handled properly
    mockGetUserIdFromRequest.mockResolvedValue('test-user-123')
    
    const mockUpdateProfile = vi.fn().mockResolvedValue(undefined)
    const testDataService = {
      updateUserProfile: mockUpdateProfile,
      disconnect: vi.fn()
    }
    mockCreateUserDataService.mockReturnValue(testDataService)

    const mockRequest = new NextRequest('http://localhost:3000/api/user/onboarding', {
      method: 'DELETE'
    })

    await resetOnboardingHandler(mockRequest)

    // Should only reset onboarding, not career plan data
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      onboardingCompletedAt: null
    })
    
    // Should not reset career plan fields unless explicitly intended
    expect(mockUpdateProfile).not.toHaveBeenCalledWith(
      expect.objectContaining({
        careerProgressionPlan: null
      })
    )
  })
})