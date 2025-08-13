/**
 * Custom Next.js Server for Production Deployment
 * 
 * This server is used in production environments (like Google Cloud Run)
 * to provide better control over server initialization, middleware,
 * and graceful shutdown handling.
 * 
 * Features:
 * - Configurable port (uses PORT env var from Cloud Run)
 * - Graceful shutdown handling for containers
 * - Production optimizations
 * - Request logging for production monitoring
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

// Configuration from environment
// CRITICAL: Next.js treats any non-'production' NODE_ENV as development mode
// Development mode requires app/ or pages/ directories to exist at runtime
// Staging uses NODE_ENV='staging' for mock auth, but needs production-like behavior
// Therefore, we treat both 'production' AND 'staging' as production for Next.js
const dev = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

/**
 * Graceful shutdown handler
 * Ensures proper cleanup when container receives termination signals
 */
function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Starting graceful shutdown...`)
  
  server.close(() => {
    console.log('HTTP server closed.')
    process.exit(0)
  })

  // Force close after 30 seconds
  setTimeout(() => {
    console.log('Forced shutdown after 30 seconds')
    process.exit(1)
  }, 30000)
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

let server

/**
 * Start the server
 */
app.prepare().then(() => {
  server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      
      // Production request logging
      if (!dev) {
        console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
      }
      
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Environment: ${process.env.NODE_ENV}`)
  })
})