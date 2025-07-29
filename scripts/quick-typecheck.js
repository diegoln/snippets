#!/usr/bin/env node

/**
 * Ultra-fast TypeScript check for pre-commit hooks
 * Only checks files that have been modified
 */

const { execSync } = require('child_process')
const fs = require('fs')

console.log('⚡ Running ultra-fast TypeScript check...')

try {
  // Get list of modified TypeScript files
  const modifiedFiles = execSync('git diff --cached --name-only --diff-filter=ACM')
    .toString()
    .split('\n')
    .filter(file => file.match(/\.(ts|tsx)$/))
    .filter(file => !file.includes('test'))
    .filter(file => !file.includes('__tests__'))
    .filter(file => fs.existsSync(file))

  if (modifiedFiles.length === 0) {
    console.log('✅ No TypeScript files modified - skipping check')
    process.exit(0)
  }

  console.log(`📦 Checking ${modifiedFiles.length} modified TypeScript files...`)
  
  // Run TypeScript check only on modified files
  const command = `npx tsc --noEmit --skipLibCheck --jsx preserve ${modifiedFiles.join(' ')}`
  execSync(command, { stdio: 'inherit' })
  
  console.log('✅ TypeScript check passed!')
  process.exit(0)
  
} catch (error) {
  console.log('❌ TypeScript check failed!')
  process.exit(1)
}