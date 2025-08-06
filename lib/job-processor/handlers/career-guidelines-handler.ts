/**
 * Career Guidelines Generation Handler - Pure Business Logic
 * 
 * Handles career guidelines generation without any infrastructure concerns.
 * Works identically in development, staging, and production environments.
 */

import { JobHandler, JobContext } from '../types'
import { llmProxy } from '../../llmproxy'
import { buildCareerPlanPrompt } from '../../../app/api/jobs/career-plan/career-plan-prompt'
import { getNextSeniorityLevel } from '../../../app/api/jobs/career-plan/seniority-levels'

export interface CareerGuidelinesInput {
  role: string
  level: string
  companyLadder?: string
}

export interface CareerGuidelinesOutput {
  currentLevelPlan: string
  nextLevelExpectations: string
  generatedAt: Date
}

export class CareerGuidelinesHandler implements JobHandler<CareerGuidelinesInput, CareerGuidelinesOutput> {
  readonly jobType = 'career_plan_generation'
  readonly estimatedDuration = 30 // seconds

  async process(input: CareerGuidelinesInput, context: JobContext): Promise<CareerGuidelinesOutput> {
    const { role, level, companyLadder } = input
    const { updateProgress } = context

    console.log(`🤖 Generating career guidelines for ${level} ${role}`)
    
    // Update progress: Starting generation
    await updateProgress(10, 'Starting career guidelines generation...')

    // Generate current level expectations
    await updateProgress(20, `Analyzing expectations for ${level} ${role}...`)
    
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

    await updateProgress(50, 'Current level analysis complete...')

    // Generate next level expectations with current level as context
    const nextLevel = getNextSeniorityLevel(level)
    await updateProgress(60, `Analyzing next level expectations for ${nextLevel}...`)
    
    const nextLevelPrompt = buildCareerPlanPrompt({ 
      role, 
      level: nextLevel, 
      companyLadder,
      currentLevelGuidelines: currentLevelResponse.content.trim()
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
        targetLevel: 'next',
        currentLevelGuidelines: currentLevelResponse.content.trim()
      }
    })

    await updateProgress(90, 'Finalizing career guidelines...')

    const result: CareerGuidelinesOutput = {
      currentLevelPlan: currentLevelResponse.content.trim(),
      nextLevelExpectations: nextLevelResponse.content.trim(),
      generatedAt: new Date()
    }

    await updateProgress(100, 'Career guidelines generation complete!')
    
    console.log(`✅ Career guidelines generation completed for ${level} ${role}`)
    
    return result
  }
}