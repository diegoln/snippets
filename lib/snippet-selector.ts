import { PrismaClient } from '@prisma/client'

export interface SnippetData {
  id: string
  weekNumber: number
  startDate: string
  endDate: string
  content: string
}

export interface UserProfile {
  id: string
  email: string
  name: string | null
  jobTitle: string | null
  seniorityLevel: string | null
  performanceFeedback: string | null
}

/**
 * Service for selecting and filtering weekly snippets for performance assessments
 */
export class SnippetSelector {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
  }

  /**
   * Get snippets within a specific date range for performance assessment
   */
  async getSnippetsInTimeframe(
    userId: string,
    startDate: string, // YYYY-MM-DD format
    endDate: string    // YYYY-MM-DD format
  ): Promise<SnippetData[]> {
    try {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      // Adjust end date to end of day for inclusive range
      end.setHours(23, 59, 59, 999)

      const snippets = await this.prisma.weeklySnippet.findMany({
        where: {
          userId,
          OR: [
            // Snippet starts within the assessment period
            {
              startDate: {
                gte: start,
                lte: end
              }
            },
            // Snippet ends within the assessment period
            {
              endDate: {
                gte: start,
                lte: end
              }
            },
            // Snippet spans the entire assessment period
            {
              startDate: {
                lte: start
              },
              endDate: {
                gte: end
              }
            }
          ]
        },
        orderBy: {
          startDate: 'asc'
        },
        select: {
          id: true,
          weekNumber: true,
          startDate: true,
          endDate: true,
          content: true
        }
      })

      // Convert dates to string format for consistent handling
      return snippets.map(snippet => ({
        id: snippet.id,
        weekNumber: snippet.weekNumber,
        startDate: snippet.startDate.toISOString().split('T')[0],
        endDate: snippet.endDate.toISOString().split('T')[0],
        content: snippet.content
      }))

    } catch (error) {
      console.error('Error fetching snippets in timeframe:', error)
      throw new Error('Failed to fetch snippets for assessment period')
    }
  }

  /**
   * Get user profile information for assessment context
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          jobTitle: true,
          seniorityLevel: true,
          performanceFeedback: true
        }
      })

      return user
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw new Error('Failed to fetch user profile')
    }
  }

  /**
   * Get user by email (for development with test user)
   */
  async getUserByEmail(email: string): Promise<UserProfile | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          jobTitle: true,
          seniorityLevel: true,
          performanceFeedback: true
        }
      })

      return user
    } catch (error) {
      console.error('Error fetching user by email:', error)
      throw new Error('Failed to fetch user by email')
    }
  }

  /**
   * Filter snippets that have meaningful content (not empty or placeholder)
   */
  filterMeaningfulSnippets(snippets: SnippetData[]): SnippetData[] {
    return snippets.filter(snippet => {
      const content = snippet.content.trim()
      
      // Skip empty snippets
      if (!content) return false
      
      // Skip placeholder or very short snippets
      if (content.length < 20) return false
      
      // Skip common placeholder patterns
      const placeholderPatterns = [
        /^(todo|placeholder|tbd|nothing|n\/a|none)$/i,
        /^this week i (did|worked)/i
      ]
      
      return !placeholderPatterns.some(pattern => pattern.test(content))
    })
  }

  /**
   * Calculate assessment statistics
   */
  getAssessmentStats(snippets: SnippetData[]): {
    totalWeeks: number
    dateRange: { start: string, end: string }
    contentLength: number
  } {
    if (snippets.length === 0) {
      return {
        totalWeeks: 0,
        dateRange: { start: '', end: '' },
        contentLength: 0
      }
    }

    // Sort by start date to get proper range
    const sorted = [...snippets].sort((a, b) => a.startDate.localeCompare(b.startDate))
    
    return {
      totalWeeks: snippets.length,
      dateRange: {
        start: sorted[0].startDate,
        end: sorted[sorted.length - 1].endDate
      },
      contentLength: snippets.reduce((total, snippet) => total + snippet.content.length, 0)
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}