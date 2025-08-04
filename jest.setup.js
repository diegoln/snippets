/**
 * Jest Setup File
 * 
 * This file is run before each test suite to set up the testing environment.
 * It includes global test utilities and configurations.
 */

require('@testing-library/jest-dom')

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Comprehensive JSDOM fixes - apply IMMEDIATELY before any other code runs
// Create a completely safe document mock that prevents all addEventListener errors

// Step 1: Create a mock document implementation
const createMockDocument = () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  createElement: jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  })),
  body: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  head: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  documentElement: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  }
});

// Step 2: Intercept any window/document access and ensure they're safe
if (typeof global !== 'undefined') {
  // Ensure global.window exists and has safe document
  if (!global.window) {
    global.window = {
      document: createMockDocument(),
      navigator: { userAgent: 'test' },
      location: { href: 'http://localhost' }
    };
  } else if (!global.window.document) {
    global.window.document = createMockDocument();
  }
  
  // Force override any existing document methods that may be broken
  if (global.window.document) {
    Object.defineProperty(global.window.document, 'addEventListener', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(global.window.document, 'removeEventListener', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(global.window.document, 'dispatchEvent', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
  }
}

// Step 3: Also handle direct window access (if it exists)
if (typeof window !== 'undefined') {
  if (!window.document) {
    window.document = createMockDocument();
  } else {
    // Force override existing methods
    Object.defineProperty(window.document, 'addEventListener', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(window.document, 'removeEventListener', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
    Object.defineProperty(window.document, 'dispatchEvent', {
      value: jest.fn(),
      writable: true,
      configurable: true
    });
  }
}

// Mock Web APIs for Next.js API route testing
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock Request and Response for Next.js API route tests
// Using a simple mock that matches Next.js NextRequest interface
global.Request = class MockRequest {
  constructor(url, init = {}) {
    this.url = url
    this.method = init.method || 'GET'
    this.headers = new Map(Object.entries(init.headers || {}))
    this.body = init.body
  }
  
  async json() {
    if (this.body) {
      return JSON.parse(this.body)
    }
    return {}
  }
}

global.Response = class MockResponse {
  constructor(body, init = {}) {
    this.body = body
    this.status = init.status || 200
    this.headers = new Map(Object.entries(init.headers || {}))
  }
  
  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    return this.body
  }
}

// Mock fetch for API tests
global.fetch = jest.fn()

// Mock console methods to avoid noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Global test helpers
global.testHelpers = {
  // Helper to create mock weekly snippets
  createMockSnippet: (overrides = {}) => ({
    id: '1',
    weekNumber: 30,
    startDate: '2024-07-21',
    endDate: '2024-07-25',
    content: 'Test snippet content',
    ...overrides
  }),
  
  // Helper to create mock events
  createMockEvent: (overrides = {}) => ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: { value: '' },
    ...overrides
  })
}