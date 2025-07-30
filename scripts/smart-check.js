#!/usr/bin/env node

/**
 * Smart Check - Context-aware validation runner
 * 
 * Runs appropriate checks based on context:
 * - dev: Quick development validation (typecheck:quick + lint)
 * - pr: Pull request validation (typecheck:quick + lint + tests)  
 * - full: Comprehensive validation (typecheck + lint + tests + build)
 * - ci: Continuous integration (same as full)
 */

const { execSync } = require('child_process');
const path = require('path');

// Get context from command line argument
const context = process.argv[2] || 'dev';

// Define command sets for each context
const commands = {
  'dev': {
    description: 'Quick development validation',
    commands: ['typecheck:quick', 'lint'],
    emoji: '⚡'
  },
  'pr': {
    description: 'Pull request validation', 
    commands: ['typecheck:quick', 'lint', 'test'],
    emoji: '🔍'
  },
  'full': {
    description: 'Comprehensive validation',
    commands: ['typecheck', 'lint', 'test', 'build'],
    emoji: '🔍'
  },
  'ci': {
    description: 'Continuous integration',
    commands: ['typecheck', 'lint', 'test', 'build'],
    emoji: '🤖'
  }
};

// Validate context
if (!commands[context]) {
  console.error(`❌ Unknown context: ${context}`);
  console.log('\n📋 Available contexts:');
  Object.keys(commands).forEach(ctx => {
    const cmd = commands[ctx];
    console.log(`  ${cmd.emoji} ${ctx}: ${cmd.description}`);
  });
  process.exit(1);
}

const selectedCommands = commands[context];

console.log(`${selectedCommands.emoji} Running ${selectedCommands.description}...`);
console.log(`📦 Commands: ${selectedCommands.commands.join(', ')}`);
console.log('');

let success = true;

// Run each command in sequence
for (const cmd of selectedCommands.commands) {
  console.log(`\n📋 Running: npm run ${cmd}`);
  console.log('─'.repeat(50));
  
  try {
    const startTime = Date.now();
    execSync(`npm run ${cmd}`, { stdio: 'inherit' });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ ${cmd} completed in ${duration}s`);
  } catch (error) {
    console.error(`❌ ${cmd} failed`);
    success = false;
    break;
  }
}

console.log('\n' + '='.repeat(50));

if (success) {
  console.log(`✅ All ${context} checks passed!`);
  
  // Show summary
  if (context === 'dev') {
    console.log('\n💡 Quick development checks completed. Ready for coding!');
  } else if (context === 'pr') {
    console.log('\n💡 Pull request checks passed. Ready for review!');
  } else if (context === 'full' || context === 'ci') {
    console.log('\n💡 Comprehensive checks passed. Ready for deployment!');
  }
  
  process.exit(0);
} else {
  console.log(`❌ ${context} checks failed. Please fix the issues above.`);
  process.exit(1);
}