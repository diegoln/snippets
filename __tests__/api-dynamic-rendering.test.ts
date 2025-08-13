/**
 * API Route Dynamic Rendering Test Suite
 * 
 * This test suite verifies that all API routes using environment detection
 * are properly configured for dynamic rendering. This prevents Next.js from
 * statically optimizing these routes at build time.
 * 
 * BACKGROUND:
 * -----------
 * Next.js 13+ App Router aggressively caches and pre-renders API routes
 * for performance. However, environment detection requires runtime execution
 * to work correctly in staging/production environments.
 * 
 * Without `export const dynamic = 'force-dynamic'`, routes will be cached
 * at build time with build-time environment values, causing staging to
 * always detect as 'production'.
 * 
 * This test suite would have caught the staging banner issue where
 * the /api/environment route was returning cached 'production' values
 * even when running in the staging environment.
 */

import fs from 'fs'
import path from 'path'

describe('API Route Dynamic Rendering Configuration', () => {
  const API_DIR = path.join(process.cwd(), 'app', 'api')
  
  // List of functions that require runtime environment detection
  const ENVIRONMENT_DETECTION_FUNCTIONS = [
    'getEnvironmentMode',
    'isDevelopment',
    'isStaging',
    'isProduction',
    'isDevLike',
    'shouldUseMockAuth',
    'shouldUseMockIntegrations',
    'shouldShowDevTools'
  ]

  /**
   * Helper function to check if a file uses environment detection
   */
  function usesEnvironmentDetection(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return ENVIRONMENT_DETECTION_FUNCTIONS.some(func => 
        content.includes(func)
      )
    } catch {
      return false
    }
  }

  /**
   * Helper function to check if a route has dynamic configuration
   */
  function hasDynamicConfiguration(filePath: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return content.includes("export const dynamic = 'force-dynamic'")
    } catch {
      return false
    }
  }

  /**
   * Recursively find all route.ts files in the API directory
   */
  function findRouteFiles(dir: string): string[] {
    const files: string[] = []
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          // Skip test directories
          if (entry.name === '__tests__') continue
          files.push(...findRouteFiles(fullPath))
        } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
          files.push(fullPath)
        }
      }
    } catch (error) {
      console.warn(`Could not read directory ${dir}:`, error)
    }
    
    return files
  }

  /**
   * Main test: Verify all environment-dependent routes have dynamic configuration
   */
  it('should have dynamic configuration for all routes using environment detection', () => {
    const routeFiles = findRouteFiles(API_DIR)
    const issues: string[] = []
    
    for (const routeFile of routeFiles) {
      if (usesEnvironmentDetection(routeFile)) {
        if (!hasDynamicConfiguration(routeFile)) {
          const relativePath = path.relative(process.cwd(), routeFile)
          issues.push(relativePath)
        }
      }
    }
    
    if (issues.length > 0) {
      const message = `
        The following API routes use environment detection but are missing dynamic configuration:
        ${issues.map(f => `  - ${f}`).join('\n')}
        
        Add these exports to each file:
        
        export const dynamic = 'force-dynamic'
        export const revalidate = 0
        
        Without this configuration, Next.js will cache these routes at build time,
        causing them to always return build-time environment values (e.g., 'production')
        even when running in staging or development environments.
      `
      fail(message)
    }
  })

  /**
   * Test specific known environment-dependent routes
   */
  describe('Known Environment-Dependent Routes', () => {
    const REQUIRED_DYNAMIC_ROUTES = [
      'app/api/environment/route.ts',
      'app/api/auth/[...nextauth]/route.ts',
      'app/api/auth/mock-users/route.ts',
      'app/api/health/schema/route.ts',
      'app/api/staging/reset/route.ts'
    ]

    REQUIRED_DYNAMIC_ROUTES.forEach(routePath => {
      it(`${routePath} should have dynamic configuration`, () => {
        const fullPath = path.join(process.cwd(), routePath)
        
        // Skip if file doesn't exist (might be in different environment)
        if (!fs.existsSync(fullPath)) {
          console.log(`Skipping ${routePath} - file not found`)
          return
        }
        
        const content = fs.readFileSync(fullPath, 'utf-8')
        
        // Check for dynamic export
        expect(content).toContain("export const dynamic = 'force-dynamic'")
        
        // Check for revalidate export
        expect(content).toContain('export const revalidate = 0')
        
        // Verify it uses environment detection (sanity check)
        const usesEnvDetection = ENVIRONMENT_DETECTION_FUNCTIONS.some(func => 
          content.includes(func)
        )
        expect(usesEnvDetection).toBe(true)
      })
    })
  })

  /**
   * Test that routes without environment detection don't unnecessarily have dynamic config
   */
  it('should not have unnecessary dynamic configuration on routes without environment detection', () => {
    const routeFiles = findRouteFiles(API_DIR)
    const warnings: string[] = []
    
    for (const routeFile of routeFiles) {
      if (!usesEnvironmentDetection(routeFile) && hasDynamicConfiguration(routeFile)) {
        const relativePath = path.relative(process.cwd(), routeFile)
        // This is just a warning, not a failure
        warnings.push(relativePath)
      }
    }
    
    if (warnings.length > 0) {
      console.warn(`
        The following routes have dynamic configuration but don't use environment detection.
        Consider removing 'export const dynamic' if not needed for performance:
        ${warnings.map(f => `  - ${f}`).join('\n')}
      `)
    }
  })
})

/**
 * Test for Next.js caching behavior indicators
 */
describe('Next.js Caching Behavior Tests', () => {
  it('should detect when a route might be statically optimized', () => {
    // This test checks for patterns that indicate static optimization
    const API_DIR = path.join(process.cwd(), 'app', 'api')
    
    function findRouteFiles(dir: string): string[] {
      const files: string[] = []
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true })
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)
          if (entry.isDirectory() && entry.name !== '__tests__') {
            files.push(...findRouteFiles(fullPath))
          } else if (entry.name === 'route.ts') {
            files.push(fullPath)
          }
        }
      } catch {}
      return files
    }
    
    const routeFiles = findRouteFiles(API_DIR)
    const potentialIssues: string[] = []
    
    for (const routeFile of routeFiles) {
      try {
        const content = fs.readFileSync(routeFile, 'utf-8')
        
        // Check if route uses process.env directly in the route handler
        if (content.includes('process.env.') && 
            !content.includes('dynamic') && 
            !content.includes('revalidate')) {
          
          // Check if it's in a GET handler (most likely to be cached)
          if (content.includes('export async function GET') || 
              content.includes('export function GET')) {
            potentialIssues.push(path.relative(process.cwd(), routeFile))
          }
        }
      } catch {}
    }
    
    if (potentialIssues.length > 0) {
      console.warn(`
        Potential static optimization issues in:
        ${potentialIssues.map(f => `  - ${f}`).join('\n')}
        
        These routes access process.env but might be statically optimized.
        Consider adding dynamic configuration if environment detection is needed.
      `)
    }
  })
})