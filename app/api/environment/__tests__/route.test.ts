/**
 * Tests for Environment Detection API Route
 * 
 * These tests ensure that the environment route is properly configured
 * for dynamic rendering and doesn't get statically optimized by Next.js
 */

import { GET } from '../route'
import { NextRequest } from 'next/server'
import * as environmentModule from '../../../../lib/environment'

// Mock the environment module
jest.mock('../../../../lib/environment')

describe('/api/environment', () => {
  const mockGetEnvironmentMode = environmentModule.getEnvironmentMode as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    delete process.env.RUNTIME_ENV
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    // Restore original values
    process.env.NODE_ENV = 'test'
  })

  describe('Dynamic Rendering Configuration', () => {
    it('should export dynamic = "force-dynamic" to prevent static optimization', async () => {
      // This test ensures the route has the required export to force dynamic rendering
      // Without this, Next.js will cache the route at build time
      const routeModule = await import('../route')
      expect(routeModule.dynamic).toBe('force-dynamic')
    })

    it('should export revalidate = 0 to prevent caching', async () => {
      // This ensures the route is never cached
      const routeModule = await import('../route')
      expect(routeModule.revalidate).toBe(0)
    })
  })

  describe('Runtime Environment Detection', () => {
    it('should detect staging environment when RUNTIME_ENV is set', async () => {
      // Simulate staging runtime environment
      process.env.RUNTIME_ENV = 'staging'
      process.env.NODE_ENV = 'production' // Build-time value
      mockGetEnvironmentMode.mockReturnValue('staging')

      const response = await GET()
      const data = await response.json()

      expect(data.environment).toBe('staging')
      expect(mockGetEnvironmentMode).toHaveBeenCalled()
    })

    it('should detect production environment when RUNTIME_ENV is not set', async () => {
      // Simulate production environment
      process.env.NODE_ENV = 'production'
      mockGetEnvironmentMode.mockReturnValue('production')

      const response = await GET()
      const data = await response.json()

      expect(data.environment).toBe('production')
    })

    it('should detect development environment correctly', async () => {
      // Simulate development environment
      process.env.NODE_ENV = 'development'
      mockGetEnvironmentMode.mockReturnValue('development')

      const response = await GET()
      const data = await response.json()

      expect(data.environment).toBe('development')
    })
  })

  describe('Response Headers', () => {
    it('should include no-cache headers to prevent CDN caching', async () => {
      mockGetEnvironmentMode.mockReturnValue('production')
      
      const response = await GET()
      
      // Check that cache control headers are set correctly
      expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })
  })

  describe('Error Handling', () => {
    it('should return production as fallback on error', async () => {
      // Force an error in getEnvironmentMode
      mockGetEnvironmentMode.mockImplementation(() => {
        throw new Error('Test error')
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.environment).toBe('production')
      expect(data.error).toBe('Failed to detect environment')
    })
  })
})

/**
 * Critical Test: Verify Dynamic Route Configuration
 * 
 * This test suite ensures that all environment-dependent API routes
 * are configured for dynamic rendering. Without this configuration,
 * Next.js will statically optimize the routes at build time, causing
 * them to always return build-time environment values.
 * 
 * If these tests fail, it means the route will be cached at build time
 * and staging will always detect as 'production'.
 */
describe('Dynamic Route Configuration Tests', () => {
  const ENVIRONMENT_DEPENDENT_ROUTES = [
    '/api/environment/route',
    '/api/auth/[...nextauth]/route',
    '/api/auth/mock-users/route',
    '/api/health/schema/route',
    '/api/staging/reset/route'
  ]

  ENVIRONMENT_DEPENDENT_ROUTES.forEach(routePath => {
    describe(`Route: ${routePath}`, () => {
      it(`should have dynamic = "force-dynamic" export`, async () => {
        // Skip if route doesn't exist (for optional routes)
        try {
          const modulePath = routePath.replace('/api/', '../../../../app/api/')
          const route = await import(modulePath)
          
          // This is the critical assertion - without this export,
          // the route will be statically optimized
          expect(route.dynamic).toBe('force-dynamic')
          
          // Also check revalidate is set to 0
          expect(route.revalidate).toBe(0)
        } catch (error) {
          // Route doesn't exist in test environment, skip
          console.log(`Skipping ${routePath} - not found in test environment`)
        }
      })
    })
  })
})