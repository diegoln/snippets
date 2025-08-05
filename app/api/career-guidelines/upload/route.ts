/**
 * API endpoint to upload and parse career ladder documents
 * POST /api/career-guidelines/upload
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '../../../../lib/auth-utils'
import { getDevUserIdFromRequest } from '../../../../lib/dev-auth'
import { llmProxy } from '../../../../lib/llmproxy'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    let userId = await getUserIdFromRequest(request)
    if (!userId && process.env.NODE_ENV === 'development') {
      userId = await getDevUserIdFromRequest(request)
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const role = formData.get('role') as string
    const level = formData.get('level') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!role || !level) {
      return NextResponse.json({ error: 'Role and level are required' }, { status: 400 })
    }

    // Read file content
    const fileContent = await file.text()
    
    if (!fileContent.trim()) {
      return NextResponse.json({ error: 'File appears to be empty' }, { status: 400 })
    }

    // Store the document content in the user's record
    await prisma.user.update({
      where: { id: userId },
      data: { 
        companyCareerLadder: fileContent,
        careerPlanLastUpdated: new Date()
      }
    })

    console.log(`📄 Processing career ladder document for ${role} ${level}`)

    // Use LLM to extract role and level specific information
    const extractionPrompt = `You are analyzing a company's career ladder document to extract specific information for a ${level} ${role}. 

Please extract and format the following information from this career ladder document:

1. Current Level Guidelines: What are the expectations, responsibilities, and success criteria for a ${level} ${role} at this company?
2. Next Level Guidelines: What are the expectations and requirements to be promoted from ${level} to the next level?

Format your response as a JSON object with exactly these fields:
{
  "currentLevelPlan": "Detailed expectations for current ${level} ${role} level",
  "nextLevelExpectations": "Requirements and expectations for promotion to next level",
  "found": true/false
}

If you cannot find specific information for this role and level combination, set "found" to false and provide general guidance based on the document structure.

Career Ladder Document:
${fileContent}`

    const extractionResponse = await llmProxy.request({
      prompt: extractionPrompt,
      temperature: 0.3,
      maxTokens: 2000,
      context: { 
        role, 
        level,
        operationType: 'career_ladder_extraction',
        userId
      }
    })

    // Parse the LLM response
    let parsedResponse
    try {
      // Try to extract JSON from the response
      const jsonMatch = extractionResponse.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError)
      return NextResponse.json({
        error: 'Failed to parse career ladder document',
        details: 'The document structure could not be analyzed'
      }, { status: 422 })
    }

    if (!parsedResponse.found) {
      return NextResponse.json({
        error: 'Role and level not found in document',
        message: `Could not find specific information for ${level} ${role} in the uploaded career ladder.`,
        suggestions: [
          'Check if the role title matches what\'s in your document',
          'Verify the seniority level terminology used in your company',
          'Try uploading a more comprehensive career ladder document'
        ]
      }, { status: 404 })
    }

    console.log(`✅ Successfully extracted career guidelines for ${level} ${role}`)

    return NextResponse.json({
      currentLevelPlan: parsedResponse.currentLevelPlan || '',
      nextLevelExpectations: parsedResponse.nextLevelExpectations || '',
      extractedFrom: 'company_document',
      fileName: file.name,
      fileSize: file.size
    })

  } catch (error) {
    console.error('Error processing career ladder upload:', error)
    return NextResponse.json(
      { error: 'Failed to process career ladder document' },
      { status: 500 }
    )
  }
}