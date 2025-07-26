import { PrismaClient } from '@prisma/client'

/**
 * User-scoped data service for secure multi-user data access
 * 
 * This service ensures all database operations are scoped to a specific user,
 * preventing cross-user data access and maintaining data isolation.
 * 
 * Usage:
 *   const dataService = new UserScopedDataService(userId)
 *   const snippets = await dataService.getSnippets()
 */

export interface SnippetInput {
  weekNumber: number
  startDate: Date
  endDate: Date
  content: string
}

export interface AssessmentInput {
  cycleName: string
  startDate: Date
  endDate: Date
  generatedDraft: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  jobTitle: string | null
  seniorityLevel: string | null
  performanceFeedback: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Prisma client singleton with lazy initialization
 */
let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  }
  return prisma
}

export class UserScopedDataService {
  private prisma: PrismaClient
  private userId: string

  constructor(userId: string) {
    this.userId = userId
    this.prisma = getPrismaClient()
  }

  /**
   * Get user profile information
   */
  async getUserProfile(): Promise<UserProfile | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: this.userId },
        select: {
          id: true,
          email: true,
          name: true,
          jobTitle: true,
          seniorityLevel: true,
          performanceFeedback: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return user
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw new Error('Failed to fetch user profile')
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(data: Partial<Pick<UserProfile, 'name' | 'jobTitle' | 'seniorityLevel' | 'performanceFeedback'>>): Promise<UserProfile> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: this.userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          jobTitle: true,
          seniorityLevel: true,
          performanceFeedback: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return updatedUser
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw new Error('Failed to update user profile')
    }
  }

  /**
   * Get all weekly snippets for the user
   */
  async getSnippets() {
    try {
      const snippets = await this.prisma.weeklySnippet.findMany({
        where: { userId: this.userId },
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          content: true,
          extractedTasks: true,
          extractedMeetings: true,
          aiSuggestions: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return snippets
    } catch (error) {
      console.error('Error fetching snippets:', error)
      throw new Error('Failed to fetch snippets')
    }
  }

  /**
   * Get snippets within a specific date range
   */
  async getSnippetsInDateRange(startDate: Date, endDate: Date) {
    try {
      const snippets = await this.prisma.weeklySnippet.findMany({
        where: {
          userId: this.userId,
          OR: [
            // Snippet starts within the range
            {
              startDate: {
                gte: startDate,
                lte: endDate
              }
            },
            // Snippet ends within the range
            {
              endDate: {
                gte: startDate,
                lte: endDate
              }
            },
            // Snippet spans the entire range
            {
              startDate: { lte: startDate },
              endDate: { gte: endDate }
            }
          ]
        },
        orderBy: { startDate: 'asc' },
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          content: true,
          extractedTasks: true,
          extractedMeetings: true,
          aiSuggestions: true
        }
      })

      return snippets
    } catch (error) {
      console.error('Error fetching snippets in date range:', error)
      throw new Error('Failed to fetch snippets in date range')
    }
  }

  /**
   * Create a new weekly snippet
   */
  async createSnippet(data: SnippetInput) {
    try {
      const snippet = await this.prisma.weeklySnippet.create({
        data: {
          ...data,
          userId: this.userId
        },
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          content: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return snippet
    } catch (error) {
      console.error('Error creating snippet:', error)
      // Preserve the original error for debugging
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to create snippet')
    }
  }

  /**
   * Update an existing snippet (only if owned by user)
   */
  async updateSnippet(snippetId: string, content: string) {
    try {
      // First verify the snippet belongs to this user
      const existingSnippet = await this.prisma.weeklySnippet.findUnique({
        where: { id: snippetId },
        select: { userId: true }
      })

      if (!existingSnippet || existingSnippet.userId !== this.userId) {
        throw new Error('Snippet not found or access denied')
      }

      const updatedSnippet = await this.prisma.weeklySnippet.update({
        where: { id: snippetId },
        data: { content },
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          content: true,
          updatedAt: true
        }
      })

      return updatedSnippet
    } catch (error) {
      console.error('Error updating snippet:', error)
      throw new Error('Failed to update snippet')
    }
  }

  /**
   * Delete a snippet (only if owned by user)
   */
  async deleteSnippet(snippetId: string) {
    try {
      // First verify the snippet belongs to this user
      const existingSnippet = await this.prisma.weeklySnippet.findUnique({
        where: { id: snippetId },
        select: { userId: true }
      })

      if (!existingSnippet || existingSnippet.userId !== this.userId) {
        throw new Error('Snippet not found or access denied')
      }

      await this.prisma.weeklySnippet.delete({
        where: { id: snippetId }
      })

      return true
    } catch (error) {
      console.error('Error deleting snippet:', error)
      throw new Error('Failed to delete snippet')
    }
  }

  /**
   * Get all performance assessments for the user
   */
  async getAssessments() {
    try {
      const assessments = await this.prisma.performanceAssessment.findMany({
        where: { userId: this.userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          cycleName: true,
          startDate: true,
          endDate: true,
          generatedDraft: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return assessments
    } catch (error) {
      console.error('Error fetching assessments:', error)
      throw new Error('Failed to fetch assessments')
    }
  }

  /**
   * Create a new performance assessment
   */
  async createAssessment(data: AssessmentInput) {
    try {
      const assessment = await this.prisma.performanceAssessment.create({
        data: {
          ...data,
          userId: this.userId
        },
        select: {
          id: true,
          cycleName: true,
          startDate: true,
          endDate: true,
          generatedDraft: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return assessment
    } catch (error) {
      console.error('Error creating assessment:', error)
      throw new Error('Failed to create assessment')
    }
  }

  /**
   * Get integrations for the user
   */
  async getIntegrations() {
    try {
      const integrations = await this.prisma.integration.findMany({
        where: { userId: this.userId },
        select: {
          id: true,
          type: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return integrations
    } catch (error) {
      console.error('Error fetching integrations:', error)
      throw new Error('Failed to fetch integrations')
    }
  }

  /**
   * Create or update an integration
   */
  async upsertIntegration(type: string, accessToken: string, refreshToken?: string, expiresAt?: Date) {
    try {
      const integration = await this.prisma.integration.upsert({
        where: {
          userId_type: {
            userId: this.userId,
            type
          }
        },
        create: {
          userId: this.userId,
          type,
          accessToken,
          refreshToken,
          expiresAt
        },
        update: {
          accessToken,
          refreshToken,
          expiresAt
        },
        select: {
          id: true,
          type: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return integration
    } catch (error) {
      console.error('Error upserting integration:', error)
      throw new Error('Failed to save integration')
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}

/**
 * Factory function to create a user-scoped data service
 */
export function createUserDataService(userId: string): UserScopedDataService {
  return new UserScopedDataService(userId)
}