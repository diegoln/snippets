#!/usr/bin/env node

/**
 * Lightweight dev server that bypasses npm install issues
 * Starts Next.js directly with minimal dependencies
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🚀 Starting lightweight dev server...')

// Check if node_modules exists at all
const nodeModulesPath = path.join(__dirname, 'node_modules')
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ No node_modules found. Please run: npm install --production')
  process.exit(1)
}

// Check for essential packages
const essentialPackages = ['next', '@prisma/client', 'react']
const missingPackages = essentialPackages.filter(pkg => 
  !fs.existsSync(path.join(nodeModulesPath, pkg))
)

if (missingPackages.length > 0) {
  console.log('⚠️  Missing packages:', missingPackages.join(', '))
  console.log('📦 Installing only essential packages...')
  
  const npmInstall = spawn('npm', ['install', '--production', ...essentialPackages], {
    stdio: 'inherit',
    shell: true
  })
  
  npmInstall.on('close', (code) => {
    if (code === 0) {
      startDevServer()
    } else {
      console.error('❌ Failed to install essential packages')
      process.exit(1)
    }
  })
} else {
  startDevServer()
}

function startDevServer() {
  console.log('✅ Starting Next.js dev server...')
  
  // Generate schema first
  console.log('🔧 Generating Prisma schema...')
  const schemaGen = spawn('node', ['scripts/smart-schema-generate.js'], {
    stdio: 'inherit',
    shell: true
  })
  
  schemaGen.on('close', (code) => {
    if (code === 0) {
      // Start Next.js
      const nextDev = spawn('npx', ['next', 'dev'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, NODE_ENV: 'development' }
      })
      
      nextDev.on('close', (code) => {
        console.log(`Next.js dev server exited with code ${code}`)
      })
      
      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down dev server...')
        nextDev.kill('SIGINT')
        process.exit(0)
      })
    } else {
      console.error('❌ Schema generation failed')
      process.exit(1)
    }
  })
}