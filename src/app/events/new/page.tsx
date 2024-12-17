'use client'

import { useUser } from '@/lib/hooks/useUser'
import { EventForm } from "@/components/events/EventForm"
import { Auth } from '@/components/auth/Auth'

export default function NewEventPage() {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <EventForm mode="create" />
    </div>
  )
} 