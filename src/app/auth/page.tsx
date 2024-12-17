'use client'

import { Auth } from '@/components/auth/Auth'
import { useUser } from '@/lib/hooks/useUser'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthPage() {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/events')
    }
  }, [user, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return <Auth />
} 