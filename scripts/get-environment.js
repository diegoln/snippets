#!/usr/bin/env node
/**
 * Environment Detection Script for Shell Scripts
 * 
 * This script provides a simple way for shell scripts to get the current
 * environment mode using the shared environment detection logic.
 * 
 * Usage: node scripts/get-environment.js
 * Output: "development" | "staging" | "production"
 */

// Use the same environment detection logic as the rest of the app
function getEnvironmentMode() {
  // Check for custom runtime environment variable first (Cloud Run sets this)
  // This avoids Next.js build-time optimization of process.env.NODE_ENV
  const runtimeEnv = process.env.RUNTIME_ENV || process.env.NODE_ENV
  
  if (runtimeEnv === 'development') {
    return 'development'
  }
  
  if (runtimeEnv === 'staging') {
    return 'staging'
  }
  
  // Default to production
  return 'production'
}

// Output the environment mode
console.log(getEnvironmentMode())