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
 * This is the JavaScript version of lib/career-guidelines-parser.ts
 */
function parseCareerGuidelines(content) {
  const guidelines = []
  const lines = content.split('\n')
  
  let currentRole = ''
  let currentLevel = ''
  let currentContent = []
  let isCollecting = false
  
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
  
  // Parse the content line by line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Check for role header (### **Role Name**)
    const roleMatch = line.match(/^###\s+\*\*(.+?)\*\*/)
    if (roleMatch) {
      // Save previous content if exists
      if (currentRole && currentLevel && currentContent.length > 0) {
        processLevelContent(guidelines, currentRole, currentLevel, currentContent.join('\n'))
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
        processLevelContent(guidelines, currentRole, currentLevel, currentContent.join('\n'))
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
          processLevelContent(guidelines, currentRole, currentLevel, currentContent.join('\n'))
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
    processLevelContent(guidelines, currentRole, currentLevel, currentContent.join('\n'))
  }
  
  return guidelines
}

/**
 * Process level content and add to guidelines array
 */
function processLevelContent(guidelines, role, level, content) {
  // Format the content nicely
  const formattedContent = content
    .trim()
    .replace(/\*\*\*/g, '') // Remove bold+italic markers
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize spacing
  
  // For current level, we use the content as-is
  // For next level expectations, we need to find the next level
  const nextLevel = getNextLevel(level)
  
  // Check if we already have this role in guidelines
  const existingIndex = guidelines.findIndex(g => g.role === role && g.level === level)
  
  if (existingIndex >= 0) {
    // Update existing entry
    guidelines[existingIndex].currentLevelPlan = formattedContent
  } else {
    // Create new entry
    guidelines.push({
      role,
      level,
      currentLevelPlan: formattedContent,
      nextLevelExpectations: '' // Will be filled when we process the next level
    })
  }
  
  // Also update the previous level's nextLevelExpectations
  if (level !== 'junior') {
    const prevLevel = getPreviousLevel(level)
    const prevIndex = guidelines.findIndex(g => g.role === role && g.level === prevLevel)
    if (prevIndex >= 0) {
      guidelines[prevIndex].nextLevelExpectations = formattedContent
    }
  }
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