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
  
  if (!silent) {
    console.log('📋 Seeding career guideline templates...')
  }

  try {
    // Parse the pre-generated guidelines file
    const guidelinesPath = path.join(__dirname, '..', 'pregen-guidelines.txt')
    
    if (!fs.existsSync(guidelinesPath)) {
      if (!silent) {
        console.log('⚠️  pregen-guidelines.txt not found, skipping career guidelines seed')
      }
      return { created: 0, skipped: 0, total: 0 }
    }

    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    const guidelines = parseCareerGuidelines(content)
    
    if (!silent) {
      console.log(`📊 Parsed ${guidelines.length} career guideline combinations`)
    }
    
    let created = 0
    let skipped = 0
    
    for (const guideline of guidelines) {
      try {
        // Check if template already exists
        const existing = await db.careerGuidelineTemplate.findUnique({
          where: {
            role_level: {
              role: guideline.role,
              level: guideline.level
            }
          }
        })
        
        if (existing) {
          if (!silent) {
            console.log(`⏭️  Skipping existing: ${guideline.role} - ${guideline.level}`)
          }
          skipped++
          continue
        }
        
        // Create new template
        await db.careerGuidelineTemplate.create({
          data: {
            role: guideline.role,
            level: guideline.level,
            currentLevelPlan: guideline.currentLevelPlan,
            nextLevelExpectations: guideline.nextLevelExpectations
          }
        })
        
        if (!silent) {
          console.log(`✅ Created: ${guideline.role} - ${guideline.level}`)
        }
        created++
      } catch (error) {
        if (!silent) {
          console.error(`❌ Error creating ${guideline.role} - ${guideline.level}:`, error.message)
        }
        // Continue with other guidelines even if one fails
      }
    }
    
    if (!silent) {
      console.log(`🎉 Career guidelines seed completed!`)
      console.log(`   Created: ${created}`)
      console.log(`   Skipped: ${skipped}`)
    }
    
    return { created, skipped, total: guidelines.length }
    
  } catch (error) {
    if (!silent) {
      console.error('❌ Error during career guidelines seeding:', error)
    }
    throw error
  } finally {
    if (shouldDisconnect) {
      await db.$disconnect()
    }
  }
}

/**
 * Parse the pre-generated guidelines text file into structured data
 * Format: ### **Role**, #### **Level**, then content until next header
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
  const levelData: { [key: string]: string } = {}
  let currentRole: string | null = null
  let currentLevel: string | null = null
  let currentContent: string[] = []
  
  // Parse content - everything under a level header is the current level plan
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Check if this is a role header (### **Role Name**)
    if (trimmedLine.startsWith('### **') && trimmedLine.endsWith('**')) {
      // Save previous level content
      if (currentRole && currentLevel && currentContent.length > 0) {
        const key = `${currentRole}-${currentLevel}`
        levelData[key] = currentContent.join('\n').trim()
      }
      
      // Extract new role
      const roleText = trimmedLine.replace('### **', '').replace('**', '').trim()
      currentRole = null
      for (const [displayRole, internalRole] of Object.entries(roleMap)) {
        if (roleText === displayRole) {
          currentRole = internalRole
          break
        }
      }
      currentLevel = null
      currentContent = []
      continue
    }
    
    // Check if this is a level header (#### **Level Name**)
    if (trimmedLine.startsWith('#### **') && trimmedLine.endsWith('**')) {
      // Save previous level content
      if (currentRole && currentLevel && currentContent.length > 0) {
        const key = `${currentRole}-${currentLevel}`
        levelData[key] = currentContent.join('\n').trim()
      }
      
      // Extract new level
      const levelText = trimmedLine.replace('#### **', '').replace('**', '').trim()
      currentLevel = null
      for (const [displayLevel, internalLevel] of Object.entries(levelMap)) {
        if (levelText === displayLevel) {
          currentLevel = internalLevel
          break
        }
      }
      currentContent = []
      continue
    }
    
    // Add content line if we're in a valid role/level context
    if (currentRole && currentLevel) {
      currentContent.push(line)
    }
  }
  
  // Save final level content
  if (currentRole && currentLevel && currentContent.length > 0) {
    const key = `${currentRole}-${currentLevel}`
    levelData[key] = currentContent.join('\n').trim()
  }
  
  // Convert to final guidelines array with next level expectations
  const guidelines: Array<{
    role: string
    level: string
    currentLevelPlan: string
    nextLevelExpectations: string
  }> = []
  
  const levelOrder = Object.values(levelMap)
  
  for (const [key, currentLevelPlan] of Object.entries(levelData)) {
    const [role, level] = key.split('-')
    
    // Get next level for expectations
    const currentLevelIndex = levelOrder.indexOf(level)
    const nextLevel = currentLevelIndex < levelOrder.length - 1 
      ? levelOrder[currentLevelIndex + 1] 
      : null
    
    // Next level expectations are the next level's current plan
    let nextLevelExpectations = ''
    if (nextLevel) {
      const nextKey = `${role}-${nextLevel}`
      nextLevelExpectations = levelData[nextKey] || ''
    }
    
    guidelines.push({
      role,
      level,
      currentLevelPlan,
      nextLevelExpectations
    })
  }
  
  return guidelines
}