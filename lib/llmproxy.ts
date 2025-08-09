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
  private genAI: GoogleGenerativeAI
  private model: string
  private geminiApiKey?: string

  constructor() {
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    this.geminiApiKey = process.env.GEMINI_API_KEY
    
    // Allow tests and build processes to run without API key
    if (!this.geminiApiKey && process.env.NODE_ENV !== 'test' && !process.env.SKIP_ENV_VALIDATION) {
      console.error('\n' + '='.repeat(80))
      console.error('❌ GEMINI API KEY REQUIRED AT STARTUP')
      console.error('Please set GEMINI_API_KEY in .env.development')
      console.error('Get your API key from: https://aistudio.google.com/app/apikey')
      console.error('='.repeat(80) + '\n')
      throw new Error('GEMINI_API_KEY environment variable is required. Please configure your Gemini API key.')
    }
    
    if (this.geminiApiKey) {
      this.genAI = new GoogleGenerativeAI(this.geminiApiKey)
    } else {
      // For tests only - will throw error if actually used
      this.genAI = null as any
    }
  }




  /**
   * Generic LLM request method
   */
  async request(request: LLMProxyRequest): Promise<LLMProxyResponse> {
    if (!this.genAI) {
      console.error('\n' + '='.repeat(80))
      console.error('❌ GEMINI API KEY REQUIRED')
      console.error('Please set GEMINI_API_KEY in .env.development')
      console.error('Get your API key from: https://aistudio.google.com/app/apikey')
      console.error('='.repeat(80) + '\n')
      throw new Error('Gemini API not initialized. Please configure GEMINI_API_KEY in .env.development')
    }
    
    try {
      return await this.callGemini(request.prompt, request.temperature, request.maxTokens)
    } catch (error) {
      console.error('LLMProxy request error:', error)
      throw new Error(`LLMProxy request failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Call Google Gemini API with retry logic
   */
  private async callGemini(prompt: string, temperature = 0.7, maxTokens = 2000): Promise<LLMProxyResponse> {
    const maxRetries = 2
    const baseDelay = 1000 // 1 second base delay
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = this.genAI.getGenerativeModel({ 
          model: this.model,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          }
        })

        // Add timeout protection to prevent hanging requests
        const timeoutMs = 60000 // 60 seconds for complex consolidation prompts
        // Log the prompt being sent to Gemini
        console.log('\n' + '='.repeat(80))
        console.log('🚀 SENDING TO GEMINI API:')
        console.log('Model:', this.model)
        console.log('Temperature:', temperature)
        console.log('Max Tokens:', maxTokens)
        console.log('Prompt Length:', prompt.length, 'characters')
        console.log('-'.repeat(40))
        console.log('PROMPT:')
        console.log(prompt.substring(0, 500) + (prompt.length > 500 ? '...[truncated]' : ''))
        console.log('='.repeat(80) + '\n')

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Gemini API request timed out after ${timeoutMs/1000} seconds`)), timeoutMs)
        })

        const geminiPromise = (async () => {
          const result = await model.generateContent(prompt)
          const response = await result.response
          const text = response.text()
          return { text, response }
        })()

        const { text, response } = await Promise.race([geminiPromise, timeoutPromise]) as { text: string, response: any }

        // Log the response from Gemini
        console.log('\n' + '='.repeat(80))
        console.log('✅ RECEIVED FROM GEMINI API:')
        console.log('Response Length:', text?.length || 0, 'characters')
        console.log('Tokens Used:', response.usageMetadata?.totalTokenCount || 'unknown')
        console.log('-'.repeat(40))
        console.log('RESPONSE:')
        console.log(text?.substring(0, 500) + (text?.length > 500 ? '...[truncated]' : ''))
        console.log('='.repeat(80) + '\n')

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
        const isLastAttempt = attempt === maxRetries
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        console.error(`Gemini API error (attempt ${attempt + 1}/${maxRetries + 1}):`, errorMessage)
        
        if (isLastAttempt) {
          throw new Error(`Gemini API error after ${maxRetries + 1} attempts: ${errorMessage}`)
        }
        
        // Wait before retrying (exponential backoff)
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // This should never be reached due to the throw in the last attempt
    throw new Error('Unexpected error in Gemini API retry logic')
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