/**
 * Mock Database for Local Development
 * 
 * This module provides an in-memory database implementation for local development.
 * It mimics the Prisma database operations without requiring a real database connection.
 */

interface MockUser {
  id: string
  email: string
  name: string
  createdAt: Date
}

interface MockSnippet {
  id: string
  userId: string
  weekNumber: number
  startDate: Date
  endDate: Date
  content: string
  createdAt: Date
  updatedAt: Date
}

class MockDatabase {
  private users: MockUser[] = []
  private snippets: MockSnippet[] = []
  private nextId = 1

  constructor() {
    // Initialize with test user
    this.users.push({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date()
    })
  }

  async findUserByEmail(email: string): Promise<MockUser | null> {
    return this.users.find(user => user.email === email) || null
  }

  async findAllSnippets(userId: string): Promise<MockSnippet[]> {
    return this.snippets
      .filter(snippet => snippet.userId === userId)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime()) // Most recent first
  }

  async createSnippet(data: {
    userId: string
    weekNumber: number
    startDate: Date
    endDate: Date
    content: string
  }): Promise<MockSnippet> {
    const snippet: MockSnippet = {
      id: this.nextId.toString(),
      userId: data.userId,
      weekNumber: data.weekNumber,
      startDate: data.startDate,
      endDate: data.endDate,
      content: data.content,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.nextId++
    this.snippets.push(snippet)
    
    return snippet
  }

  async updateSnippet(id: string, content: string): Promise<MockSnippet | null> {
    const snippet = this.snippets.find(s => s.id === id)
    if (!snippet) {
      return null
    }
    
    snippet.content = content
    snippet.updatedAt = new Date()
    
    return snippet
  }
}

// Singleton instance
let mockDatabase: MockDatabase | null = null

/**
 * Get the mock database instance
 */
export function getMockDatabase(): MockDatabase {
  if (!mockDatabase) {
    mockDatabase = new MockDatabase()
  }
  return mockDatabase
}

/**
 * Determine if we should use the mock database
 * Uses mock database when DATABASE_URL is not available or in development mode
 */
export function shouldUseMockDatabase(): boolean {
  return !process.env.DATABASE_URL || process.env.NODE_ENV === 'development'
}