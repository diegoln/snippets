#!/usr/bin/env node

/**
 * Fix Reflection Formatting Script
 * 
 * This script fixes existing reflections that have markdown code block wrappers
 * by removing the ```markdown...``` wrappers and leaving just the clean markdown content.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function cleanReflectionContent(content) {
  let cleaned = content.trim()
  
  // Remove markdown code block wrappers if present
  // The LLM sometimes returns content wrapped in ```markdown...```
  const markdownCodeBlockRegex = /^```markdown\s*\n([\s\S]*?)\n```$/
  const match = cleaned.match(markdownCodeBlockRegex)
  if (match) {
    cleaned = match[1].trim()
  }
  
  // Also handle cases where it might be wrapped with just ```
  const genericCodeBlockRegex = /^```\s*\n([\s\S]*?)\n```$/
  const genericMatch = cleaned.match(genericCodeBlockRegex)
  if (genericMatch && genericMatch[1].includes('## Done')) {
    cleaned = genericMatch[1].trim()
  }
  
  return cleaned
}

async function fixReflectionFormatting() {
  console.log('🔧 Starting reflection formatting fix...')
  
  try {
    // Find all snippets that contain markdown code blocks
    const snippets = await prisma.weeklySnippet.findMany({
      where: {
        OR: [
          { content: { contains: '```markdown' } },
          { 
            AND: [
              { content: { contains: '```' } },
              { content: { contains: '## Done' } }
            ]
          }
        ]
      }
    })
    
    console.log(`📋 Found ${snippets.length} reflections with formatting issues`)
    
    if (snippets.length === 0) {
      console.log('✅ No reflections need formatting fixes!')
      return
    }
    
    let fixed = 0
    
    for (const snippet of snippets) {
      const originalContent = snippet.content
      const cleanedContent = cleanReflectionContent(originalContent)
      
      if (originalContent !== cleanedContent) {
        await prisma.weeklySnippet.update({
          where: { id: snippet.id },
          data: { content: cleanedContent }
        })
        
        console.log(`✅ Fixed reflection ${snippet.id} (Week ${snippet.weekNumber}, ${snippet.year})`)
        fixed++
      }
    }
    
    console.log(`🎉 Successfully fixed ${fixed} reflections!`)
    
  } catch (error) {
    console.error('❌ Error fixing reflections:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  fixReflectionFormatting()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

module.exports = { fixReflectionFormatting, cleanReflectionContent }