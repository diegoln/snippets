/**
 * Tests for user profile API endpoint
 * Ensures custom roles and levels are accepted without validation
 */

import { NextRequest } from 'next/server'
import { PUT } from './route'
import { getUserIdFromRequest } from '@/lib/auth-utils'
import { createUserDataService } from '@/lib/user-scoped-data'

// Mock dependencies
jest.mock('@/lib/auth-utils')
jest.mock('@/lib/user-scoped-data')

const mockGetUserIdFromRequest = getUserIdFromRequest as jest.MockedFunction<typeof getUserIdFromRequest>
const mockCreateUserDataService = createUserDataService as jest.MockedFunction<typeof createUserDataService>

describe('PUT /api/user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should accept custom job titles beyond the predefined list', async () => {
    mockGetUserIdFromRequest.mockResolvedValue('user-123')
    const mockDataService = {
      updateUserProfile: jest.fn().mockResolvedValue({
        id: 'user-123',
        jobTitle: 'Solutions Architect',
        seniorityLevel: 'Lead',
      }),
      disconnect: jest.fn(),
    }
    mockCreateUserDataService.mockReturnValue(mockDataService as any)

    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Solutions Architect',
        seniorityLevel: 'Lead',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jobTitle).toBe('Solutions Architect')
    expect(data.seniorityLevel).toBe('Lead')
    expect(mockDataService.updateUserProfile).toHaveBeenCalledWith({
      jobTitle: 'Solutions Architect',
      seniorityLevel: 'Lead',
    })
  })

  it('should accept custom seniority levels beyond the predefined list', async () => {
    mockGetUserIdFromRequest.mockResolvedValue('user-123')
    const mockDataService = {
      updateUserProfile: jest.fn().mockResolvedValue({
        id: 'user-123',
        jobTitle: 'DevOps Engineer',
        seniorityLevel: 'Principal Consultant',
      }),
      disconnect: jest.fn(),
    }
    mockCreateUserDataService.mockReturnValue(mockDataService as any)

    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'DevOps Engineer',
        seniorityLevel: 'Principal Consultant',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jobTitle).toBe('DevOps Engineer')
    expect(data.seniorityLevel).toBe('Principal Consultant')
  })

  it('should still accept predefined values', async () => {
    mockGetUserIdFromRequest.mockResolvedValue('user-123')
    const mockDataService = {
      updateUserProfile: jest.fn().mockResolvedValue({
        id: 'user-123',
        jobTitle: 'engineering',
        seniorityLevel: 'senior',
      }),
      disconnect: jest.fn(),
    }
    mockCreateUserDataService.mockReturnValue(mockDataService as any)

    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'engineering',
        seniorityLevel: 'senior',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.jobTitle).toBe('engineering')
    expect(data.seniorityLevel).toBe('senior')
  })

  it('should require both jobTitle and seniorityLevel', async () => {
    mockGetUserIdFromRequest.mockResolvedValue('user-123')

    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Solutions Architect',
        // Missing seniorityLevel
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Job title and seniority level are required')
  })

  it('should return 401 if not authenticated', async () => {
    mockGetUserIdFromRequest.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobTitle: 'Solutions Architect',
        seniorityLevel: 'Lead',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })
})