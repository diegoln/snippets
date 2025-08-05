#!/usr/bin/env node

/**
 * Advanced API contract validation for pre-commit hooks
 * Ensures frontend forms match backend API expectations
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// API Contract definitions - this would ideally be generated from your API specs
const API_CONTRACTS = {
  '/api/assessments': {
    POST: {
      body: {
        required: ['cycleName', 'startDate', 'endDate'],
        optional: ['checkInFocusAreas'],
        deprecated: ['assessmentDirections'], // Would catch our issue!
      }
    }
  },
  '/api/snippets': {
    POST: {
      body: {
        required: ['weekNumber', 'year', 'content'],
        optional: ['metadata']
      }
    }
  }
};

// Extract form field names from React components
function extractFormFields(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fields = new Set();
  
  // Pattern to match form inputs and their names
  const patterns = [
    // <input name="fieldName" />
    /<input[^>]+name=["']([^"']+)["']/g,
    // <textarea id="fieldName" />
    /<textarea[^>]+id=["']([^"']+)["']/g,
    // useState for form data
    /formData\.([a-zA-Z_]\w*)/g,
    // Form field updates
    /SET_FORM_DATA[^}]+data:\s*{\s*([^:]+):/g,
  ];
  
  patterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        fields.add(match[1].trim());
      }
    }
  });
  
  return fields;
}

// Extract API endpoint usage from components
function extractAPIEndpoints(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const endpoints = [];
  
  
  // Pattern to match fetch calls
  const fetchPattern = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const matches = content.matchAll(fetchPattern);
  
  for (const match of matches) {
    const url = match[1];
    // Extract method
    const methodMatch = content.match(new RegExp(`fetch\\s*\\(\\s*['"\`]${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`][^}]+method:\\s*['"\`](\\w+)['"\`]`));
    const method = methodMatch ? methodMatch[1] : 'GET';
    
    // Extract body fields
    const bodyFields = new Set();
    
    // Look for JSON.stringify(variableName) pattern (handle multiline)
    const stringifyMatch = content.match(new RegExp(`fetch\\s*\\(\\s*['"\`]${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`][\\s\\S]*?body:\\s*JSON\\.stringify\\s*\\(\\s*(\\w+)\\s*\\)`, 'm'));
    
    if (stringifyMatch) {
      const variableName = stringifyMatch[1];
      // Look for the variable definition (handle multiline objects)
      const variablePattern = new RegExp(`const\\s+${variableName}\\s*=\\s*\\{([\\s\\S]*?)\\}`, 'g');
      const variableMatch = variablePattern.exec(content);
      
      if (variableMatch) {
        const bodyContent = variableMatch[1];
        const fieldMatches = bodyContent.matchAll(/(\w+):/g);
        for (const fieldMatch of fieldMatches) {
          bodyFields.add(fieldMatch[1]);
        }
      }
    } else {
      // Fallback to direct object pattern
      const bodyMatch = content.match(new RegExp(`fetch\\s*\\(\\s*['"\`]${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`][^}]+body:[^}]+{([^}]+)}`));
      
      if (bodyMatch) {
        // Extract fields from JSON.stringify body
        const bodyContent = bodyMatch[1];
        const fieldMatches = bodyContent.matchAll(/(\w+):/g);
        for (const fieldMatch of fieldMatches) {
          bodyFields.add(fieldMatch[1]);
        }
      }
    }
    
    const endpointData = {
      url,
      method,
      bodyFields: Array.from(bodyFields)
    };
    
    endpoints.push(endpointData);
  }
  
  return endpoints;
}

// Validate that frontend API calls match backend contracts
function validateAPIContracts(componentPath) {
  const issues = [];
  const warnings = [];
  
  // Extract form fields and API calls from component
  const formFields = extractFormFields(componentPath);
  const apiCalls = extractAPIEndpoints(componentPath);
  
  apiCalls.forEach(call => {
    const contract = API_CONTRACTS[call.url]?.[call.method];
    if (!contract) return; // No contract defined for this endpoint
    
    const { required = [], optional = [], deprecated = [] } = contract.body || {};
    
    // Check for missing required fields
    required.forEach(field => {
      if (!call.bodyFields.includes(field)) {
        issues.push({
          type: 'missing_required',
          endpoint: `${call.method} ${call.url}`,
          field,
          message: `Missing required field "${field}" in API call`
        });
      }
    });
    
    // Check for deprecated fields
    call.bodyFields.forEach(field => {
      if (deprecated.includes(field)) {
        issues.push({
          type: 'deprecated_field',
          endpoint: `${call.method} ${call.url}`,
          field,
          message: `Using deprecated field "${field}" - this field is no longer accepted by the API`
        });
      }
    });
    
    // Check for unknown fields
    const allowedFields = [...required, ...optional];
    call.bodyFields.forEach(field => {
      if (!allowedFields.includes(field) && !deprecated.includes(field)) {
        warnings.push({
          type: 'unknown_field',
          endpoint: `${call.method} ${call.url}`,
          field,
          message: `Unknown field "${field}" - this field is not defined in the API contract`
        });
      }
    });
    
    // Cross-check with form fields
    const formFieldArray = Array.from(formFields);
    deprecated.forEach(deprecatedField => {
      if (formFieldArray.includes(deprecatedField)) {
        issues.push({
          type: 'form_deprecated_field',
          field: deprecatedField,
          message: `Form contains deprecated field "${deprecatedField}" that the API no longer accepts`
        });
      }
    });
  });
  
  return { issues, warnings };
}

// Main validation function
function runValidation() {
  console.log('🔍 Validating API contracts...\n');
  
  // Get changed files
  const { execSync } = require('child_process');
  const changedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(f => f && (f.endsWith('.tsx') || f.endsWith('.jsx')));
  
  let hasIssues = false;
  
  changedFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) return;
    
    const { issues, warnings } = validateAPIContracts(filePath);
    
    if (issues.length > 0 || warnings.length > 0) {
      console.log(`📄 ${file}`);
      
      issues.forEach(issue => {
        hasIssues = true;
        console.log(`  ❌ ${issue.message}`);
        if (issue.endpoint) {
          console.log(`     └─ in ${issue.endpoint}`);
        }
      });
      
      warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning.message}`);
        if (warning.endpoint) {
          console.log(`     └─ in ${warning.endpoint}`);
        }
      });
      
      console.log('');
    }
  });
  
  if (!hasIssues) {
    console.log('✅ All API contracts are valid\n');
    return true;
  }
  
  console.log('❌ API contract validation failed\n');
  console.log('💡 To fix these issues:');
  console.log('   1. Update deprecated field names in your components');
  console.log('   2. Ensure all required fields are included in API calls');
  console.log('   3. Remove any fields that are no longer accepted by the API\n');
  
  return false;
}

// Run validation
if (require.main === module) {
  const success = runValidation();
  process.exit(success ? 0 : 1);
}

module.exports = { validateAPIContracts, API_CONTRACTS };