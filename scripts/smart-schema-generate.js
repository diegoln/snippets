#!/usr/bin/env node

/**
 * Smart Schema Generation Script
 * 
 * Only regenerates Prisma schema when:
 * 1. Schema template has changed
 * 2. Environment has changed (NODE_ENV)
 * 3. Target schema doesn't exist
 * 4. Force flag is provided
 * 
 * This dramatically speeds up development cycles by avoiding
 * unnecessary schema regeneration.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const templatePath = path.join(__dirname, '../prisma/schema.template.prisma');
const outputPath = path.join(__dirname, '../prisma/schema.prisma');
const cacheFile = path.join(__dirname, '../.next/schema-cache.json');

// Ensure .next directory exists
const nextDir = path.dirname(cacheFile);
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isStaging = process.env.NODE_ENV === 'staging';
const isProduction = process.env.NODE_ENV === 'production';
const forceGenerate = process.argv.includes('--force');

function log(message) {
  console.log(`[Schema] ${message}`);
}

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadCache() {
  try {
    if (!fs.existsSync(cacheFile)) return {};
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch (error) {
    return {};
  }
}

function saveCache(cache) {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  } catch (error) {
    // Cache save failure is non-critical
  }
}

function needsRegeneration() {
  // Force flag always regenerates
  if (forceGenerate) {
    log('🔄 Force flag detected - regenerating schema');
    return true;
  }

  // Target schema doesn't exist
  if (!fs.existsSync(outputPath)) {
    log('📄 Schema file missing - regenerating schema');
    return true;
  }

  // Template doesn't exist (shouldn't happen)
  if (!fs.existsSync(templatePath)) {
    log('❌ Template file missing - cannot generate schema');
    process.exit(1);
  }

  const cache = loadCache();
  const currentTemplateHash = getFileHash(templatePath);
  const currentEnv = isDevelopment ? 'development' : (isStaging ? 'staging' : 'production');
  const databaseUrl = process.env.DATABASE_URL || '';
  const isTestEnv = process.env.NODE_ENV === 'test';
  const usesSqlite = databaseUrl.includes('file:') || databaseUrl.includes('sqlite:');
  const currentDbType = (isTestEnv && usesSqlite) ? 'sqlite' : 'postgresql';

  // Environment changed
  if (cache.environment !== currentEnv) {
    log(`🔄 Environment changed (${cache.environment} → ${currentEnv}) - regenerating schema`);
    return true;
  }

  // Database type changed
  if (cache.databaseType !== currentDbType) {
    log(`🔄 Database type changed (${cache.databaseType} → ${currentDbType}) - regenerating schema`);
    return true;
  }

  // Template changed
  if (cache.templateHash !== currentTemplateHash) {
    log('🔄 Template changed - regenerating schema');
    return true;
  }

  // Schema is up to date
  log('✅ Schema is up to date - skipping generation');
  return false;
}

function generateSchema() {
  const envName = isDevelopment ? 'development' : (isStaging ? 'staging' : 'production');
  log(`🔧 Generating Prisma schema for ${envName} environment...`);

  // Read the template
  let schemaContent = fs.readFileSync(templatePath, 'utf8');

  // Validate template has required placeholders
  const requiredPlaceholders = ['__DB_PROVIDER__', '__METADATA_TYPE__'];
  const missingPlaceholders = requiredPlaceholders.filter(placeholder => 
    !schemaContent.includes(placeholder)
  );

  if (missingPlaceholders.length > 0) {
    console.error('❌ Error: Missing required placeholders in template:');
    missingPlaceholders.forEach(placeholder => {
      console.error(`   - ${placeholder}`);
    });
    process.exit(1);
  }

  // Detect environment and database type
  const databaseUrl = process.env.DATABASE_URL || '';
  const isTestEnv = process.env.NODE_ENV === 'test';
  const usesSqlite = databaseUrl.includes('file:') || databaseUrl.includes('sqlite:');
  
  if (isTestEnv && usesSqlite) {
    // Test environment with SQLite (for CI/testing compatibility)
    schemaContent = schemaContent
      .replace(/__DB_PROVIDER__/g, 'sqlite')
      .replace(/__METADATA_TYPE__/g, 'String');
    
    log('🧪 Test configuration (SQLite):');
    log('   - Database: SQLite');
    log('   - Metadata field: String');
    log('   - Environment: Testing (SQLite compatibility)');
  } else {
    // Development and Production: PostgreSQL
    schemaContent = schemaContent
      .replace(/__DB_PROVIDER__/g, 'postgresql')
      .replace(/__METADATA_TYPE__/g, 'Json');
    
    if (isDevelopment) {
      log('🐘 Development configuration (PostgreSQL):');
      log('   - Database: PostgreSQL');
      log('   - Metadata field: Json');
      log('   - Environment consistency: ✅ Matches production');
    } else if (isStaging) {
      log('🎭 Staging configuration (PostgreSQL):');
      log('   - Database: PostgreSQL');
      log('   - Metadata field: Json');
      log('   - Environment consistency: ✅ Matches production');
    } else {
      log('🏭 Production configuration:');
      log('   - Database: PostgreSQL');
      log('   - Metadata field: Json');
    }
  }

  // Validate all placeholders were replaced
  const remainingPlaceholders = schemaContent.match(/__[A-Z_]+__/g);
  if (remainingPlaceholders) {
    console.error('❌ Error: Unreplaced placeholders found:');
    remainingPlaceholders.forEach(placeholder => {
      console.error(`   - ${placeholder}`);
    });
    process.exit(1);
  }

  // Write the generated schema
  try {
    fs.writeFileSync(outputPath, schemaContent);
  } catch (error) {
    console.error('❌ Error writing schema file:', error.message);
    process.exit(1);
  }

  // Update cache
  const cacheDbUrl = process.env.DATABASE_URL || '';
  const cacheIsTestEnv = process.env.NODE_ENV === 'test';
  const cacheUsesSqlite = cacheDbUrl.includes('file:') || cacheDbUrl.includes('sqlite:');
  const cacheDbType = (cacheIsTestEnv && cacheUsesSqlite) ? 'sqlite' : 'postgresql';
  
  const cache = {
    templateHash: getFileHash(templatePath),
    environment: isDevelopment ? 'development' : 'production',
    databaseType: cacheDbType,
    generatedAt: new Date().toISOString()
  };
  saveCache(cache);

  log(`✅ Schema generated successfully: ${outputPath}`);
  
  // Show next steps only if this is a fresh generation
  if (!process.argv.includes('--quiet')) {
    log('');
    log('Next steps:');
    log('  npx prisma generate    # Generate Prisma client');
    
    const nextStepDbUrl = process.env.DATABASE_URL || '';
    const nextStepIsTestEnv = process.env.NODE_ENV === 'test';
    const nextStepUsesSqlite = nextStepDbUrl.includes('file:') || nextStepDbUrl.includes('sqlite:');
    
    if (nextStepIsTestEnv && nextStepUsesSqlite) {
      log('  npx prisma db push     # Apply schema to SQLite (test)');
    } else if (isDevelopment) {
      log('  npx prisma db push     # Apply schema to PostgreSQL');
    } else {
      log('  npx prisma migrate deploy  # Apply migrations to PostgreSQL');
    }
  }
}

// Main execution
if (require.main === module) {
  try {
    if (needsRegeneration()) {
      generateSchema();
    }
  } catch (error) {
    console.error('❌ Schema generation failed:', error.message);
    process.exit(1);
  }
}

module.exports = { needsRegeneration, generateSchema };