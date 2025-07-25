// Health check endpoint for Cloud Run
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check - can be extended to check database connectivity
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' },
      { status: 500 }
    )
  }
}