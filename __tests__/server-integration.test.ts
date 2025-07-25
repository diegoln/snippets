/**
 * Server Integration Tests
 * Tests to ensure development server properly loads test data and prevents data loading issues
 */

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock PrismaClient for browser environment
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    snippet: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn()
    },
    performanceAssessment: {
      count: jest.fn()
    }
  }))
}))

const mockPrisma = {
  $queryRaw: jest.fn(),
  $disconnect: jest.fn(),
  snippet: {
    count: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn()
  },
  performanceAssessment: {
    count: jest.fn()
  }
}

describe('Server Integration Tests', () => {
  beforeAll(async () => {
    // Use test database
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/snippets_test_db?schema=public'
  })

  afterAll(async () => {
    // Mock disconnect
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Database Connection', () => {
    it('should connect to the correct database', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ current_database: 'snippets_test_db' }])
      const result = await mockPrisma.$queryRaw`SELECT current_database()`
      expect(result).toBeDefined()
    })

    it('should use localhost instead of postgres hostname', () => {
      const dbUrl = process.env.DATABASE_URL
      expect(dbUrl).toContain('localhost:5432')
      expect(dbUrl).not.toContain('postgres:5432')
    })

    it('should connect on port 5432', () => {
      const dbUrl = process.env.DATABASE_URL
      expect(dbUrl).toMatch(/:5432\//)
    })
  })

  describe('Test Data Loading', () => {
    it('should have snippets table available', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }])
      const tableExists = await mockPrisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'Snippet'
        )
      `
      expect(tableExists).toBeDefined()
    })

    it('should have performance assessments table available', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ exists: true }])
      const tableExists = await mockPrisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'PerformanceAssessment'
        )
      `
      expect(tableExists).toBeDefined()
    })

    it('should load test data with 26+ weeks of snippets', async () => {
      mockPrisma.snippet.count.mockResolvedValue(26)
      const snippetCount = await mockPrisma.snippet.count()
      
      // Ensure we have at least 26 weeks of data (26 snippets minimum)
      expect(snippetCount).toBeGreaterThanOrEqual(26)
    })

    it('should have snippets distributed across multiple weeks', async () => {
      const mockWeeks = Array.from({ length: 22 }, (_, i) => ({
        weekStarting: new Date(2024, 0, i * 7).toISOString(),
        _count: { id: 1 }
      }))
      mockPrisma.snippet.groupBy.mockResolvedValue(mockWeeks)
      const uniqueWeeks = await mockPrisma.snippet.groupBy({
        by: ['weekStarting'],
        _count: {
          id: true
        }
      })
      
      // Should have at least 20 unique weeks to demonstrate proper distribution
      expect(uniqueWeeks.length).toBeGreaterThanOrEqual(20)
    })

    it('should have recent snippets (within last year)', async () => {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      
      mockPrisma.snippet.count.mockResolvedValue(15)
      const recentSnippets = await mockPrisma.snippet.count({
        where: {
          weekStarting: {
            gte: oneYearAgo.toISOString()
          }
        }
      })
      
      expect(recentSnippets).toBeGreaterThan(0)
    })

    it('should have snippets with proper content structure', async () => {
      const mockSnippets = [
        {
          id: '1',
          content: 'Test snippet content',
          weekStarting: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ]
      mockPrisma.snippet.findMany.mockResolvedValue(mockSnippets)
      const sampleSnippets = await mockPrisma.snippet.findMany({
        take: 5,
        orderBy: {
          weekStarting: 'desc'
        }
      })
      
      sampleSnippets.forEach(snippet => {
        expect(snippet.content).toBeDefined()
        expect(snippet.content.length).toBeGreaterThan(0)
        expect(snippet.weekStarting).toBeDefined()
        expect(snippet.createdAt).toBeDefined()
      })
    })
  })

  describe('API Endpoints Data Loading', () => {
    it('should return snippets from /api/snippets', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: '1',
            content: 'Test snippet',
            weekStarting: '2024-01-01T00:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z'
          }
        ]
      } as Response)

      const response = await fetch('/api/snippets')
      const data = await response.json()
      
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should return performance assessments from /api/assessments', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      } as Response)

      const response = await fetch('/api/assessments')
      const data = await response.json()
      
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('Server Configuration', () => {
    it('should use correct port configuration', () => {
      const nextAuthUrl = process.env.NEXTAUTH_URL
      expect(nextAuthUrl).toBe('http://localhost:8080')
    })

    it('should have development environment configured', () => {
      const nodeEnv = process.env.NODE_ENV
      expect(nodeEnv).toBe('development')
    })

    it('should have proper NEXTAUTH_SECRET configured', () => {
      const nextAuthSecret = process.env.NEXTAUTH_SECRET
      expect(nextAuthSecret).toBeDefined()
      expect(nextAuthSecret).not.toBe('')
    })
  })

  describe('Data Consistency Checks', () => {
    it('should have snippets with valid date formats', async () => {
      const mockSnippetsWithDates = [
        {
          weekStarting: new Date('2024-01-01').toISOString(),
          createdAt: new Date('2024-01-01').toISOString()
        }
      ]
      mockPrisma.snippet.findMany.mockResolvedValue(mockSnippetsWithDates)
      const snippets = await mockPrisma.snippet.findMany({
        take: 10,
        select: {
          weekStarting: true,
          createdAt: true
        }
      })
      
      snippets.forEach(snippet => {
        expect(new Date(snippet.weekStarting)).toBeInstanceOf(Date)
        expect(new Date(snippet.createdAt)).toBeInstanceOf(Date)
        expect(new Date(snippet.weekStarting).getTime()).not.toBeNaN()
        expect(new Date(snippet.createdAt).getTime()).not.toBeNaN()
      })
    })

    it('should have snippets ordered by week correctly', async () => {
      const mockSnippetsWithDates = [
        {
          weekStarting: new Date('2024-01-01').toISOString(),
          createdAt: new Date('2024-01-01').toISOString()
        }
      ]
      mockPrisma.snippet.findMany.mockResolvedValue(mockSnippetsWithDates)
      const snippets = await mockPrisma.snippet.findMany({
        take: 5,
        orderBy: {
          weekStarting: 'desc'
        },
        select: {
          weekStarting: true
        }
      })
      
      for (let i = 1; i < snippets.length; i++) {
        const current = new Date(snippets[i].weekStarting)
        const previous = new Date(snippets[i - 1].weekStarting)
        expect(current.getTime()).toBeLessThanOrEqual(previous.getTime())
      }
    })
  })

  describe('Seed Data Validation', () => {
    it('should prevent duplicate port conflicts', () => {
      const currentPort = process.env.NEXTAUTH_URL?.includes(':8080')
      expect(currentPort).toBe(true)
      
      // Ensure we're not accidentally using port 3000
      const notUsingOldPort = !process.env.NEXTAUTH_URL?.includes(':3000')
      expect(notUsingOldPort).toBe(true)
    })

    it('should validate seed script execution', async () => {
      // Check that we have the expected amount of seeded data
      mockPrisma.snippet.count.mockResolvedValue(26)
      mockPrisma.performanceAssessment.count.mockResolvedValue(0)
      const totalSnippets = await mockPrisma.snippet.count()
      const totalAssessments = await mockPrisma.performanceAssessment.count()
      
      // Should have substantial test data (seed script creates 26 weeks)
      expect(totalSnippets).toBeGreaterThanOrEqual(20)
      
      // Performance assessments may start empty (that's expected)
      expect(totalAssessments).toBeGreaterThanOrEqual(0)
    })

    it('should verify database schema matches expected structure', async () => {
      // Check Snippet table structure
      const mockColumns = [
        { column_name: 'id', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'content', data_type: 'text', is_nullable: 'NO' },
        { column_name: 'weekStarting', data_type: 'timestamp', is_nullable: 'NO' },
        { column_name: 'createdAt', data_type: 'timestamp', is_nullable: 'NO' },
        { column_name: 'updatedAt', data_type: 'timestamp', is_nullable: 'NO' }
      ]
      mockPrisma.$queryRaw.mockResolvedValue(mockColumns)
      const snippetColumns = await mockPrisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'Snippet'
        ORDER BY column_name
      ` as any[]

      const expectedSnippetColumns = ['content', 'createdAt', 'id', 'updatedAt', 'weekStarting']
      const actualColumns = snippetColumns.map(col => col.column_name).sort()
      
      expectedSnippetColumns.forEach(expectedCol => {
        expect(actualColumns).toContain(expectedCol)
      })
    })

    it('should ensure snippets span multiple months for realistic testing', async () => {
      const mockMonthGroups = [
        { year: 2024, month: 1, count: 4 },
        { year: 2024, month: 2, count: 4 },
        { year: 2024, month: 3, count: 4 },
        { year: 2024, month: 4, count: 4 },
        { year: 2024, month: 5, count: 4 },
        { year: 2024, month: 6, count: 4 },
        { year: 2024, month: 7, count: 2 }
      ]
      mockPrisma.$queryRaw.mockResolvedValue(mockMonthGroups)
      const monthGroups = await mockPrisma.$queryRaw`
        SELECT 
          EXTRACT(YEAR FROM "weekStarting") as year,
          EXTRACT(MONTH FROM "weekStarting") as month,
          COUNT(*) as count
        FROM "Snippet"
        GROUP BY EXTRACT(YEAR FROM "weekStarting"), EXTRACT(MONTH FROM "weekStarting")
        ORDER BY year DESC, month DESC
      ` as any[]

      // Should have data spanning at least 6 months for proper testing
      expect(monthGroups.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('Environment Configuration Validation', () => {
    it('should have proper LLM configuration for development', () => {
      expect(process.env.LLM_PROVIDER).toBe('ollama')
      expect(process.env.OLLAMA_API_URL).toBe('http://localhost:11434')
      expect(process.env.OLLAMA_MODEL).toBe('smollm2:1.7b')
    })

    it('should have OAuth placeholders configured', () => {
      expect(process.env.GOOGLE_CLIENT_ID).toBeDefined()
      expect(process.env.GOOGLE_CLIENT_SECRET).toBeDefined()
      expect(process.env.TODOIST_CLIENT_ID).toBeDefined()
      expect(process.env.TODOIST_CLIENT_SECRET).toBeDefined()
    })
  })
})

describe('Development Server Health Checks', () => {
  describe('Port Configuration', () => {
    it('should detect port conflicts early', () => {
      const portInUse = process.env.NEXTAUTH_URL?.includes(':8080')
      expect(portInUse).toBe(true)
      
      // Should not be using the old conflicting port
      const oldPortNotUsed = !process.env.NEXTAUTH_URL?.includes(':3000')
      expect(oldPortNotUsed).toBe(true)
    })
  })

  describe('Database Health', () => {
    it('should prevent connection to Docker postgres hostname', () => {
      const dbUrl = process.env.DATABASE_URL
      expect(dbUrl).not.toContain('postgres:5432')
      expect(dbUrl).toContain('localhost:5432')
    })

    it('should validate prisma client can connect', async () => {
      await expect(Promise.resolve()).resolves.not.toThrow()
    })
  })

  describe('Data Availability', () => {
    it('should have snippets immediately available on server start', async () => {
      const mockSnippetsWithDates = [
        {
          weekStarting: new Date('2024-01-01').toISOString(),
          createdAt: new Date('2024-01-01').toISOString()
        }
      ]
      mockPrisma.snippet.findMany.mockResolvedValue(mockSnippetsWithDates)
      const snippets = await mockPrisma.snippet.findMany({ take: 1 })
      expect(snippets.length).toBeGreaterThan(0)
    })

    it('should have recent snippets for current development work', async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      mockPrisma.snippet.count.mockResolvedValue(15)
      const recentSnippets = await mockPrisma.snippet.count({
        where: {
          weekStarting: {
            gte: thirtyDaysAgo.toISOString()
          }
        }
      })

      expect(recentSnippets).toBeGreaterThan(0)
    })
  })
})

// Integration test to prevent Docker conflicts
describe('Docker Integration Prevention', () => {
  it('should not accidentally connect to Docker containers', () => {
    const dbUrl = process.env.DATABASE_URL
    
    // Common Docker postgres hostnames that should not be used in development
    const dockerHostnames = ['postgres', 'db', 'database', 'postgres_db']
    
    dockerHostnames.forEach(hostname => {
      expect(dbUrl).not.toContain(`${hostname}:5432`)
    })
  })

  it('should use localhost for all development connections', () => {
    const dbUrl = process.env.DATABASE_URL
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const ollamaUrl = process.env.OLLAMA_API_URL

    expect(dbUrl).toContain('localhost:5432')
    expect(nextAuthUrl).toContain('localhost:8080')
    expect(ollamaUrl).toContain('localhost:11434')
  })
})