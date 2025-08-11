/**
 * Seed script to populate CareerGuidelineTemplate table (JavaScript version for production)
 * This runs once to populate the database with pre-generated career guidelines
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

/**
 * Parse the pre-generated guidelines text file into structured data
 * Uses a robust two-pass algorithm that is resilient to level ordering
 * 
 * Pass 1: Parse all content into intermediate data structure
 * Pass 2: Link levels and build final guidelines array with nextLevelExpectations
 */
function parseCareerGuidelines(content) {
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
    'Mid-Level': 'mid',
    'Senior': 'senior',
    'Staff': 'staff',
    'Principal': 'principal',
    'Manager': 'manager',
    'Sr. Manager': 'senior_manager',
    'Director': 'director'
  }

  // PASS 1: Parse all content into intermediate structure
  const parsedContent = new Map() // Map<role, Map<level, content>>
  const lines = content.split('\n')
  
  let currentRole = ''
  let currentLevel = ''
  let currentContent = []
  let isCollecting = false
  
  // Parse the content line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check for role header (### **Role Name**)
    const roleMatch = line.match(/^###\s+\*\*(.+?)\*\*/)
    if (roleMatch) {
      // Save previous content if exists
      if (currentRole && currentLevel && currentContent.length > 0) {
        saveParsedContent(parsedContent, currentRole, currentLevel, currentContent.join('\n'))
      }
      
      currentRole = roleMap[roleMatch[1]] || roleMatch[1].toLowerCase()
      currentLevel = ''
      currentContent = []
      isCollecting = false
      continue
    }
    
    // Check for level header (#### **Level Name**)
    const levelMatch = line.match(/^####\s+\*\*(.+?)\*\*/)
    if (levelMatch) {
      // Save previous content if exists
      if (currentRole && currentLevel && currentContent.length > 0) {
        saveParsedContent(parsedContent, currentRole, currentLevel, currentContent.join('\n'))
      }
      
      currentLevel = levelMap[levelMatch[1]] || levelMatch[1].toLowerCase()
      currentContent = []
      isCollecting = true
      continue
    }
    
    // Collect content for current level
    if (isCollecting && currentRole && currentLevel) {
      // Skip the separator line
      if (line.trim() === '---') {
        // Save current content and reset
        if (currentContent.length > 0) {
          saveParsedContent(parsedContent, currentRole, currentLevel, currentContent.join('\n'))
        }
        currentRole = ''
        currentLevel = ''
        currentContent = []
        isCollecting = false
        continue
      }
      
      currentContent.push(line)
    }
  }
  
  // Don't forget the last section
  if (currentRole && currentLevel && currentContent.length > 0) {
    saveParsedContent(parsedContent, currentRole, currentLevel, currentContent.join('\n'))
  }

  // PASS 2: Link levels and build final guidelines array
  const guidelines = []
  
  for (const [role, levelMap] of parsedContent) {
    for (const [level, content] of levelMap) {
      const formattedContent = content
        .trim()
        .replace(/\*\*\*/g, '') // Remove bold+italic markers
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize spacing

      // Find the next level's content for nextLevelExpectations
      const nextLevel = getNextLevel(level)
      let nextLevelExpectations = ''
      
      if (levelMap.has(nextLevel)) {
        nextLevelExpectations = levelMap.get(nextLevel)
          .trim()
          .replace(/\*\*\*/g, '') // Remove bold+italic markers
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize spacing
      }

      guidelines.push({
        role,
        level,
        currentLevelPlan: formattedContent,
        nextLevelExpectations
      })
    }
  }
  
  return guidelines
}

/**
 * Save parsed content to intermediate data structure
 */
function saveParsedContent(parsedContent, role, level, content) {
  if (!parsedContent.has(role)) {
    parsedContent.set(role, new Map())
  }
  parsedContent.get(role).set(level, content)
}

/**
 * Get the next seniority level
 */
function getNextLevel(currentLevel) {
  const progression = {
    'junior': 'mid',
    'mid': 'senior',
    'senior': 'staff',
    'staff': 'principal',
    'principal': 'principal', // No next level
    'manager': 'senior_manager',
    'senior_manager': 'director',
    'director': 'director' // No next level
  }
  
  return progression[currentLevel] || currentLevel
}

/**
 * Get the previous seniority level
 */
function getPreviousLevel(currentLevel) {
  const progression = {
    'mid': 'junior',
    'senior': 'mid',
    'staff': 'senior',
    'principal': 'staff',
    'senior_manager': 'manager',
    'director': 'senior_manager'
  }
  
  return progression[currentLevel] || currentLevel
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