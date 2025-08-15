/**
 * Reflection Preferences API
 * 
 * Endpoints for managing user reflection automation preferences.
 * Handles timezone validation, integration validation, and preference updates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { createUserDataService } from '../../../../lib/user-scoped-data'
import { 
  ReflectionPreferences, 
  ReflectionPreferencesUpdate,
  isValidReflectionDay,
  isValidHour,
  isValidTimezone,
  DEFAULT_REFLECTION_PREFERENCES
} from '../../../../types/reflection-preferences'

// Validation schema for preference updates
const ReflectionPreferencesUpdateSchema = z.object({
  autoGenerate: z.boolean().optional(),
  preferredDay: z.enum(['monday', 'friday', 'sunday']).optional(),
  preferredHour: z.number().int().min(0).max(23).optional(),
  timezone: z.string().optional(),
  includeIntegrations: z.array(z.string()).optional(),
  notifyOnGeneration: z.boolean().optional()
}).refine(data => {
  // Custom timezone validation
  if (data.timezone && !isValidTimezone(data.timezone)) {
    return false
  }
  return true
}, {
  message: "Invalid timezone",
  path: ["timezone"]
})

/**
 * GET /api/user/reflection-preferences
 * 
 * Retrieve user's reflection automation preferences
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const dataService = createUserDataService(userId)
    
    try {
      // Get user profile with reflection preferences
      const userProfile = await dataService.getUserProfile()
      
      if (!userProfile) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      // Get connected integrations for includeIntegrations validation
      const integrations = await dataService.getIntegrations()
      const availableIntegrations = integrations.map(integration => integration.type)

      // Extract reflection preferences from user profile with defaults
      const preferences: ReflectionPreferences = {
        autoGenerate: userProfile.reflectionAutoGenerate ?? DEFAULT_REFLECTION_PREFERENCES.autoGenerate,
        preferredDay: (userProfile.reflectionPreferredDay && isValidReflectionDay(userProfile.reflectionPreferredDay)) 
          ? userProfile.reflectionPreferredDay 
          : DEFAULT_REFLECTION_PREFERENCES.preferredDay,
        preferredHour: userProfile.reflectionPreferredHour ?? DEFAULT_REFLECTION_PREFERENCES.preferredHour,
        timezone: userProfile.reflectionTimezone ?? DEFAULT_REFLECTION_PREFERENCES.timezone,
        includeIntegrations: Array.isArray(userProfile.reflectionIncludeIntegrations) 
          ? userProfile.reflectionIncludeIntegrations as string[]
          : DEFAULT_REFLECTION_PREFERENCES.includeIntegrations,
        notifyOnGeneration: userProfile.reflectionNotifyOnGeneration ?? DEFAULT_REFLECTION_PREFERENCES.notifyOnGeneration
      }

      // Validate that includeIntegrations only contains available integrations
      preferences.includeIntegrations = preferences.includeIntegrations.filter(
        integration => availableIntegrations.includes(integration)
      )

      return NextResponse.json({
        success: true,
        preferences,
        availableIntegrations
      })

    } finally {
      await dataService.disconnect()
    }

  } catch (error) {
    console.error('Failed to get reflection preferences:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/reflection-preferences
 * 
 * Update user's reflection automation preferences
 */
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Invalid JSON in request body' }, { status: 400 })
    }

    const validationResult = ReflectionPreferencesUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const updates = validationResult.data

    const dataService = createUserDataService(userId)
    
    try {
      // Validate includeIntegrations against user's connected integrations
      if (updates.includeIntegrations) {
        const integrations = await dataService.getIntegrations()
        const availableIntegrations = integrations.map(integration => integration.type)
        
        const invalidIntegrations = updates.includeIntegrations.filter(
          integration => !availableIntegrations.includes(integration)
        )
        
        if (invalidIntegrations.length > 0) {
          return NextResponse.json(
            { 
              success: false,
              error: 'Invalid integrations specified',
              details: `The following integrations are not connected: ${invalidIntegrations.join(', ')}`
            },
            { status: 400 }
          )
        }
      }

      // Prepare update data for database
      const updateData: Record<string, any> = {}
      
      if (updates.autoGenerate !== undefined) {
        updateData.reflectionAutoGenerate = updates.autoGenerate
      }
      
      if (updates.preferredDay !== undefined) {
        updateData.reflectionPreferredDay = updates.preferredDay
      }
      
      if (updates.preferredHour !== undefined) {
        updateData.reflectionPreferredHour = updates.preferredHour
      }
      
      if (updates.timezone !== undefined) {
        updateData.reflectionTimezone = updates.timezone
      }
      
      if (updates.includeIntegrations !== undefined) {
        updateData.reflectionIncludeIntegrations = updates.includeIntegrations
      }
      
      if (updates.notifyOnGeneration !== undefined) {
        updateData.reflectionNotifyOnGeneration = updates.notifyOnGeneration
      }

      // Update user profile
      const updatedProfile = await dataService.updateUserProfile(updateData)

      // Return updated preferences
      const preferences: ReflectionPreferences = {
        autoGenerate: updatedProfile.reflectionAutoGenerate,
        preferredDay: isValidReflectionDay(updatedProfile.reflectionPreferredDay) 
          ? updatedProfile.reflectionPreferredDay 
          : 'friday',
        preferredHour: updatedProfile.reflectionPreferredHour,
        timezone: updatedProfile.reflectionTimezone,
        includeIntegrations: updatedProfile.reflectionIncludeIntegrations as string[],
        notifyOnGeneration: updatedProfile.reflectionNotifyOnGeneration
      }

      return NextResponse.json({
        success: true,
        preferences
      })

    } finally {
      await dataService.disconnect()
    }

  } catch (error) {
    console.error('Failed to update reflection preferences:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update preferences',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}