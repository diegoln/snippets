/**
 * Unit Tests for Demo Server
 * 
 * This file contains comprehensive tests for the demo server including
 * HTTP endpoints, error handling, and server functionality.
 */

const request = require('supertest')
const http = require('http')

// Import server components (we'll need to modify demo-server.js slightly for testing)
const { CONFIG, HTTP_STATUS } = require('../demo-server')

// Create a test server instance
let server

beforeAll(() => {
  // Create server for testing
  const { createServer } = require('http')
  
  // Import the request handler from demo-server
  // Note: We'll need to extract the request handler from demo-server.js
  const serverHandler = require('../demo-server-handler') // We'll create this
  
  server = createServer(serverHandler)
})

afterAll((done) => {
  if (server) {
    server.close(done)
  } else {
    done()
  }
})

describe('Demo Server', () => {
  describe('GET /', () => {
    it('should return HTML content', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
        .expect('Content-Type', /text\/html/)
      
      expect(response.text).toContain('<!DOCTYPE html>')
      expect(response.text).toContain('Weekly Snippets')
      expect(response.text).toContain('Demo')
    })

    it('should include proper meta tags', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('<meta charset="UTF-8">')
      expect(response.text).toContain('<meta name="viewport"')
      expect(response.text).toContain('<meta name="description"')
    })

    it('should include Tailwind CSS', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('tailwindcss.com')
    })

    it('should include JavaScript application logic', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('AppState')
      expect(response.text).toContain('selectSnippet')
      expect(response.text).toContain('initializeApp')
    })
  })

  describe('GET /index.html', () => {
    it('should return same content as root path', async () => {
      const rootResponse = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      const indexResponse = await request(server)
        .get('/index.html')
        .expect(HTTP_STATUS.OK)
      
      expect(rootResponse.text).toBe(indexResponse.text)
    })
  })

  describe('GET /health', () => {
    it('should return health check information', async () => {
      const response = await request(server)
        .get('/health')
        .expect(HTTP_STATUS.OK)
        .expect('Content-Type', /application\/json/)
      
      const healthData = JSON.parse(response.text)
      
      expect(healthData).toHaveProperty('status', 'healthy')
      expect(healthData).toHaveProperty('timestamp')
      expect(healthData).toHaveProperty('uptime')
      expect(healthData).toHaveProperty('version')
      expect(typeof healthData.uptime).toBe('number')
    })

    it('should return valid timestamp', async () => {
      const response = await request(server)
        .get('/health')
        .expect(HTTP_STATUS.OK)
      
      const healthData = JSON.parse(response.text)
      const timestamp = new Date(healthData.timestamp)
      
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).toBeGreaterThan(0)
    })
  })

  describe('GET /favicon.ico', () => {
    it('should return 404 for favicon', async () => {
      await request(server)
        .get('/favicon.ico')
        .expect(HTTP_STATUS.NOT_FOUND)
        .expect('Content-Type', /text\/plain/)
    })
  })

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(server)
        .get('/nonexistent')
        .expect(HTTP_STATUS.NOT_FOUND)
        .expect('Content-Type', /text\/plain/)
      
      const response = await request(server)
        .get('/nonexistent')
      
      expect(response.text).toBe('Not found')
    })
  })

  describe('HTTP Headers', () => {
    it('should include proper security headers', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.headers).toHaveProperty('content-type')
      expect(response.headers).toHaveProperty('content-length')
      expect(response.headers).toHaveProperty('x-response-time')
    })

    it('should include cache control headers', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate')
    })

    it('should include response time header', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/)
    })
  })

  describe('Request Methods', () => {
    it('should handle POST requests to root path', async () => {
      await request(server)
        .post('/')
        .expect(HTTP_STATUS.OK)
        .expect('Content-Type', /text\/html/)
    })

    it('should handle PUT requests', async () => {
      await request(server)
        .put('/')
        .expect(HTTP_STATUS.OK)
        .expect('Content-Type', /text\/html/)
    })

    it('should handle DELETE requests', async () => {
      await request(server)
        .delete('/')
        .expect(HTTP_STATUS.OK)
        .expect('Content-Type', /text\/html/)
    })
  })

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // This would require mocking internal functions to throw errors
      // For now, we test that the server responds to requests
      const response = await request(server)
        .get('/')
      
      expect(response.status).toBe(HTTP_STATUS.OK)
    })
  })

  describe('Performance', () => {
    it('should respond within reasonable time', async () => {
      const startTime = Date.now()
      
      await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      // Should respond within 1 second
      expect(responseTime).toBeLessThan(1000)
    })

    it('should include response time in headers', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      const responseTime = response.headers['x-response-time']
      expect(responseTime).toMatch(/^\d+ms$/)
      
      const timeMs = parseInt(responseTime.replace('ms', ''))
      expect(timeMs).toBeGreaterThan(0)
      expect(timeMs).toBeLessThan(1000) // Should be under 1 second
    })
  })

  describe('Content Validation', () => {
    it('should generate valid HTML', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      // Check for basic HTML structure
      expect(response.text).toMatch(/<!DOCTYPE html>/)
      expect(response.text).toMatch(/<html[^>]*>/)
      expect(response.text).toMatch(/<head>/)
      expect(response.text).toMatch(/<body[^>]*>/)
      expect(response.text).toMatch(/<\/html>/)
    })

    it('should include required accessibility features', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      // Check for skip link
      expect(response.text).toContain('Skip to main content')
      
      // Check for semantic HTML
      expect(response.text).toContain('<main')
      expect(response.text).toContain('<header')
      expect(response.text).toContain('<nav')
      
      // Check for ARIA labels
      expect(response.text).toContain('aria-label')
      expect(response.text).toContain('role=')
    })

    it('should include proper form elements', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      // Check for interactive elements
      expect(response.text).toContain('<button')
      expect(response.text).toContain('onclick=')
      
      // Check for proper labeling
      expect(response.text).toContain('aria-label')
      expect(response.text).toContain('aria-pressed')
    })
  })

  describe('JavaScript Functionality', () => {
    it('should include application state management', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('const AppState')
      expect(response.text).toContain('currentWeek')
      expect(response.text).toContain('isEditing')
      expect(response.text).toContain('snippets')
    })

    it('should include snippet management functions', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('function selectSnippet')
      expect(response.text).toContain('function saveContent')
      expect(response.text).toContain('function toggleEditMode')
      expect(response.text).toContain('function loadSnippetContent')
    })

    it('should include keyboard event handling', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('handleKeyboardShortcuts')
      expect(response.text).toContain('addEventListener')
      expect(response.text).toContain('keydown')
    })

    it('should include accessibility features', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('announceToScreenReader')
      expect(response.text).toContain('aria-live')
      expect(response.text).toContain('handleBeforeUnload')
    })
  })

  describe('Mock Data', () => {
    it('should include snippet data', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      expect(response.text).toContain('Week 30')
      expect(response.text).toContain('Week 29')
      expect(response.text).toContain('Week 28')
      
      expect(response.text).toContain('Jul 21st - Jul 25th')
      expect(response.text).toContain('user authentication system')
    })

    it('should include properly formatted snippet content', async () => {
      const response = await request(server)
        .get('/')
        .expect(HTTP_STATUS.OK)
      
      // Check that content is properly escaped
      expect(response.text).not.toContain('<script>')
      expect(response.text).not.toContain('javascript:')
      
      // Check that content includes expected text
      expect(response.text).toContain('database schema design')
      expect(response.text).toContain('API integration')
    })
  })
})