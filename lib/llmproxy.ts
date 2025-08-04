/**
 * LLMProxy - Google Gemini Implementation
 * 
 * Unified implementation using Google Gemini for both development and production.
 * This provides consistent LLM behavior across all environments.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface LLMProxyRequest {
  prompt: string
  context?: any
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface LLMProxyResponse {
  content: string
  usage?: {
    tokens: number
    cost?: number
  }
  model: string
}

/**
 * LLMProxy client using Google Gemini
 */
export class LLMProxyClient {
  private genAI: GoogleGenerativeAI | null = null
  private model: string
  private geminiApiKey?: string

  constructor() {
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    this.geminiApiKey = process.env.GEMINI_API_KEY
    
    if (this.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(this.geminiApiKey)
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found. Using mock responses.')
    }
  }




  /**
   * Generic LLM request method
   */
  async request(request: LLMProxyRequest): Promise<LLMProxyResponse> {
    try {
      if (this.genAI) {
        return await this.callGemini(request.prompt, request.temperature, request.maxTokens)
      } else {
        // Default mock response when API key not configured
        return {
          content: "This is a mock response. Please configure GEMINI_API_KEY to use real Gemini AI.",
          model: this.model,
          usage: {
            tokens: 100
          }
        }
      }
    } catch (error) {
      console.error('LLMProxy request error:', error)
      throw new Error('LLMProxy request failed')
    }
  }

  /**
   * Call Google Gemini API
   */
  private async callGemini(prompt: string, temperature = 0.7, maxTokens = 2000): Promise<LLMProxyResponse> {
    if (!this.genAI) {
      throw new Error('Gemini API not configured')
    }

    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        }
      })

      // Add timeout protection to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Gemini API request timed out after 30 seconds')), 30000)
      })

      const geminiPromise = (async () => {
        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()
        return { text, response }
      })()

      const { text, response } = await Promise.race([geminiPromise, timeoutPromise]) as { text: string, response: any }

      // Check for empty response - might indicate model or content filtering issues
      if (!text || text.trim().length === 0) {
        throw new Error(`Gemini returned empty response - check model name "${this.model}" or content filters`)
      }

      return {
        content: text,
        model: this.model,
        usage: {
          tokens: response.usageMetadata?.totalTokenCount || 0,
          cost: this.calculateGeminiCost(response.usageMetadata?.totalTokenCount || 0)
        }
      }
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error(`Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Calculate approximate cost for Gemini usage
   */
  private calculateGeminiCost(tokens: number): number {
    // Gemini 1.5 Flash pricing (as of 2024): 
    // Input: $0.075 per 1M tokens, Output: $0.30 per 1M tokens
    // Rough estimate: $0.0001 per 1K tokens average (much cheaper than OpenAI)
    return (tokens / 1000) * 0.0001
  }

}

// Export singleton instance
export const llmProxy = new LLMProxyClient()