/**
 * Seed script to populate CareerGuidelineTemplate table (JavaScript version for production)
 * This runs once to populate the database with pre-generated career guidelines
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function parseCareerGuidelines(content) {
  // Simple parser for the guidelines format
  const guidelines = []
  const sections = content.split(/^## /m).filter(section => section.trim())
  
  for (const section of sections) {
    const lines = section.trim().split('\n')
    const header = lines[0]
    
    // Extract role and level from header like "Engineering - Junior"
    const match = header.match(/^(.+?)\s*-\s*(.+?)$/)
    if (!match) continue
    
    const [, role, level] = match
    const roleNormalized = role.toLowerCase().trim()
    const levelNormalized = level.toLowerCase().replace(/\s+/g, '-').replace('senior-manager', 'senior_manager').trim()
    
    // Find current and next level sections
    let currentLevelPlan = ''
    let nextLevelExpectations = ''
    let currentSection = null
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      
      if (line.startsWith('### Current Level:') || line.startsWith('### Current Level Expectations:')) {
        currentSection = 'current'
        continue
      } else if (line.startsWith('### Next Level:') || line.startsWith('### Next Level Expectations:')) {
        currentSection = 'next'
        continue
      } else if (line.startsWith('###')) {
        currentSection = null
        continue
      }
      
      if (currentSection === 'current') {
        currentLevelPlan += line + '\n'
      } else if (currentSection === 'next') {
        nextLevelExpectations += line + '\n'
      }
    }
    
    if (currentLevelPlan.trim() && nextLevelExpectations.trim()) {
      guidelines.push({
        role: roleNormalized,
        level: levelNormalized,
        currentLevelPlan: currentLevelPlan.trim(),
        nextLevelExpectations: nextLevelExpectations.trim()
      })
    }
  }
  
  return guidelines
}

async function seedCareerGuidelines() {
  console.log('🌱 Starting career guidelines seed...')
  
  try {
    // Read the pre-generated guidelines file
    const guidelinesPath = path.join(process.cwd(), 'pregen-guidelines.txt')
    
    if (!fs.existsSync(guidelinesPath)) {
      console.log('⚠️  pregen-guidelines.txt not found, skipping seed')
      return
    }
    
    const content = fs.readFileSync(guidelinesPath, 'utf-8')
    
    // Parse the content into structured data
    const guidelines = await parseCareerGuidelines(content)
    
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
        console.error(`❌ Error creating ${guideline.role} - ${guideline.level}:`, error.message)
        // Continue with other guidelines even if one fails
      }
    }
    
    console.log('\n🎉 Career guidelines seed completed!')
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)
    
  } catch (error) {
    console.error('❌ Error during seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding if this script is called directly
if (require.main === module) {
  seedCareerGuidelines()
    .then(() => {
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error)
      process.exit(1)
    })
}

module.exports = { seedCareerGuidelines }