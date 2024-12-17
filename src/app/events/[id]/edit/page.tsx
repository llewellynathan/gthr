'use client'

import { useEffect, useState } from 'react'
import { EventForm } from "@/components/events/EventForm"
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { use } from 'react'

interface EditEventPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const { id } = use(params)
  const [isLoading, setIsLoading] = useState(true)
  const [eventData, setEventData] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data: event, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          console.error('Error loading event:', error)
          return
        }

        // Transform database column names to match frontend model
        setEventData({
          id: event.id,
          title: event.title,
          description: event.description,
          coverImage: event.coverimage,
          date: event.date,
          startTime: event.starttime,
          endTime: event.endtime,
          location: event.location,
          coordinates: event.coordinates ? {
            lat: event.coordinates.coordinates[1],
            lng: event.coordinates.coordinates[0]
          } : null
        })
      } catch (error) {
        console.error('Failed to load event:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      loadEvent()
    }
  }, [id])

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading event...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <EventForm initialData={eventData} mode="edit" />
    </div>
  )
} 