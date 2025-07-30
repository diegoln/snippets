#!/usr/bin/env node

/**
 * Show Checks - Display available validation scripts
 * 
 * Helps developers understand what validation scripts are available
 * and when to use each one.
 */

const fs = require('fs');
const path = require('path');

try {
  // Read package.json to get available scripts
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  console.log('📋 Available Validation Scripts');
  console.log('═'.repeat(50));
  
  // Filter and categorize scripts
  const checkScripts = [];
  const typecheckScripts = [];
  const testScripts = [];
  const otherScripts = [];
  
  Object.keys(pkg.scripts).forEach(name => {
    const script = pkg.scripts[name];
    
    if (name.startsWith('check')) {
      checkScripts.push({ name, script });
    } else if (name.includes('typecheck')) {
      typecheckScripts.push({ name, script });
    } else if (name.includes('test')) {
      testScripts.push({ name, script });
    } else if (['lint', 'build', 'deploy'].includes(name)) {
      otherScripts.push({ name, script });
    }
  });
  
  // Display Smart Check Scripts (recommended)
  if (checkScripts.length > 0) {
    console.log('\n🚀 Smart Check Scripts (Recommended)');
    console.log('─'.repeat(40));
    checkScripts.forEach(({ name, script }) => {
      let speed = '📋';
      let description = '';
      
      if (name === 'check:dev') {
        speed = '⚡';
        description = ' - Quick development validation (~5-10s)';
      } else if (name === 'check:pr') {
        speed = '🔍';
        description = ' - Pull request validation (~10-20s)';
      } else if (name === 'check:full') {
        speed = '🐌';
        description = ' - Comprehensive validation (~2+ min)';
      } else if (name === 'check') {
        speed = '🤖';
        description = ' - Context-aware validation';
      } else if (name === 'show-checks') {
        speed = '📋';
        description = ' - Show this help';
      }
      
      console.log(`  ${speed} npm run ${name}${description}`);
    });
  }
  
  // Display TypeScript Check Scripts  
  if (typecheckScripts.length > 0) {
    console.log('\n🔍 TypeScript Check Scripts');
    console.log('─'.repeat(30));
    typecheckScripts.forEach(({ name, script }) => {
      let speed = '🐌';
      let description = '';
      
      if (name === 'typecheck:quick') {
        speed = '⚡';
        description = ' - Only modified files (~2-5s)';
      } else if (name === 'typecheck:fast') {
        speed = '🚀';
        description = ' - Skip lib checking (~10-30s)';
      } else if (name === 'typecheck') {
        speed = '🐌';
        description = ' - Full project check (~2+ min)';
      }
      
      console.log(`  ${speed} npm run ${name}${description}`);
    });
  }
  
  // Display Other Important Scripts
  if (otherScripts.length > 0) {
    console.log('\n🛠️  Other Validation Scripts');
    console.log('─'.repeat(25));
    otherScripts.forEach(({ name, script }) => {
      let emoji = '📋';
      let description = '';
      
      if (name === 'lint') {
        emoji = '🔧';
        description = ' - ESLint code quality check';
      } else if (name === 'build') {
        emoji = '🏗️';
        description = ' - Production build';
      } else if (name === 'deploy') {
        emoji = '🚀';
        description = ' - Deploy to production';
      }
      
      console.log(`  ${emoji} npm run ${name}${description}`);
    });
  }
  
  // Usage recommendations
  console.log('\n💡 Usage Recommendations');
  console.log('─'.repeat(25));
  console.log('  Development:      npm run check:dev');
  console.log('  Pull Request:     npm run check:pr');
  console.log('  Pre-deployment:   npm run check:full');
  console.log('  Context-aware:    npm run check [dev|pr|full|ci]');
  
  console.log('\n📖 For more details, see CLAUDE.md');
  
} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  process.exit(1);
}