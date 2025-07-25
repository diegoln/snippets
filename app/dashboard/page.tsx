'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { AuthenticatedApp } from '../AuthenticatedApp'

export default function DashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // In development, check localStorage for the user session
    if (process.env.NODE_ENV === 'development') {
      try {
        const sessionData = localStorage.getItem('dev-session')
        if (sessionData) {
          setCurrentUser(JSON.parse(sessionData))
        } else {
          router.push('/mock-signin')
        }
      } catch (error) {
        router.push('/mock-signin')
      }
      setLoading(false)
    } else {
      // Production auth logic would go here
      setLoading(false)
    }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!currentUser && process.env.NODE_ENV === 'development') {
    return null // Will redirect to mock-signin
  }

  return <AuthenticatedApp />
}