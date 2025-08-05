/**
 * API endpoint to generate career guidelines synchronously
 * POST /api/career-guidelines/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { llmProxy } from '../../../../lib/llmproxy'
import { buildCareerPlanPrompt } from '../../jobs/career-plan/career-plan-prompt'
import { getNextSeniorityLevel } from '../../jobs/career-plan/seniority-levels'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { role, level, companyLadder } = body

    if (!role || !level) {
      return NextResponse.json(
        { error: 'Missing required fields: role and level' },
        { status: 400 }
      )
    }

    console.log(`🤖 Generating career guidelines for ${level} ${role}`)

    // Generate current level expectations
    const currentLevelPrompt = buildCareerPlanPrompt({ role, level, companyLadder })
    const currentLevelResponse = await llmProxy.request({
      prompt: currentLevelPrompt,
      temperature: 0.7,
      maxTokens: 1500,
      context: { 
        role, 
        level, 
        companyLadder,
        operationType: 'career_guidelines_generation',
        targetLevel: 'current'
      }
    })

    // Generate next level expectations
    const nextLevel = getNextSeniorityLevel(level)
    const nextLevelPrompt = buildCareerPlanPrompt({ 
      role, 
      level: nextLevel, 
      companyLadder 
    })
    
    const nextLevelResponse = await llmProxy.request({
      prompt: nextLevelPrompt,
      temperature: 0.7,
      maxTokens: 1500,
      context: { 
        role, 
        level: nextLevel, 
        companyLadder,
        operationType: 'career_guidelines_generation',
        targetLevel: 'next'
      }
    })

    console.log(`✅ Career guidelines generation completed for ${level} ${role}`)

    return NextResponse.json({
      currentLevelPlan: currentLevelResponse.content.trim(),
      nextLevelExpectations: nextLevelResponse.content.trim(),
      isGenerated: true
    })

  } catch (error) {
    console.error('Error generating career guidelines:', error)
    return NextResponse.json(
      { error: 'Failed to generate career guidelines' },
      { status: 500 }
    )
  }
}