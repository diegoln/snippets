/**
 * API endpoint to fetch career guideline templates
 * GET /api/career-guidelines/template?role=engineering&level=senior
 * 
 * Note: This is a mock implementation for development/testing.
 * In production, this would fetch from a careerGuidelineTemplate table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const level = searchParams.get('level')

    if (!role || !level) {
      return NextResponse.json(
        { error: 'Missing required parameters: role and level' },
        { status: 400 }
      )
    }

    // Mock template data for standard role/level combinations
    const templates: Record<string, Record<string, { currentLevelPlan: string; nextLevelExpectations: string }>> = {
      engineering: {
        junior: {
          currentLevelPlan: 'Focus on learning core technologies and contributing to small features under guidance.',
          nextLevelExpectations: 'Take ownership of medium-sized features and mentor other junior developers.'
        },
        mid: {
          currentLevelPlan: 'Own feature development end-to-end and contribute to technical decisions.',
          nextLevelExpectations: 'Lead complex projects and provide technical guidance to the team.'
        },
        senior: {
          currentLevelPlan: 'Lead technical initiatives and mentor other engineers.',
          nextLevelExpectations: 'Drive architectural decisions and lead multiple teams or projects.'
        },
        staff: {
          currentLevelPlan: 'Set technical direction for multiple teams and drive organizational impact.',
          nextLevelExpectations: 'Influence engineering culture and strategy across the entire organization.'
        },
        principal: {
          currentLevelPlan: 'Define technical strategy and architecture at organizational scale.',
          nextLevelExpectations: 'Lead engineering excellence and innovation across the company.'
        }
      },
      product: {
        junior: {
          currentLevelPlan: 'Support product development by conducting user research and feature analysis.',
          nextLevelExpectations: 'Own small product areas and collaborate effectively with engineering teams.'
        },
        mid: {
          currentLevelPlan: 'Own product roadmap for specific features and drive user experience improvements.',
          nextLevelExpectations: 'Lead product strategy for larger product areas and coordinate cross-functional initiatives.'
        },
        senior: {
          currentLevelPlan: 'Define product strategy and lead cross-functional teams to deliver business outcomes.',
          nextLevelExpectations: 'Drive product vision and strategy across multiple product lines.'
        }
      },
      design: {
        junior: {
          currentLevelPlan: 'Create high-quality designs for features under guidance and learn design systems.',
          nextLevelExpectations: 'Own design for product areas and contribute to design system evolution.'
        },
        mid: {
          currentLevelPlan: 'Lead design for product areas and collaborate with product and engineering teams.',
          nextLevelExpectations: 'Drive design strategy and mentor other designers.'
        },
        senior: {
          currentLevelPlan: 'Set design direction and lead design thinking across multiple product areas.',
          nextLevelExpectations: 'Define design culture and strategy at organizational level.'
        }
      }
    }

    const roleKey = role.toLowerCase()
    const levelKey = level.toLowerCase()
    
    const template = templates[roleKey]?.[levelKey]

    if (!template) {
      return NextResponse.json(
        { error: 'No template found for this role and level combination' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      currentLevelPlan: template.currentLevelPlan,
      nextLevelExpectations: template.nextLevelExpectations,
      isTemplate: true
    })

  } catch (error) {
    console.error('Error fetching career guideline template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch career guideline template' },
      { status: 500 }
    )
  }
}