/**
 * Seed script to populate CareerGuidelineTemplate table
 * This runs once to populate the database with pre-generated career guidelines
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { parseCareerGuidelines } from '../lib/career-guidelines-parser'

const prisma = new PrismaClient()

async function seedCareerGuidelines() {
  console.log('🌱 Starting career guidelines seed...')
  
  try {
    // Read the pre-generated guidelines file
    const guidelinesPath = path.join(process.cwd(), 'pregen-guidelines.txt')
    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    
    // Parse the content into structured data
    const guidelines = parseCareerGuidelines(content)
    
    console.log(`📊 Parsed ${guidelines.length} career guideline combinations`)
    
    // Insert each guideline into the database
    let created = 0
    let skipped = 0
    
    for (const guideline of guidelines) {
      try {
        // Check if this combination already exists
        const existing = await prisma.careerGuidelineTemplate.findUnique({
          where: {
            role_level: {
              role: guideline.role,
              level: guideline.level
            }
          }
        })
        
        if (existing) {
          console.log(`⏭️  Skipping existing: ${guideline.role} - ${guideline.level}`)
          skipped++
          continue
        }
        
        // Create new template
        await prisma.careerGuidelineTemplate.create({
          data: {
            role: guideline.role,
            level: guideline.level,
            currentLevelPlan: guideline.currentLevelPlan,
            nextLevelExpectations: guideline.nextLevelExpectations
          }
        })
        
        console.log(`✅ Created: ${guideline.role} - ${guideline.level}`)
        created++
        
      } catch (error) {
        console.error(`❌ Error creating guideline for ${guideline.role} - ${guideline.level}:`, error)
      }
    }
    
    console.log(`\n🎉 Career guidelines seed completed!`)
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    
  } catch (error) {
    console.error('❌ Error seeding career guidelines:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed function
seedCareerGuidelines()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })