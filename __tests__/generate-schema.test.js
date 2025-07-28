#!/usr/bin/env node

/**
 * Unit Tests for generate-schema.js
 * 
 * Tests the schema generation script in isolation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test utilities
function createTestTemplate(content) {
  const testDir = path.join(__dirname, 'temp');
  const prismaDir = path.join(testDir, 'prisma');
  const scriptsDir = path.join(testDir, 'scripts');
  
  // Create directory structure
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  if (!fs.existsSync(prismaDir)) {
    fs.mkdirSync(prismaDir, { recursive: true });
  }
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  const templatePath = path.join(prismaDir, 'schema.template.prisma');
  fs.writeFileSync(templatePath, content);
  
  // Copy the generate-schema.js script to test directory
  const originalScript = path.join(__dirname, '../scripts/generate-schema.js');
  const testScript = path.join(scriptsDir, 'generate-schema.js');
  fs.copyFileSync(originalScript, testScript);
  
  return { testDir, templatePath, scriptPath: testScript };
}

function runSchemaGeneration(testDir, nodeEnv = 'development') {
  const scriptPath = path.join(testDir, 'scripts/generate-schema.js');
  
  try {
    // Run the script with specified environment from test directory
    const result = execSync(`NODE_ENV=${nodeEnv} node ${scriptPath}`, {
      encoding: 'utf8',
      cwd: testDir
    });
    
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout || '' };
  }
}

function cleanup(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

// Test cases
const tests = [
  {
    name: 'Development environment generates SQLite schema',
    template: `
datasource db {
  provider = "__DB_PROVIDER__"
  url      = env("DATABASE_URL")
}

model Integration {
  metadata __METADATA_TYPE__ @default("{}")
}`,
    environment: 'development',
    expectedProvider: 'sqlite',
    expectedMetadata: 'String'
  },
  
  {
    name: 'Production environment generates PostgreSQL schema',
    template: `
datasource db {
  provider = "__DB_PROVIDER__"
  url      = env("DATABASE_URL")
}

model Integration {
  metadata __METADATA_TYPE__ @default("{}")
}`,
    environment: 'production',
    expectedProvider: 'postgresql',
    expectedMetadata: 'Json'
  },
  
  {
    name: 'Missing template file throws error',
    template: null, // Don't create template
    environment: 'development',
    shouldFail: true,
    expectedError: 'schema.template.prisma not found'
  },
  
  {
    name: 'Missing placeholders throws error',
    template: `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`,
    environment: 'development',
    shouldFail: true,
    expectedError: 'Missing required placeholders'
  },
  
  {
    name: 'Unknown placeholders throws error',
    template: `
datasource db {
  provider = "__DB_PROVIDER__"
  url      = env("DATABASE_URL")
}

model Integration {
  metadata __METADATA_TYPE__ @default("{}")
  unknown __UNKNOWN_PLACEHOLDER__
}`,
    environment: 'development',
    shouldFail: true,
    expectedError: 'Unreplaced placeholders found'
  }
];

// Run tests
console.log('🧪 Running generate-schema.js unit tests...\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`Testing: ${test.name}`);
  
  let testDir;
  try {
    if (test.template) {
      const { testDir: dir } = createTestTemplate(test.template);
      testDir = dir;
    } else {
      // Create empty test directory for missing template test
      testDir = path.join(__dirname, 'temp');
      const scriptsDir = path.join(testDir, 'scripts');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }
      
      // Copy script but don't create template
      const originalScript = path.join(__dirname, '../scripts/generate-schema.js');
      const testScript = path.join(scriptsDir, 'generate-schema.js');
      fs.copyFileSync(originalScript, testScript);
    }
    
    const result = runSchemaGeneration(testDir, test.environment);
    
    if (test.shouldFail) {
      if (result.success) {
        console.log(`❌ FAIL - Expected failure but test passed`);
        failed++;
      } else if (result.error.includes(test.expectedError)) {
        console.log(`✅ PASS - Failed with expected error`);
        passed++;
      } else {
        console.log(`❌ FAIL - Wrong error message. Expected: "${test.expectedError}", Got: "${result.error}"`);
        failed++;
      }
    } else {
      if (!result.success) {
        console.log(`❌ FAIL - ${result.error}`);
        failed++;
      } else {
        // Check generated schema content
        const schemaPath = path.join(testDir, 'prisma/schema.prisma');
        if (!fs.existsSync(schemaPath)) {
          console.log(`❌ FAIL - Schema file not generated`);
          failed++;
        } else {
          const generatedSchema = fs.readFileSync(schemaPath, 'utf8');
          
          const hasCorrectProvider = generatedSchema.includes(`provider = "${test.expectedProvider}"`);
          const hasCorrectMetadata = generatedSchema.includes(`metadata ${test.expectedMetadata}`);
          const hasNoPlaceholders = !generatedSchema.match(/__[A-Z_]+__/g);
          
          if (hasCorrectProvider && hasCorrectMetadata && hasNoPlaceholders) {
            console.log(`✅ PASS - Schema generated correctly`);
            passed++;
          } else {
            console.log(`❌ FAIL - Schema content incorrect`);
            if (!hasCorrectProvider) console.log(`  - Expected provider: ${test.expectedProvider}`);
            if (!hasCorrectMetadata) console.log(`  - Expected metadata: ${test.expectedMetadata}`);
            if (!hasNoPlaceholders) console.log(`  - Found unreplaced placeholders`);
            failed++;
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ FAIL - Test setup error: ${error.message}`);
    failed++;
  } finally {
    if (testDir) {
      cleanup(testDir);
    }
  }
  
  console.log('');
}

// Summary
console.log('📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Total: ${passed + failed}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}