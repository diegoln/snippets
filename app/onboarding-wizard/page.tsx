'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { OnboardingWizard } from '../../components/OnboardingWizard'
import { LoadingSpinner } from '../../components/LoadingSpinner'

export default function OnboardingWizardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // Redirect to signin if not authenticated
    if (status === 'loading') return
    
    if (!session) {
      router.push('/')
      return
    }
    
    // Check if user has already completed onboarding
    // This would normally check a database flag
    // For now, we'll assume they haven't if they're on this page
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <OnboardingWizard />
}