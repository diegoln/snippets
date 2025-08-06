/**
 * API endpoint to fetch career guideline templates
 * GET /api/career-guidelines/template?role=engineering&level=senior
 * 
 * Fetches pre-generated career guidelines from the CareerGuidelineTemplate table.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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

    // Fetch template from database
    const template = await prisma.careerGuidelineTemplate.findUnique({
      where: {
        role_level: {
          role: role.toLowerCase(),
          level: level.toLowerCase()
        }
      },
      select: {
        currentLevelPlan: true,
        nextLevelExpectations: true
      }
    })

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
  } finally {
    await prisma.$disconnect()
  }
}