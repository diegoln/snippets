/**
 * Base Integration Class
 * 
 * Abstract base class that all integration providers must extend.
 * Provides common functionality and enforces consistent interface
 * across Google Calendar, Todoist, and GitHub integrations.
 */

import { 
  IntegrationConfig, 
  IntegrationData, 
  WeeklyDataRequest, 
  AuthTokens,
  IntegrationError,
  IntegrationType
} from './types'

export abstract class BaseIntegration {
  protected config: IntegrationConfig
  protected tokens?: AuthTokens

  constructor(config: IntegrationConfig) {
    this.config = config
  }

  /**
   * Set authentication tokens for this integration
   */
  setTokens(tokens: AuthTokens): void {
    this.tokens = tokens
  }

  /**
   * Check if integration is properly configured and authenticated
   */
  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken
  }

  /**
   * Get integration type
   */
  getType(): IntegrationType {
    return this.config.type
  }

  /**
   * Check if real API should be used (vs mock data)
   */
  protected shouldUseRealAPI(): boolean {
    // Use real API in production, or when explicitly enabled in development
    return process.env.NODE_ENV === 'production' || 
           this.config.useRealAPI === true
  }

  /**
   * Fetch weekly data from the integration
   * Each provider implements this differently based on their API
   */
  abstract fetchWeeklyData(request: WeeklyDataRequest): Promise<IntegrationData>

  /**
   * Refresh authentication tokens if needed
   */
  abstract refreshTokens(): Promise<AuthTokens>

  /**
   * Test the integration connection
   */
  abstract testConnection(): Promise<boolean>

  /**
   * Transform raw API data to standardized format
   */
  protected abstract transformData(rawData: any): any

  /**
   * Get mock data for development/testing
   */
  protected abstract getMockData(request: WeeklyDataRequest): Promise<IntegrationData>

  /**
   * Create integration error with context
   */
  protected createError(message: string, code: string, retryable: boolean = true): IntegrationError {
    const error = new Error(message) as IntegrationError
    error.code = code
    error.integration = this.config.type
    error.retryable = retryable
    return error
  }

  /**
   * Log integration activity (with user context)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry = {
      integration: this.config?.type,
      userId: this.config?.userId,
      message,
      data,
      timestamp: new Date().toISOString()
    }

    const integrationName = this.config?.type ? this.config.type.toUpperCase() : 'UNKNOWN'
    console[level](`[${integrationName}]`, logEntry)
  }
}