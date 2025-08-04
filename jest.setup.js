/**
 * Jest Setup File
 * 
 * This file is run before each test suite to set up the testing environment.
 * It includes global test utilities and configurations.
 */

require('@testing-library/jest-dom')

// Browser API Mocks for Node.js Test Environment - MUST COME FIRST
// Since we're using Node environment to avoid JSDOM issues, we need to provide browser mocks

// Create comprehensive window and document mocks
const createMockDocument = () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  createElement: jest.fn(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    style: {},
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn()
  })),
  body: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    style: {}
  },
  head: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  documentElement: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    style: {}
  },
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(),
  getElementsByTagName: jest.fn(() => []),
  createTextNode: jest.fn(() => ({ textContent: '' }))
});

const createMockWindow = () => ({
  document: createMockDocument(),
  navigator: { 
    userAgent: 'test',
    language: 'en-US',
    languages: ['en-US', 'en']
  },
  location: { 
    href: 'http://localhost',
    origin: 'http://localhost',
    pathname: '/',
    search: '',
    hash: ''
  },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  sessionStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  },
  getComputedStyle: jest.fn(() => ({})),
  requestAnimationFrame: jest.fn(cb => setTimeout(cb, 0)),
  cancelAnimationFrame: jest.fn(),
  scrollTo: jest.fn(),
  alert: jest.fn(),
  confirm: jest.fn(() => true),
  prompt: jest.fn()
});

// Set up global window and document FIRST
global.window = createMockWindow();
global.document = global.window.document;
global.navigator = global.window.navigator;
global.location = global.window.location;

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