import { PrismaClient } from '@prisma/client'
import { 
  AsyncOperation, 
  AsyncOperationType, 
  AsyncOperationStatus 
} from '../types/async-operations'

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
  year: number
  startDate: Date
  endDate: Date
  content: string
  aiSuggestions?: string
}

export interface AssessmentInput {
  cycleName: string
  startDate: Date
  endDate: Date
  generatedDraft: string
}

export interface AsyncOperationInput {
  operationType: string
  status: AsyncOperationStatus
  inputData?: any
  estimatedDuration?: number
  metadata?: any
}

export interface AsyncOperationUpdate {
  status?: AsyncOperationStatus
  progress?: number
  resultData?: any
  errorMessage?: string
  startedAt?: Date
  completedAt?: Date
}

export interface IntegrationConsolidationInput {
  integrationType: string
  weekNumber: number
  year: number
  weekStart: Date
  weekEnd: Date
  rawData: string
  consolidatedSummary: string
  keyInsights: string
  consolidatedMetrics: string
  consolidatedContext: string
  consolidationPrompt?: string
  llmModel?: string
  processingStatus?: string
  consolidatedAt?: Date
}

export interface IntegrationConsolidationFilters {
  integrationType?: string
  weekStart?: Date
  weekEnd?: Date
  processingStatus?: string
  limit?: number
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  jobTitle: string | null
  seniorityLevel: string | null
  performanceFeedback: string | null
  onboardingCompletedAt: Date | null
  careerProgressionPlan: string | null
  nextLevelExpectations: string | null
  companyCareerLadder: string | null
  careerPlanGeneratedAt: Date | null
  careerPlanLastUpdated: Date | null
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
          onboardingCompletedAt: true,
          careerProgressionPlan: true,
          nextLevelExpectations: true,
          companyCareerLadder: true,
          careerPlanGeneratedAt: true,
          careerPlanLastUpdated: true
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
  async updateUserProfile(data: {
    name?: string
    jobTitle?: string
    seniorityLevel?: string
    performanceFeedback?: string
    onboardingCompletedAt?: Date | null
    careerProgressionPlan?: string
    nextLevelExpectations?: string
    companyCareerLadder?: string
    careerPlanGeneratedAt?: Date
    careerPlanLastUpdated?: Date
  }): Promise<UserProfile | void> {
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
          onboardingCompletedAt: true,
          careerProgressionPlan: true,
          nextLevelExpectations: true,
          companyCareerLadder: true,
          careerPlanGeneratedAt: true,
          careerPlanLastUpdated: true
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
          year: true,
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
          year: true,
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
      // Prevent creation of future snippets
      const { isWeekInFuture, isValidWeekNumber } = await import('./week-utils')
      
      if (!isValidWeekNumber(data.weekNumber)) {
        throw new Error('weekNumber must be a valid week number (1-53)')
      }
      
      if (isWeekInFuture(data.weekNumber, data.year)) {
        throw new Error('Cannot create snippets for future weeks')
      }

      const snippet = await this.prisma.weeklySnippet.upsert({
        where: {
          userId_year_weekNumber: {
            userId: this.userId,
            year: data.year,
            weekNumber: data.weekNumber
          }
        },
        create: {
          ...data,
          userId: this.userId
        },
        update: {
          content: data.content,
          startDate: data.startDate,
          endDate: data.endDate,
          updatedAt: new Date()
        },
        select: {
          id: true,
          weekNumber: true,
          year: true,
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
          year: true,
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
          lastSyncAt: true,
          isActive: true,
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
   * Create a new integration
   */
  async createIntegration(data: {
    type: string
    accessToken: string
    refreshToken?: string | null
    expiresAt?: Date | null
    metadata?: any
    isActive?: boolean
  }) {
    try {
      const integration = await this.prisma.integration.create({
        data: {
          userId: this.userId,
          type: data.type,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          metadata: JSON.stringify(data.metadata || {}),
          isActive: data.isActive ?? true
        },
        select: {
          id: true,
          type: true,
          isActive: true,
          expiresAt: true,
          lastSyncAt: true,
          createdAt: true,
          updatedAt: true
        }
      })

      return integration
    } catch (error) {
      console.error('Error creating integration:', error)
      throw new Error('Failed to create integration')
    }
  }

  /**
   * Delete an integration
   */
  async deleteIntegration(integrationId: string) {
    try {
      await this.prisma.integration.delete({
        where: {
          id: integrationId,
          userId: this.userId // Ensure user can only delete their own integrations
        }
      })
    } catch (error) {
      console.error('Error deleting integration:', error)
      throw new Error('Failed to delete integration')
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
   * Create a new async operation
   */
  async createAsyncOperation(input: AsyncOperationInput): Promise<AsyncOperation> {
    try {
      const operation = await this.prisma.asyncOperation.create({
        data: {
          userId: this.userId,
          operationType: input.operationType,
          status: input.status,
          inputData: JSON.stringify(input.inputData || {}),
          estimatedDuration: input.estimatedDuration,
          metadata: JSON.stringify(input.metadata || {})
        }
      })

      return {
        id: operation.id,
        userId: operation.userId,
        operationType: operation.operationType as AsyncOperationType,
        status: operation.status as AsyncOperationStatus,
        progress: operation.progress,
        inputData: operation.inputData ? JSON.parse(operation.inputData as string) : null,
        resultData: operation.resultData ? JSON.parse(operation.resultData as string) : null,
        errorMessage: operation.errorMessage || undefined,
        createdAt: operation.createdAt,
        startedAt: operation.startedAt || undefined,
        completedAt: operation.completedAt || undefined,
        estimatedDuration: operation.estimatedDuration || undefined,
        metadata: operation.metadata ? JSON.parse(operation.metadata as string) : {}
      }
    } catch (error) {
      console.error('Error creating async operation:', error)
      throw new Error('Failed to create async operation')
    }
  }

  /**
   * Get a specific async operation
   */
  async getAsyncOperation(operationId: string): Promise<AsyncOperation | null> {
    try {
      const operation = await this.prisma.asyncOperation.findFirst({
        where: {
          id: operationId,
          userId: this.userId
        }
      })

      if (!operation) {
        return null
      }

      return {
        id: operation.id,
        userId: operation.userId,
        operationType: operation.operationType as AsyncOperationType,
        status: operation.status as AsyncOperationStatus,
        progress: operation.progress,
        inputData: operation.inputData ? JSON.parse(operation.inputData as string) : null,
        resultData: operation.resultData ? JSON.parse(operation.resultData as string) : null,
        errorMessage: operation.errorMessage || undefined,
        createdAt: operation.createdAt,
        startedAt: operation.startedAt || undefined,
        completedAt: operation.completedAt || undefined,
        estimatedDuration: operation.estimatedDuration || undefined,
        metadata: operation.metadata ? JSON.parse(operation.metadata as string) : {}
      }
    } catch (error) {
      console.error('Error fetching async operation:', error)
      throw new Error('Failed to fetch async operation')
    }
  }

  /**
   * Get user's async operations with optional filtering
   */
  async getAsyncOperations(filters: {
    operationType?: AsyncOperationType
    status?: AsyncOperationStatus
    limit?: number
  } = {}): Promise<AsyncOperation[]> {
    try {
      const operations = await this.prisma.asyncOperation.findMany({
        where: {
          userId: this.userId,
          ...(filters.operationType && { operationType: filters.operationType }),
          ...(filters.status && { status: filters.status })
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: filters.limit || 10
      })

      return operations.map(operation => ({
        id: operation.id,
        userId: operation.userId,
        operationType: operation.operationType as AsyncOperationType,
        status: operation.status as AsyncOperationStatus,
        progress: operation.progress,
        inputData: operation.inputData,
        resultData: operation.resultData,
        errorMessage: operation.errorMessage || undefined,
        createdAt: operation.createdAt,
        startedAt: operation.startedAt || undefined,
        completedAt: operation.completedAt || undefined,
        estimatedDuration: operation.estimatedDuration || undefined,
        metadata: operation.metadata
      }))
    } catch (error) {
      console.error('Error fetching async operations:', error)
      throw new Error('Failed to fetch async operations')
    }
  }

  /**
   * Update an async operation
   */
  async updateAsyncOperation(operationId: string, update: AsyncOperationUpdate): Promise<void> {
    try {
      await this.prisma.asyncOperation.update({
        where: {
          id: operationId,
          userId: this.userId
        },
        data: {
          ...(update.status && { status: update.status }),
          ...(update.progress !== undefined && { progress: update.progress }),
          ...(update.resultData && { resultData: JSON.stringify(update.resultData) }),
          ...(update.errorMessage && { errorMessage: update.errorMessage }),
          ...(update.startedAt && { startedAt: update.startedAt }),
          ...(update.completedAt && { completedAt: update.completedAt })
        }
      })
    } catch (error) {
      console.error('Error updating async operation:', error)
      throw new Error('Failed to update async operation')
    }
  }


  /**
   * Create an integration consolidation record
   */
  async createIntegrationConsolidation(data: IntegrationConsolidationInput) {
    try {
      const consolidation = await this.prisma.integrationConsolidation.create({
        data: {
          userId: this.userId,
          integrationType: data.integrationType,
          weekNumber: data.weekNumber,
          year: data.year,
          weekStart: data.weekStart,
          weekEnd: data.weekEnd,
          rawData: data.rawData,
          consolidatedSummary: data.consolidatedSummary,
          keyInsights: data.keyInsights,
          consolidatedMetrics: data.consolidatedMetrics,
          consolidatedContext: data.consolidatedContext,
          consolidationPrompt: data.consolidationPrompt,
          llmModel: data.llmModel,
          processingStatus: data.processingStatus || 'pending',
          consolidatedAt: data.consolidatedAt
        }
      })

      return consolidation
    } catch (error) {
      console.error('Error creating integration consolidation:', error)
      throw new Error('Failed to create integration consolidation')
    }
  }

  /**
   * Get integration consolidations with filters
   */
  async getIntegrationConsolidations(filters: IntegrationConsolidationFilters = {}) {
    try {
      const where: any = {
        userId: this.userId
      }

      if (filters.integrationType) {
        where.integrationType = filters.integrationType
      }

      if (filters.weekStart) {
        where.weekStart = { gte: filters.weekStart }
      }

      if (filters.weekEnd) {
        where.weekEnd = { lte: filters.weekEnd }
      }

      if (filters.processingStatus) {
        where.processingStatus = filters.processingStatus
      }

      const consolidations = await this.prisma.integrationConsolidation.findMany({
        where,
        orderBy: [
          { year: 'desc' },
          { weekNumber: 'desc' }
        ],
        take: filters.limit
      })

      return consolidations
    } catch (error) {
      console.error('Error fetching integration consolidations:', error)
      throw new Error('Failed to fetch integration consolidations')
    }
  }

  /**
   * Get a specific integration consolidation by ID
   */
  async getIntegrationConsolidationById(consolidationId: string) {
    try {
      const consolidation = await this.prisma.integrationConsolidation.findFirst({
        where: {
          id: consolidationId,
          userId: this.userId
        }
      })
      
      return consolidation
    } catch (error) {
      console.error('Error fetching integration consolidation by ID:', error)
      throw new Error('Failed to fetch integration consolidation')
    }
  }

  /**
   * Update integration consolidation status
   */
  async updateIntegrationConsolidationStatus(consolidationId: string, status: string, errorMessage?: string) {
    try {
      await this.prisma.integrationConsolidation.update({
        where: {
          id: consolidationId,
          userId: this.userId
        },
        data: {
          processingStatus: status,
          ...(errorMessage && { processingError: errorMessage }),
          ...(status === 'completed' && { consolidatedAt: new Date() })
        }
      })
    } catch (error) {
      console.error('Error updating integration consolidation status:', error)
      throw new Error('Failed to update consolidation status')
    }
  }

  /**
   * Get user's OAuth accounts (for integrations)
   */
  async getUserAccounts() {
    try {
      const accounts = await this.prisma.account.findMany({
        where: { userId: this.userId },
        select: {
          id: true,
          provider: true,
          access_token: true,
          refresh_token: true,
          expires_at: true,
          token_type: true,
          scope: true
        }
      })

      return accounts
    } catch (error) {
      console.error('Error fetching user accounts:', error)
      throw new Error('Failed to fetch user accounts')
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (prisma) {
      await this.prisma.$disconnect()
    }
  }
}

/**
 * Factory function to create a user-scoped data service
 */
export function createUserDataService(userId: string): UserScopedDataService {
  return new UserScopedDataService(userId)
}