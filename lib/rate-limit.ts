/**
 * Simple in-memory rate limiting for AI endpoints
 * In production, this should be replaced with Redis or database-backed rate limiting
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs = 60000, maxRequests = 10) { // 10 requests per minute by default
    this.windowMs = windowMs
    this.maxRequests = maxRequests
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  check(userId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const key = `ai_${userId}`
    
    const entry = this.store.get(key)
    
    if (!entry || now > entry.resetTime) {
      // First request or window expired
      const resetTime = now + this.windowMs
      this.store.set(key, { count: 1, resetTime })
      return { 
        allowed: true, 
        remaining: this.maxRequests - 1, 
        resetTime 
      }
    }
    
    if (entry.count >= this.maxRequests) {
      // Rate limit exceeded
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: entry.resetTime 
      }
    }
    
    // Increment counter
    entry.count++
    this.store.set(key, entry)
    
    return { 
      allowed: true, 
      remaining: this.maxRequests - entry.count, 
      resetTime: entry.resetTime 
    }
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  // For testing - reset all limits
  reset() {
    this.store.clear()
  }
}

// Different rate limits for different types of AI operations
export const snippetRateLimit = new RateLimiter(60000, 5) // 5 snippet generations per minute
export const reflectionRateLimit = new RateLimiter(60000, 8) // 8 reflection drafts per minute
export const generalAIRateLimit = new RateLimiter(60000, 10) // 10 general AI requests per minute

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: { remaining: number; resetTime: number }) {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
  }
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
  
  return {
    error: 'Rate limit exceeded. Please try again later.',
    retryAfter,
    message: `Too many AI requests. Please wait ${retryAfter} seconds before trying again.`
  }
}