/**
 * Test for DevTools reset onboarding functionality
 * Ensures the reset onboarding button works correctly
 */

import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/user/onboarding/route'
import { getUserIdFromRequest } from '@/lib/auth-utils'
import { createUserDataService } from '@/lib/user-scoped-data'

// Mock dependencies with explicit module paths
jest.mock('../lib/auth-utils', () => ({
  getUserIdFromRequest: jest.fn(),
}))

jest.mock('../lib/user-scoped-data', () => ({
  createUserDataService: jest.fn(),
}))

const mockGetUserIdFromRequest = getUserIdFromRequest as jest.MockedFunction<typeof getUserIdFromRequest>
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

describe('DELETE /api/user/onboarding (Reset Onboarding)', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('should reset onboarding status in development', async () => {
    mockGetUserIdFromRequest.mockResolvedValue('user-123')
    const mockDataService = {
      updateUserProfile: jest.fn().mockResolvedValue({
        id: 'user-123',
        onboardingCompletedAt: null,
      }),
      disconnect: jest.fn(),
    }
    mockCreateUserDataService.mockReturnValue(mockDataService as any)

    const request = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Onboarding status reset successfully')
    expect(data.resetAt).toBeDefined()
    expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
      onboardingCompletedAt: null,
    })
  })

  it('should return 403 in production', async () => {
    process.env.NODE_ENV = 'production'

    const request = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('This endpoint is only available in development and staging environments')
  })

  it('should return 401 if not authenticated', async () => {
    mockGetUserIdFromRequest.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should handle database errors gracefully', async () => {
    mockGetUserIdFromRequest.mockResolvedValue('user-123')
    const mockDataService = {
      updateUserProfile: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      disconnect: jest.fn(),
    }
    mockCreateUserDataService.mockReturnValue(mockDataService as any)

    const request = new NextRequest('http://localhost/api/user/onboarding', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to reset onboarding status')
    expect(mockDataService.disconnect).toHaveBeenCalled()
  })
})