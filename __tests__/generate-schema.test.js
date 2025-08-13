/**
 * Unit Tests for smart-schema-generate.js
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
  
  // Copy the smart-schema-generate.js script to test directory
  const originalScript = path.join(__dirname, '../scripts/smart-schema-generate.js');
  const testScript = path.join(scriptsDir, 'smart-schema-generate.js');
  fs.copyFileSync(originalScript, testScript);
  
  return { testDir, templatePath, scriptPath: testScript };
}

function runSchemaGeneration(testDir, nodeEnv = 'development') {
  const scriptPath = path.join(testDir, 'scripts/smart-schema-generate.js');
  
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

// Jest test suite
describe('smart-schema-generate.js', () => {
  let testDirCounter = 0;
  
  beforeEach(() => {
    testDirCounter++;
  });
  
  afterEach(() => {
    // Clean up any test directories
    const testDir = path.join(__dirname, `temp-${testDirCounter}`);
    if (fs.existsSync(testDir)) {
      cleanup(testDir);
    }
  });
  
  // Helper function to create unique test directory
  function createUniqueTestTemplate(content) {
    const testDir = path.join(__dirname, `temp-${testDirCounter}`);
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
    
    // Copy the smart-schema-generate.js script to test directory
    const originalScript = path.join(__dirname, '../scripts/smart-schema-generate.js');
    const testScript = path.join(scriptsDir, 'smart-schema-generate.js');
    fs.copyFileSync(originalScript, testScript);
    
    return { testDir, templatePath, scriptPath: testScript };
  }
  
  test('should generate PostgreSQL schema for development environment (new unified behavior)', () => {
    const template = `
datasource db {
  provider = "__DB_PROVIDER__"
  url      = env("DATABASE_URL")
}

model Integration {
  metadata __METADATA_TYPE__ @default("{}")
}`;
    
    const { testDir } = createUniqueTestTemplate(template);
    const result = runSchemaGeneration(testDir, 'development');
    
    expect(result.success).toBe(true);
    
    const schemaPath = path.join(testDir, 'prisma/schema.prisma');
    expect(fs.existsSync(schemaPath)).toBe(true);
    
    const generatedSchema = fs.readFileSync(schemaPath, 'utf8');
    expect(generatedSchema).toContain('provider = "postgresql"');
    expect(generatedSchema).toContain('metadata Json');
    expect(generatedSchema).not.toMatch(/__[A-Z_]+__/g);
  });
  
  test('should generate SQLite schema for test environment with SQLite URL', () => {
    const template = `
datasource db {
  provider = "__DB_PROVIDER__"
  url      = env("DATABASE_URL")
}

model Integration {
  metadata __METADATA_TYPE__ @default("{}")
}`;
    
    const { testDir } = createUniqueTestTemplate(template);
    
    // Run with test environment AND SQLite DATABASE_URL to trigger SQLite generation
    const scriptPath = path.join(testDir, 'scripts/smart-schema-generate.js');
    try {
      const result = execSync(`NODE_ENV=test DATABASE_URL=file:./test.db node ${scriptPath}`, {
        cwd: testDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const schemaPath = path.join(testDir, 'prisma/schema.prisma');
      expect(fs.existsSync(schemaPath)).toBe(true);
      
      const generatedSchema = fs.readFileSync(schemaPath, 'utf8');
      expect(generatedSchema).toContain('provider = "sqlite"');
      expect(generatedSchema).toContain('metadata String');
      expect(generatedSchema).not.toMatch(/__[A-Z_]+__/g);
    } catch (error) {
      throw new Error(`Schema generation failed: ${error.message}`);
    }
  });

  test('should generate PostgreSQL schema for production environment', () => {
    const template = `
datasource db {
  provider = "__DB_PROVIDER__"
  url      = env("DATABASE_URL")
}

model Integration {
  metadata __METADATA_TYPE__ @default("{}")
}`;
    
    const { testDir } = createUniqueTestTemplate(template);
    const result = runSchemaGeneration(testDir, 'production');
    
    expect(result.success).toBe(true);
    
    const schemaPath = path.join(testDir, 'prisma/schema.prisma');
    expect(fs.existsSync(schemaPath)).toBe(true);
    
    const generatedSchema = fs.readFileSync(schemaPath, 'utf8');
    expect(generatedSchema).toContain('provider = "postgresql"');
    expect(generatedSchema).toContain('metadata Json');
    expect(generatedSchema).not.toMatch(/__[A-Z_]+__/g);
  });
  
  test('should throw error when template file is missing', () => {
    const testDir = path.join(__dirname, `temp-${testDirCounter}`);
    const scriptsDir = path.join(testDir, 'scripts');
    
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }
    
    // Copy script but don't create template
    const originalScript = path.join(__dirname, '../scripts/smart-schema-generate.js');
    const testScript = path.join(scriptsDir, 'smart-schema-generate.js');
    fs.copyFileSync(originalScript, testScript);
    
    const result = runSchemaGeneration(testDir, 'development');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('ENOENT: no such file or directory');
  });
  
  test('should throw error when required placeholders are missing', () => {
    const template = `
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;
    
    const { testDir } = createUniqueTestTemplate(template);
    const result = runSchemaGeneration(testDir, 'development');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Missing required placeholders');
  });
  
  test('should throw error when unknown placeholders are found', () => {
    const template = `
datasource db {
  provider = "__DB_PROVIDER__"
  url      = env("DATABASE_URL")
}

model Integration {
  metadata __METADATA_TYPE__ @default("{}")
  unknown __UNKNOWN_PLACEHOLDER__
}`;
    
    const { testDir } = createUniqueTestTemplate(template);
    const result = runSchemaGeneration(testDir, 'development');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unreplaced placeholders found');
  });
});