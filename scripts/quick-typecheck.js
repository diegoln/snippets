#!/usr/bin/env node

/**
 * Ultra-fast TypeScript check for pre-commit hooks
 * Only checks files that have been modified
 */

const { execSync } = require('child_process')
const fs = require('fs')

console.log('⚡ Running ultra-fast TypeScript check...')

try {
  // Check if TypeScript is available
  try {
    execSync('npx tsc --version', { stdio: 'ignore' })
  } catch (error) {
    console.error('❌ TypeScript compiler not found. Please ensure TypeScript is installed.')
    process.exit(1)
  }

  // Get list of modified TypeScript files
  let modifiedFiles = []
  try {
    modifiedFiles = execSync('git diff --cached --name-only --diff-filter=ACM')
      .toString()
      .split('\n')
      .filter(file => file && file.match(/\.(ts|tsx)$/))
      .filter(file => !file.includes('test'))
      .filter(file => !file.includes('__tests__'))
      .filter(file => fs.existsSync(file))
  } catch (gitError) {
    console.error('❌ Failed to get modified files from git:', gitError.message)
    process.exit(1)
  }

  if (modifiedFiles.length === 0) {
    console.log('✅ No TypeScript files modified - skipping check')
    process.exit(0)
  }

  console.log(`📦 Checking ${modifiedFiles.length} modified TypeScript files...`)
  
  // Run TypeScript check only on modified files
  const command = `npx tsc --noEmit --skipLibCheck --esModuleInterop --jsx preserve ${modifiedFiles.join(' ')}`
  
  try {
    execSync(command, { stdio: 'inherit' })
    console.log('✅ TypeScript check passed!')
    process.exit(0)
  } catch (tscError) {
    // TypeScript compilation errors are expected and shown by stdio: 'inherit'
    console.log('❌ TypeScript check failed!')
    process.exit(1)
  }
  
} catch (error) {
  // Unexpected errors
  console.error('❌ Unexpected error during TypeScript check:', error.message)
  process.exit(1)
}