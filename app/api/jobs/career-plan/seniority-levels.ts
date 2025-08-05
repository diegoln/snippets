/**
 * Seniority Level Mapping for Career Progression
 * 
 * Maps current seniority levels to their next career progression step
 * based on common technology industry career ladders.
 */

/**
 * Get the next seniority level for career progression
 */
export function getNextSeniorityLevel(currentLevel: string): string {
  const levelMap: { [key: string]: string } = {
    // Software Engineering
    'Junior Software Engineer': 'Software Engineer',
    'Software Engineer': 'Senior Software Engineer',
    'Senior Software Engineer': 'Staff Software Engineer',
    'Staff Software Engineer': 'Principal Software Engineer',
    'Principal Software Engineer': 'Distinguished Engineer',
    
    // Product Management
    'Associate Product Manager': 'Product Manager',
    'Product Manager': 'Senior Product Manager',
    'Senior Product Manager': 'Principal Product Manager',
    'Principal Product Manager': 'Director of Product',
    
    // Design
    'Junior Designer': 'Product Designer',
    'Product Designer': 'Senior Product Designer',
    'Senior Product Designer': 'Staff Product Designer',
    'Staff Product Designer': 'Principal Designer',
    
    // Data
    'Junior Data Scientist': 'Data Scientist',
    'Data Scientist': 'Senior Data Scientist',
    'Senior Data Scientist': 'Staff Data Scientist',
    'Staff Data Scientist': 'Principal Data Scientist',
    
    // DevOps/Platform
    'Junior DevOps Engineer': 'DevOps Engineer',
    'DevOps Engineer': 'Senior DevOps Engineer',
    'Senior DevOps Engineer': 'Staff DevOps Engineer',
    'Staff DevOps Engineer': 'Principal DevOps Engineer',
    
    // QA/Testing
    'Junior QA Engineer': 'QA Engineer',
    'QA Engineer': 'Senior QA Engineer',
    'Senior QA Engineer': 'Staff QA Engineer',
    'Staff QA Engineer': 'Principal QA Engineer',
    
    // Generic fallbacks
    'Junior': 'Mid-Level',
    'Mid-Level': 'Senior',
    'Senior': 'Staff',
    'Staff': 'Principal',
    'Principal': 'Distinguished'
  }
  
  // Try exact match first
  if (levelMap[currentLevel]) {
    return levelMap[currentLevel]
  }
  
  // Try to find a partial match
  const lowerLevel = currentLevel.toLowerCase()
  if (lowerLevel.includes('junior')) {
    return currentLevel.replace(/junior/i, 'Mid-Level')
  } else if (lowerLevel.includes('mid') || (!lowerLevel.includes('senior') && !lowerLevel.includes('staff'))) {
    return currentLevel.includes('Engineer') ? 'Senior ' + currentLevel :
           currentLevel.includes('Manager') ? 'Senior ' + currentLevel :
           currentLevel.includes('Designer') ? 'Senior ' + currentLevel :
           'Senior ' + currentLevel
  } else if (lowerLevel.includes('senior') && !lowerLevel.includes('staff')) {
    return currentLevel.replace(/senior/i, 'Staff')
  } else if (lowerLevel.includes('staff')) {
    return currentLevel.replace(/staff/i, 'Principal')
  } else if (lowerLevel.includes('principal')) {
    return currentLevel.replace(/principal/i, 'Distinguished')
  }
  
  // Default fallback
  return `Senior ${currentLevel}`
}