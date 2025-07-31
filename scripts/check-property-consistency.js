#!/usr/bin/env node

/**
 * Pre-commit hook to check property consistency across the codebase
 * This would have caught the assessmentDirections → checkInFocusAreas inconsistency
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration: Define property mappings that should be consistent
const PROPERTY_MAPPINGS = {
  // Map of old property names to new property names
  'assessmentDirections': 'checkInFocusAreas',
  'performanceAssessment': 'careerCheckIn',
  'assessmentId': 'checkInId',
};

// Define groups of files that should use consistent properties
const FILE_GROUPS = {
  'frontend': {
    pattern: ['components/**/*.tsx', 'app/**/*.tsx'],
    propertyAccessPatterns: [
      /\.(\w+)/g,                    // object.property
      /\['([^']+)'\]/g,             // object['property']
      /\["([^"]+)"\]/g,             // object["property"]
      /<label\s+htmlFor="([^"]+)"/g, // <label htmlFor="property">
      /id="([^"]+)"/g,              // id="property"
    ]
  },
  'api': {
    pattern: ['app/api/**/*.ts', 'pages/api/**/*.ts'],
    propertyAccessPatterns: [
      /const\s*{\s*([^}]+)\s*}\s*=/g,  // const { property } = 
      /\.(\w+)/g,                        // object.property
      /\['([^']+)'\]/g,                 // object['property']
    ]
  },
  'templates': {
    pattern: ['lib/prompts/**/*.md', 'templates/**/*.md'],
    propertyAccessPatterns: [
      /{{([^}]+)}}/g,                   // {{property}}
      /{{#if\s+([^}]+)}}/g,            // {{#if property}}
    ]
  },
  'tests': {
    pattern: ['__tests__/**/*.ts', '**/*.test.ts', '**/*.test.tsx'],
    propertyAccessPatterns: [
      /\.(\w+)/g,                       // object.property
      /\['([^']+)'\]/g,                // object['property']
      /expect\([^)]+\)\.toHaveProperty\(['"]([^'"]+)['"]\)/g,
    ]
  },
  'types': {
    pattern: ['types/**/*.ts'],
    propertyAccessPatterns: [
      /(\w+)\s*[?:]?\s*(?:string|number|boolean|any)/g,  // property: type
      /interface\s+\w+\s*{[^}]*?(\w+)\s*[?:]?\s*:/g,    // interface properties
    ]
  }
};

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function getChangedFiles() {
  try {
    // Get list of staged files
    const files = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx') || f.endsWith('.md')));
    return files;
  } catch (error) {
    return [];
  }
}

function findPropertiesInFile(filePath, patterns) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const foundProperties = new Set();
  
  patterns.forEach(pattern => {
    const matches = content.matchAll(new RegExp(pattern));
    for (const match of matches) {
      // Extract the property name from the match
      const propertyName = match[1];
      if (propertyName && !propertyName.includes(' ')) {
        foundProperties.add(propertyName.trim());
      }
    }
  });
  
  return foundProperties;
}

function checkPropertyConsistency() {
  console.log(`${colors.blue}🔍 Checking property consistency across codebase...${colors.reset}\n`);
  
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log(`${colors.green}✅ No files to check${colors.reset}`);
    return true;
  }

  const issues = [];
  const warnings = [];

  // Group changed files by their file group
  const filesByGroup = {};
  changedFiles.forEach(file => {
    Object.entries(FILE_GROUPS).forEach(([groupName, groupConfig]) => {
      const patterns = Array.isArray(groupConfig.pattern) ? groupConfig.pattern : [groupConfig.pattern];
      const matchesPattern = patterns.some(pattern => {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(file);
      });
      
      if (matchesPattern) {
        if (!filesByGroup[groupName]) {
          filesByGroup[groupName] = [];
        }
        filesByGroup[groupName].push(file);
      }
    });
  });

  // Check each group for consistency issues
  Object.entries(filesByGroup).forEach(([groupName, files]) => {
    const groupConfig = FILE_GROUPS[groupName];
    
    files.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) return;
      
      const foundProperties = findPropertiesInFile(filePath, groupConfig.propertyAccessPatterns);
      
      // Check for deprecated properties
      Object.entries(PROPERTY_MAPPINGS).forEach(([oldProp, newProp]) => {
        if (foundProperties.has(oldProp)) {
          issues.push({
            file,
            group: groupName,
            message: `Found deprecated property "${colors.red}${oldProp}${colors.reset}" - should use "${colors.green}${newProp}${colors.reset}"`
          });
        }
      });
      
      // Check for mixed usage (both old and new in same file)
      Object.entries(PROPERTY_MAPPINGS).forEach(([oldProp, newProp]) => {
        if (foundProperties.has(oldProp) && foundProperties.has(newProp)) {
          warnings.push({
            file,
            group: groupName,
            message: `Mixed usage of "${colors.yellow}${oldProp}${colors.reset}" and "${colors.yellow}${newProp}${colors.reset}" in same file`
          });
        }
      });
    });
  });

  // Cross-file consistency check for API contracts
  if (filesByGroup['frontend'] && filesByGroup['api']) {
    console.log(`${colors.blue}📋 Checking frontend-backend contract consistency...${colors.reset}`);
    
    // This is where we'd check that frontend forms match API expectations
    // For now, we'll just warn about potential issues
    const frontendFiles = filesByGroup['frontend'];
    const apiFiles = filesByGroup['api'];
    
    if (frontendFiles.length > 0 && apiFiles.length > 0) {
      warnings.push({
        file: 'Cross-file check',
        group: 'contract',
        message: `Both frontend and API files changed - verify property names match between form data and API handlers`
      });
    }
  }

  // Report results
  if (issues.length > 0) {
    console.log(`${colors.red}❌ Property Consistency Issues Found:${colors.reset}\n`);
    issues.forEach(issue => {
      console.log(`  ${colors.yellow}${issue.file}${colors.reset} (${issue.group})`);
      console.log(`    └─ ${issue.message}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log(`${colors.yellow}⚠️  Property Consistency Warnings:${colors.reset}\n`);
    warnings.forEach(warning => {
      console.log(`  ${colors.yellow}${warning.file}${colors.reset} (${warning.group})`);
      console.log(`    └─ ${warning.message}\n`);
    });
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`${colors.green}✅ No property consistency issues found${colors.reset}`);
    return true;
  }

  // Provide helpful suggestions
  if (issues.length > 0) {
    console.log(`${colors.blue}💡 Suggestions:${colors.reset}`);
    console.log(`  1. Update all instances of deprecated properties to their new names`);
    console.log(`  2. Run: ${colors.green}npm run refactor:properties${colors.reset} to automatically update properties`);
    console.log(`  3. Check that API contracts match frontend expectations\n`);
  }

  return issues.length === 0; // Only fail on errors, not warnings
}

// Run the check
const success = checkPropertyConsistency();

if (!success) {
  console.log(`${colors.red}❌ Pre-commit check failed due to property consistency issues${colors.reset}`);
  console.log(`${colors.yellow}   Fix the issues above or use --no-verify to skip this check${colors.reset}\n`);
  process.exit(1);
}

process.exit(0);