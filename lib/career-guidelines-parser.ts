/**
 * Parser for pre-generated career guidelines content
 * Converts the markdown format into structured data for database seeding
 */

interface ParsedGuideline {
  role: string
  level: string
  currentLevelPlan: string
  nextLevelExpectations: string
}

interface RoleSection {
  role: string
  levels: {
    [level: string]: string
  }
}

/**
 * Parse the pre-generated guidelines text file into structured data
 */
export function parseCareerGuidelines(content: string): ParsedGuideline[] {
  const guidelines: ParsedGuideline[] = []
  const lines = content.split('\n')
  
  let currentRole = ''
  let currentLevel = ''
  let currentContent: string[] = []
  let isCollecting = false
  
  // Role mappings to match our constants
  const roleMap: { [key: string]: string } = {
    'Software Engineering': 'engineering',
    'Product Management': 'product',
    'Design': 'design',
    'Data': 'data'
  }
  
  // Level mappings to match our constants
  const levelMap: { [key: string]: string } = {
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
function processLevelContent(
  guidelines: ParsedGuideline[], 
  role: string, 
  level: string, 
  content: string
) {
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
function getNextLevel(currentLevel: string): string {
  const progression: { [key: string]: string } = {
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
function getPreviousLevel(currentLevel: string): string {
  const progression: { [key: string]: string } = {
    'mid': 'junior',
    'senior': 'mid',
    'staff': 'senior',
    'principal': 'staff',
    'senior_manager': 'manager',
    'director': 'senior_manager'
  }
  
  return progression[currentLevel] || currentLevel
}