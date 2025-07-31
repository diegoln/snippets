#!/usr/bin/env node

/**
 * Template Variable Consistency Check
 * Ensures Handlebars templates only reference properties that exist in TypeScript interfaces
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Extract variables from Handlebars templates
function extractTemplateVariables(templatePath) {
  const content = fs.readFileSync(templatePath, 'utf-8');
  const variables = new Set();
  
  // Match {{variable}} and {{#if variable}}
  const patterns = [
    /\{\{([^#\/}][^}]*)\}\}/g,     // {{variable}} (not starting with # or /)
    /\{\{#if\s+([^}]+)\}\}/g,     // {{#if variable}}
    /\{\{#each\s+([^}]+)\}\}/g,   // {{#each variable}}
  ];
  
  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      let variable = match[1].trim();
      
      // Handle nested properties like userProfile.jobTitle
      if (variable.includes('.')) {
        const parts = variable.split('.');
        variables.add(parts[0]); // Add the root property
        variables.add(variable); // Add the full path
      } else {
        variables.add(variable);
      }
    }
  });
  
  return variables;
}

// Extract interface properties from TypeScript files
function extractTypeDefinitions(typesPath) {
  const content = fs.readFileSync(typesPath, 'utf-8');
  const interfaces = {};
  
  // Simple regex to extract interface properties
  // This would be more robust with actual TypeScript AST parsing
  const interfacePattern = /interface\s+(\w+)\s*\{([^}]+)\}/g;
  
  const matches = content.matchAll(interfacePattern);
  for (const match of matches) {
    const interfaceName = match[1];
    const interfaceBody = match[2];
    
    const properties = new Set();
    
    // Extract property names
    const propPattern = /^\s*(\w+)\s*[?:]?\s*[:]/gm;
    const propMatches = interfaceBody.matchAll(propPattern);
    
    for (const propMatch of propMatches) {
      properties.add(propMatch[1]);
    }
    
    interfaces[interfaceName] = properties;
  }
  
  return interfaces;
}

// Validate template variables against type definitions
function validateTemplateVariables() {
  console.log('🔍 Validating template variables against TypeScript interfaces...\n');
  
  const issues = [];
  const warnings = [];
  
  // Find all template files
  const templateFiles = [];
  const walkDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        walkDir(filePath);
      } else if (file.endsWith('.md') && filePath.includes('prompts')) {
        templateFiles.push(filePath);
      }
    });
  };
  
  walkDir('lib');
  walkDir('templates');
  
  // Extract type definitions
  const typesPath = 'types/performance.ts';
  let interfaces = {};
  
  if (fs.existsSync(typesPath)) {
    interfaces = extractTypeDefinitions(typesPath);
  }
  
  // Known context structure based on our codebase
  const contextStructure = {
    'userProfile': interfaces.UserProfile || new Set(['jobTitle', 'seniorityLevel', 'careerLadder']),
    'weeklySnippets': new Set(['weekNumber', 'startDate', 'endDate', 'content']),
    'cyclePeriod': new Set(['startDate', 'endDate', 'cycleName']),
    'previousFeedback': new Set(),
    'checkInFocusAreas': new Set(), // This is the property we renamed to
    'snippetCount': new Set(),
    
    // Deprecated properties that should trigger errors
    '_deprecated': new Set(['assessmentDirections']) // This would catch our issue!
  };
  
  // Validate each template
  templateFiles.forEach(templatePath => {
    const relativePath = path.relative(process.cwd(), templatePath);
    const variables = extractTemplateVariables(templatePath);
    
    variables.forEach(variable => {
      // Check for deprecated variables
      if (contextStructure._deprecated.has(variable)) {
        issues.push({
          file: relativePath,
          variable,
          type: 'deprecated',
          message: `Template uses deprecated variable "${variable}" - this property no longer exists in the context`
        });
        return;
      }
      
      // Handle nested properties
      if (variable.includes('.')) {
        const [root, ...nested] = variable.split('.');
        
        if (!contextStructure[root]) {
          warnings.push({
            file: relativePath,
            variable,
            type: 'unknown_root',
            message: `Unknown root property "${root}" in "${variable}"`
          });
        }
        // Could add more validation for nested properties here
        
      } else {
        // Check if root property exists
        if (!contextStructure[variable] && variable !== 'else') { // 'else' is a Handlebars keyword
          warnings.push({
            file: relativePath,
            variable,
            type: 'unknown',
            message: `Unknown template variable "${variable}"`
          });
        }
      }
    });
  });
  
  // Report results
  if (issues.length > 0) {
    console.log('❌ Template validation errors:\n');
    issues.forEach(issue => {
      console.log(`  📄 ${issue.file}`);
      console.log(`     └─ ${issue.message}\n`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Template validation warnings:\n');
    warnings.forEach(warning => {
      console.log(`  📄 ${warning.file}`);
      console.log(`     └─ ${warning.message}\n`);
    });
  }
  
  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ All template variables are valid\n');
    return true;
  }
  
  if (issues.length > 0) {
    console.log('💡 To fix template issues:');
    console.log('   1. Update deprecated variable names in template files');
    console.log('   2. Ensure template variables match TypeScript interface properties');
    console.log('   3. Check context objects passed to template processors\n');
  }
  
  return issues.length === 0; // Only fail on errors, not warnings
}

// Run validation
if (require.main === module) {
  const success = validateTemplateVariables();
  process.exit(success ? 0 : 1);
}

module.exports = { validateTemplateVariables, extractTemplateVariables };