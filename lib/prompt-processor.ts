import { AssessmentContext } from '../types/performance'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * Process career check-in prompt template with context data
 */
export class PromptProcessor {
  private static templateCache: Map<string, string> = new Map()

  /**
   * Load and process the career check-in prompt template
   */
  static async processPerformanceAssessmentPrompt(context: AssessmentContext): Promise<string> {
    // Load template from file (with caching)
    let template = this.templateCache.get('career-check-in')
    
    if (!template) {
      try {
        const templatePath = join(process.cwd(), 'lib/prompts/career-check-in.md')
        template = readFileSync(templatePath, 'utf-8')
        this.templateCache.set('career-check-in', template)
      } catch (error) {
        console.error('Failed to load prompt template:', error)
        throw new Error('Prompt template not found')
      }
    }

    // Process the template with context data
    return this.processTemplate(template, context)
  }

  /**
   * Simple template processor for Handlebars-style syntax
   * Supports: {{variable}}, {{#if condition}}, {{#each array}}
   */
  private static processTemplate(template: string, context: AssessmentContext): string {
    let processed = template

    // Replace simple variables {{variable.property}}
    processed = processed.replace(/\{\{([^}#/]+)\}\}/g, (match, path) => {
      return this.getNestedValue(context, path.trim()) || ''
    })

    // Process conditional blocks {{#if condition}}...{{/if}}
    processed = processed.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      const value = this.getNestedValue(context, condition.trim())
      return value ? content : ''
    })

    // Process each loops {{#each array}}...{{/each}}
    processed = processed.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayPath, itemTemplate) => {
      const array = this.getNestedValue(context, arrayPath.trim())
      if (!Array.isArray(array)) return ''
      
      return array.map(item => {
        let itemContent = itemTemplate
        // Replace {{property}} with item.property for each iteration
        itemContent = itemContent.replace(/\{\{([^}#/]+)\}\}/g, (match: string, prop: string) => {
          const value = item[prop.trim()]
          return value !== undefined ? String(value) : ''
        })
        return itemContent
      }).join('')
    })

    return processed.trim()
  }

  /**
   * Get nested object value by dot notation path
   */
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null
    }, obj)
  }

  /**
   * Clear template cache (useful for development)
   */
  static clearCache(): void {
    this.templateCache.clear()
  }
}