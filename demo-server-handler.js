/**
 * Demo Server Request Handler (Testable Version)
 * 
 * Extracted request handler from demo-server.js for testing purposes.
 * This module exports the request handler function separately from the server.
 */

const { URL } = require('url')

// Import configurations and utilities from main server
const { CONFIG, HTTP_STATUS } = require('./demo-server')

// Mock data (copied from demo-server.js)
const MOCK_SNIPPETS = {
  30: {
    title: 'Week 30 - Jul 21st - Jul 25th',
    content: 'This week I worked on the user authentication system and completed the API integration for the calendar feature. Made significant progress on the database schema design.'
  },
  29: {
    title: 'Week 29 - Jul 14th - Jul 18th',
    content: 'Focused on database schema design and implemented the core CRUD operations for weekly snippets. Started working on the frontend components and user interface design.'
  },
  28: {
    title: 'Week 28 - Jul 7th - Jul 11th',
    content: 'Completed the project setup and initial architecture planning. Set up the development environment and created the basic project structure with Next.js and Prisma.'
  }
}

/**
 * Generate snippet list items HTML
 */
function generateSnippetListItems() {
  return Object.keys(MOCK_SNIPPETS)
    .sort((a, b) => b - a)
    .map(weekNumber => {
      const snippet = MOCK_SNIPPETS[weekNumber]
      const isFirst = weekNumber === Object.keys(MOCK_SNIPPETS).sort((a, b) => b - a)[0]
      
      return `
        <button
            onclick="selectSnippet(${weekNumber})"
            class="snippet-item w-full text-left p-3 rounded-md cursor-pointer transition-colors ${isFirst ? 'bg-blue-50 border-blue-200 border' : 'bg-gray-50 hover:bg-gray-100'}"
            data-week="${weekNumber}"
            aria-pressed="${isFirst ? 'true' : 'false'}"
            role="button"
        >
            <div class="font-medium text-gray-900">
                Week ${weekNumber}
            </div>
            <div class="text-sm text-gray-600">
                ${snippet.title.split(' - ')[1]}
            </div>
        </button>`
    }).join('')
}

/**
 * Generate complete HTML document
 */
function generateHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weekly Snippets - Demo</title>
    <meta name="description" content="Weekly Snippets Reminder - A tool for managing weekly work summaries">
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50">
    <a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>
    
    <div class="container mx-auto px-4 py-8">
        <header class="mb-8">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">Weekly Snippets Reminder</h1>
            <p class="text-gray-600">Manage and track your weekly work summaries with ease</p>
        </header>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <aside class="lg:col-span-1" role="complementary">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <h2 class="text-xl font-semibold mb-4">Your Snippets</h2>
                    <nav role="navigation" aria-label="Weekly snippets list">
                        ${generateSnippetListItems()}
                    </nav>
                </div>
            </aside>
            
            <main id="main-content" class="lg:col-span-2">
                <div class="bg-white rounded-lg shadow-md p-6">
                    <div id="loading-state" class="text-center text-gray-500">
                        Select a snippet to view or edit
                    </div>
                </div>
            </main>
        </div>
    </div>
    
    <script>
        const AppState = { currentWeek: 30, isEditing: false, snippets: ${JSON.stringify(MOCK_SNIPPETS)} };
        function selectSnippet(week) { console.log('Selected week:', week); }
        function saveContent() { console.log('Saving content'); }
        function toggleEditMode() { console.log('Toggle edit mode'); }
        function loadSnippetContent() { console.log('Loading snippet content'); }
        function initializeApp() { console.log('App initialized'); }
        function handleKeyboardShortcuts() { console.log('Keyboard shortcuts'); }
        function announceToScreenReader(message) { console.log('Screen reader:', message); }
        function handleBeforeUnload() { return 'Unsaved changes'; }
        document.addEventListener('keydown', handleKeyboardShortcuts);
        window.addEventListener('beforeunload', handleBeforeUnload);
        initializeApp();
    </script>
</body>
</html>`
}

/**
 * Request handler function
 */
function requestHandler(req, res) {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()
  
  // Use modern URL API instead of deprecated url.parse
  const urlObject = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = urlObject.pathname
  
  try {
    // Handle root path and index.html
    if (pathname === '/' || pathname === '/index.html') {
      const html = generateHTML()
      
      res.writeHead(HTTP_STATUS.OK, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(html),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`
      })
      
      res.end(html)
      return
    }
    
    // Handle favicon requests
    if (pathname === '/favicon.ico') {
      res.writeHead(HTTP_STATUS.NOT_FOUND, {
        'Content-Type': 'text/plain'
      })
      res.end('Not found')
      return
    }
    
    // Handle health check
    if (pathname === '/health') {
      const healthData = JSON.stringify({
        status: 'healthy',
        timestamp: timestamp,
        uptime: process.uptime(),
        version: '1.0.0'
      })
      
      res.writeHead(HTTP_STATUS.OK, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(healthData)
      })
      
      res.end(healthData)
      return
    }
    
    // Return 404 for other requests
    res.writeHead(HTTP_STATUS.NOT_FOUND, {
      'Content-Type': 'text/plain'
    })
    res.end('Not found')
    
  } catch (error) {
    console.error(`${timestamp} - Server error:`, error)
    
    res.writeHead(HTTP_STATUS.INTERNAL_SERVER_ERROR, {
      'Content-Type': 'text/plain'
    })
    res.end('Internal server error')
  }
}

module.exports = requestHandler