'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import { format, parseISO } from 'date-fns'
import { useUser } from '@/lib/hooks/useUser'
import { Auth } from '@/components/auth/Auth'
import { useRouter } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

interface Event {
  id: string
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  location: string
  coverImage: string
}

export default function EventsPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const getCoverImageUrl = (imagePath: string) => {
    if (!imagePath) return null
    if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) {
      return imagePath
    }
    try {
      const { data: { publicUrl } } = supabase
        .storage
        .from('event-covers')
        .getPublicUrl(imagePath)
      return publicUrl
    } catch (error) {
      console.error('Error getting cover image URL:', error)
      return null
    }
  }

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data: events, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true })

        if (error) throw error

        // Transform the events data
        const transformedEvents = events?.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          coverImage: getCoverImageUrl(event.coverimage) || '',
          date: event.date,
          startTime: event.starttime,
          endTime: event.endtime,
          location: event.location
        })) || []

        setEvents(transformedEvents)
      } catch (error) {
        console.error('Error loading events:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  const formatEventDateTime = (date: string, startTime: string) => {
    try {
      // Ensure we have valid inputs
      if (!date || !startTime) {
        return 'Date and time not set'
      }

      // Validate date format
      const eventDate = parseISO(date)
      if (isNaN(eventDate.getTime())) {
        return 'Invalid date'
      }

      // Ensure startTime is in HH:mm format
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(startTime)) {
        return 'Invalid time format'
      }

      // Format the date
      const formattedDate = format(eventDate, 'MMM d, yyyy')
      
      // Create a full datetime string and parse it
      const dateTimeString = `${date}T${startTime}`
      const dateTime = parseISO(dateTimeString)
      
      // Format the time
      const formattedTime = format(dateTime, 'h:mm a')

      return `${formattedDate} at ${formattedTime}`
    } catch (error) {
      console.error('Date formatting error:', {
        date,
        startTime,
        error
      })
      return 'Invalid date/time'
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1120px] mx-auto py-8 px-4 flex items-center justify-center min-h-[50vh]">
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

  if (!user) {
    return null // The useEffect will handle the redirect
  }

  return (
    <div className="max-w-[1120px] mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className={cn(
            inter.className,
            "text-3xl font-bold"
          )}>
            Upcoming Events
          </h1>
        </div>
        <Link
          href="/events/new"
          className="bg-[#1c1c1c] text-white px-4 py-2 rounded-lg hover:bg-black transition-colors flex items-center gap-2"
        >
          <span className="material-icons text-[20px]">add</span>
          Create Event
        </Link>
      </div>

      <div className="space-y-4">
        {events.map((event) => (
          <div 
            key={event.id}
            className="group relative grid grid-cols-[240px_1fr] gap-6 bg-white hover:bg-[#F0F0F0] rounded-lg border transition-colors h-[180px] overflow-hidden"
          >
            <Link
              href={`/events/${event.id}`}
              className="absolute inset-0 z-10 cursor-pointer"
              aria-label={`View details for ${event.title}`}
            />
            
            <div className="relative h-full w-[240px]">
              {event.coverImage ? (
                <img 
                  src={event.coverImage} 
                  alt={event.title}
                  className="w-full h-full object-cover rounded-l-lg"
                  style={{ maxHeight: '180px' }}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-l-lg" />
              )}
            </div>
            
            <div className="relative py-4 pr-4">
              <div className="text-gray-600 text-sm mb-1">
                {formatEventDateTime(event.date, event.startTime)}
              </div>
              
              <h2 className={cn(
                inter.className,
                "text-xl font-semibold mb-1"
              )}>
                {event.title}
              </h2>
              
              <div className="text-gray-600 mb-2">
                {event.location}
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {event.description}
              </p>

              <div className="text-sm text-gray-600">
                0 people are going
              </div>
            </div>
          </div>
        ))}

        {events.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">You haven't created any events yet.</p>
            <Link
              href="/events/new"
              className="text-blue-500 hover:text-blue-600 transition-colors"
            >
              Create your first event
            </Link>
          </div>
        )}
      </div>
    </div>
  )
} 