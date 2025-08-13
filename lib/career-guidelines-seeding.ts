/**
 * Unified Career Guidelines Seeding Service
 * 
 * Shared across all environments (development, staging, production)
 * to ensure consistent career guideline template data.
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

export interface CareerGuidelinesSeedResult {
  created: number
  skipped: number
  total: number
}

/**
 * Seed career guideline templates for any environment
 * @param prisma Optional PrismaClient instance (will create one if not provided)
 * @param silent Optional flag to suppress console output
 */
export async function seedCareerGuidelineTemplates(
  prisma?: PrismaClient,
  silent = false
): Promise<CareerGuidelinesSeedResult> {
  const db = prisma || new PrismaClient()
  const shouldDisconnect = !prisma
  
  try {
    const { execSync } = require('child_process')
    const path = require('path')
    
    // Use the existing working seed script directly
    const seedScriptPath = path.join(__dirname, '..', 'prisma', 'seed-career-guidelines.js')
    
    if (!silent) {
      console.log('📋 Seeding career guideline templates...')
    }
    
    // Close our connection temporarily since the seed script creates its own
    if (shouldDisconnect) {
      await db.$disconnect()
    }
    
    // Run the existing seed script with proper environment
    const stdio = silent ? 'ignore' : 'inherit'
    execSync(`node ${seedScriptPath}`, { 
      stdio,
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    })
    
    // Reconnect to get the count
    const dbForCount = new PrismaClient()
    const templateCount = await dbForCount.careerGuidelineTemplate.count()
    await dbForCount.$disconnect()
    
    if (!silent) {
      console.log(`✅ Career guideline templates seeded (${templateCount} total in database)`)
    }
    
    return { created: 0, skipped: templateCount, total: templateCount }
    
  } catch (error) {
    if (!silent) {
      console.error('❌ Error during career guidelines seeding:', error.message)
    }
    // Don't throw, just return empty result - the system can work without templates
    return { created: 0, skipped: 0, total: 0 }
  } finally {
    if (shouldDisconnect) {
      // No need to disconnect since we already did it above
    }
  }
}

/**
 * Parse the pre-generated guidelines text file into structured data
 * (Extracted from existing seed-career-guidelines.js for consistency)
 */
function parseCareerGuidelines(content: string) {
  // Role mappings to match our constants
  const roleMap = {
    'Software Engineering': 'engineering',
    'Product Management': 'product', 
    'Design': 'design',
    'Data': 'data'
  }
  
  // Level mappings to match our constants
  const levelMap = {
    'Junior': 'junior',
    'Mid-level': 'mid',
    'Senior': 'senior', 
    'Staff': 'staff',
    'Principal': 'principal',
    'Manager': 'manager',
    'Senior Manager': 'senior_manager',
    'Director': 'director'
  }
  
  const lines = content.split('\n')
  const intermediate = {}
  let currentRole = null
  let currentLevel = null
  let currentSection = null
  let currentContent = []
  
  // Pass 1: Parse content into intermediate structure
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Skip empty lines and separators
    if (!trimmedLine || trimmedLine === '---') {
      continue
    }
    
    // Check if this is a role header
    if (Object.keys(roleMap).some(role => trimmedLine.includes(role))) {
      // Finalize previous section if exists
      if (currentRole && currentLevel && currentSection) {
        const key = `${currentRole}-${currentLevel}`
        if (!intermediate[key]) intermediate[key] = {}
        intermediate[key][currentSection] = currentContent.join('\n').trim()
        currentContent = []
      }
      
      // Extract role
      currentRole = null
      for (const [displayRole, internalRole] of Object.entries(roleMap)) {
        if (trimmedLine.includes(displayRole)) {
          currentRole = internalRole
          break
        }
      }
      continue
    }
    
    // Check if this is a level header
    if (Object.keys(levelMap).some(level => trimmedLine.includes(level))) {
      // Finalize previous section if exists
      if (currentRole && currentLevel && currentSection) {
        const key = `${currentRole}-${currentLevel}`
        if (!intermediate[key]) intermediate[key] = {}
        intermediate[key][currentSection] = currentContent.join('\n').trim()
        currentContent = []
      }
      
      // Extract level
      currentLevel = null
      for (const [displayLevel, internalLevel] of Object.entries(levelMap)) {
        if (trimmedLine.includes(displayLevel)) {
          currentLevel = internalLevel
          break
        }
      }
      continue
    }
    
    // Check if this is a section header
    if (trimmedLine.startsWith('Current Level Plan:')) {
      // Finalize previous section if exists
      if (currentRole && currentLevel && currentSection) {
        const key = `${currentRole}-${currentLevel}`
        if (!intermediate[key]) intermediate[key] = {}
        intermediate[key][currentSection] = currentContent.join('\n').trim()
        currentContent = []
      }
      currentSection = 'currentLevelPlan'
      continue
    }
    
    if (trimmedLine.startsWith('Next Level Expectations:')) {
      // Finalize previous section if exists
      if (currentRole && currentLevel && currentSection) {
        const key = `${currentRole}-${currentLevel}`
        if (!intermediate[key]) intermediate[key] = {}
        intermediate[key][currentSection] = currentContent.join('\n').trim()
        currentContent = []
      }
      currentSection = 'nextLevelExpectations'
      continue
    }
    
    // Add content line
    if (currentRole && currentLevel && currentSection) {
      currentContent.push(line)
    }
  }
  
  // Finalize last section
  if (currentRole && currentLevel && currentSection) {
    const key = `${currentRole}-${currentLevel}`
    if (!intermediate[key]) intermediate[key] = {}
    intermediate[key][currentSection] = currentContent.join('\n').trim()
  }
  
  // Pass 2: Convert to final guidelines array
  const guidelines = []
  const levelOrder = Object.values(levelMap)
  
  for (const [key, sections] of Object.entries(intermediate)) {
    const [role, level] = key.split('-')
    
    // Get next level for expectations
    const currentLevelIndex = levelOrder.indexOf(level)
    const nextLevel = currentLevelIndex < levelOrder.length - 1 
      ? levelOrder[currentLevelIndex + 1] 
      : null
    
    // Find next level expectations (look for next level's current plan)
    let nextLevelExpectations = sections.nextLevelExpectations || ''
    if (!nextLevelExpectations && nextLevel) {
      const nextKey = `${role}-${nextLevel}`
      const nextSections = intermediate[nextKey]
      if (nextSections && nextSections.currentLevelPlan) {
        nextLevelExpectations = nextSections.currentLevelPlan
      }
    }
    
    guidelines.push({
      role,
      level,
      currentLevelPlan: sections.currentLevelPlan || '',
      nextLevelExpectations: nextLevelExpectations
    })
  }
  
  return guidelines
}