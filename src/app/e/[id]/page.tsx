'use client'

import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import { use } from 'react'
import { RSVPDialog } from '@/components/events/RSVPDialog'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/hooks/useUser'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

const getCoverImageUrl = (imagePath: string) => {
  if (!imagePath) return null
  // If it's already a full URL (e.g. from a blob or external source), return as is
  if (imagePath.startsWith('http') || imagePath.startsWith('blob:')) {
    return imagePath
  }
  // If it's a storage path, get the public URL
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

interface RSVPData {
  first_name: string
  last_name: string
  status: 'going' | 'interested' | 'not_going'
  hide_from_guest_list?: boolean
}

const formatName = (firstName: string, lastName: string) => {
  return `${firstName} ${lastName}`
}

interface PublicEventDetailsProps {
  params: Promise<{
    id: string
  }>
}

interface EventData {
  id: string
  title: string
  description: string
  date: string
  startTime: string
  endTime: string
  location: string
  coverImage: string
  user_id: string
}

const formatDateTime = (date: string, startTime: string, endTime: string) => {
  const eventDate = parseISO(date)
  const dayAndDate = format(eventDate, 'EEEE, MMMM d, yyyy')
  
  // Convert 24h times to 12h format
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hour12 = hours % 12 || 12
    return `${hour12}${minutes ? `:${minutes}` : ''} ${period}`
  }

  const formattedStartTime = formatTime(startTime)
  const formattedEndTime = formatTime(endTime)
  
  // Get timezone
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timeZoneAbbr = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
    timeZone
  }).formatToParts().find(part => part.type === 'timeZoneName')?.value || ''

  return `${dayAndDate} · ${formattedStartTime} - ${formattedEndTime} ${timeZoneAbbr}`
}

const hasRSVPed = (eventId: string) => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(`rsvp_${eventId}`) === 'true'
}

interface StoredRSVP {
  firstName: string
  lastName: string
  status: 'going' | 'interested' | 'not_going'
  hideFromGuestList: boolean
  rsvpId: string
}

const getStoredRSVP = (eventId: string): StoredRSVP | null => {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(`rsvp_${eventId}`)
  return stored ? JSON.parse(stored) : null
}

const getAnonymousCount = (attendees: RSVPData[]) => {
  return attendees.filter(rsvp => 
    rsvp.status === 'going' && rsvp.hide_from_guest_list
  ).length
}

const getMapUrl = (address: string) => {
  // Check if user is on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Encode the address for use in URL
  const encodedAddress = encodeURIComponent(address);
  
  // Return Apple Maps link for iOS devices, Google Maps for others
  if (isIOS) {
    return `maps://maps.apple.com/?q=${encodedAddress}`;
  } else {
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }
};

export default function PublicEventDetails({ params }: PublicEventDetailsProps) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')
  const { user } = useUser()
  
  const [isLoading, setIsLoading] = useState(true)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRSVPDialogOpen, setIsRSVPDialogOpen] = useState(false)
  const [selectedRSVPStatus, setSelectedRSVPStatus] = useState<'going' | 'interested' | 'not_going' | null>(null)
  const [attendees, setAttendees] = useState<RSVPData[]>([])
  const mapContainer = useRef<HTMLDivElement>(null)
  const [hasSubmittedRSVP, setHasSubmittedRSVP] = useState(false)
  const [currentUserRSVP, setCurrentUserRSVP] = useState<StoredRSVP | null>(null)

  const getGoingCount = () => {
    return attendees.filter(rsvp => rsvp.status === 'going').length
  }

  const handleRSVP = async (data: { 
    firstName: string
    lastName: string
    status: 'going' | 'interested' | 'not_going'
    hideFromGuestList: boolean
  }) => {
    try {
      let rsvpId = currentUserRSVP?.rsvpId

      if (rsvpId) {
        // Update existing RSVP
        const { error } = await supabase
          .from('rsvps')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            status: data.status,
            hide_from_guest_list: data.hideFromGuestList
          })
          .eq('id', rsvpId)

        if (error) throw error
      } else {
        // Create new RSVP
        const { data: newRsvp, error } = await supabase
          .from('rsvps')
          .insert({
            event_id: id,
            first_name: data.firstName,
            last_name: data.lastName,
            status: data.status,
            hide_from_guest_list: data.hideFromGuestList,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error
        rsvpId = newRsvp.id
      }

      // Store RSVP in localStorage
      localStorage.setItem(`rsvp_${id}`, JSON.stringify({
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status,
        hideFromGuestList: data.hideFromGuestList,
        rsvpId: rsvpId!
      }))

      setCurrentUserRSVP({
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status,
        hideFromGuestList: data.hideFromGuestList,
        rsvpId: rsvpId!
      })

      // Refresh the attendees list
      const { data: updatedAttendees, error: attendeesError } = await supabase
        .from('rsvps')
        .select('*')
        .eq('event_id', id)

      if (attendeesError) throw attendeesError
      setAttendees(updatedAttendees)
      
      setIsRSVPDialogOpen(false)
      setHasSubmittedRSVP(true)
    } catch (error) {
      console.error('Error saving RSVP:', error)
      alert('Sorry, there was an error saving your RSVP. Please try again.')
    }
  }

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Add logging for the ID
        console.log('Fetching event with ID:', id);

        // If there's an invite code, verify it
        if (inviteCode) {
          const { data: invitation, error: inviteError } = await supabase
            .from('invitations')
            .select('*')
            .eq('event_id', id)
            .eq('invite_code', inviteCode)
            .single()

          if (inviteError || !invitation) {
            throw new Error('Invalid invitation code')
          }
        }

        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single()

        // Add logging for the raw event data
        console.log('Raw event data:', event);

        if (eventError) {
          if (eventError.code === 'PGRST116') {
            throw new Error('Event not found')
          }
          throw eventError
        }

        if (!event) {
          throw new Error('Event not found')
        }

        // Add logging for transformed event
        console.log('Transformed event:', event);

        const transformedEvent: EventData = {
          id: event.id,
          title: event.title,
          description: event.description,
          coverImage: getCoverImageUrl(event.coverimage) || '',
          date: event.date,
          startTime: event.starttime,
          endTime: event.endtime,
          location: event.location,
          user_id: event.user_id
        }

        setEventData(transformedEvent)

      } catch (error) {
        console.error('Error fetching event:', error)
        setError(error instanceof Error ? error.message : 'Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchEvent()
    }

    return () => {
    }
  }, [id, inviteCode])

  useEffect(() => {
    // Fetch existing RSVPs
    const fetchRSVPs = async () => {
      try {
        const { data: rsvps, error } = await supabase
          .from('rsvps')
          .select('*')
          .eq('event_id', id)

        if (error) throw error

        setAttendees(rsvps.map(rsvp => ({
          first_name: rsvp.first_name,
          last_name: rsvp.last_name,
          status: rsvp.status,
          hide_from_guest_list: rsvp.hide_from_guest_list
        })))
      } catch (error) {
        console.error('Error fetching RSVPs:', error)
      }
    }

    fetchRSVPs()

    // Subscribe to RSVP changes
    const rsvpSubscription = supabase
      .channel('rsvps')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${id}`
        },
        async () => {
          // Refresh RSVPs when changes occur
          await fetchRSVPs()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(rsvpSubscription)
    }
  }, [id])

  // Add this effect to check localStorage on mount
  useEffect(() => {
    if (id) {
      const storedRSVP = getStoredRSVP(id)
      setCurrentUserRSVP(storedRSVP)
      setHasSubmittedRSVP(!!storedRSVP)
    }
  }, [id])

  const handleLocationClick = (location: string) => {
    window.open(getMapUrl(location), '_blank');
  };

  if (isLoading) {
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

  if (error) {
    return (
      <div className="max-w-[1120px] mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    )
  }

  if (!eventData) {
    return null
  }

  return (
    <>
      <div className="max-w-[1120px] mx-auto py-8 px-4">
        {eventData.coverImage && (
          <div className="aspect-[2/1] w-full mb-8">
            <img 
              src={eventData.coverImage} 
              alt="Event cover" 
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}

        {user && eventData?.user_id === user.id && (
          <div className="bg-gray-50 rounded-lg p-4 mb-8 flex items-center justify-between">
            <p className="text-gray-600">
              This page will show to anyone you have invited. You can manage the event{' '}
              <Link 
                href={`/events/${eventData.id}`}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                here
              </Link>
              .
            </p>
            <Link
              href={`/events/${eventData.id}`}
              className="h-10 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
            >
              <span className="material-icons text-base leading-none">settings</span>
              Manage event
            </Link>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-8">
            <div>
              <h1 className={cn(
                inter.className,
                "text-3xl font-bold mb-2"
              )}>
                {eventData.title}
              </h1>
              <p className="text-gray-600">
                {eventData.description}
              </p>
            </div>

            <div>
              <h2 className={cn(
                inter.className,
                "text-2xl font-bold mb-4"
              )}>
                Date and time
              </h2>
              <p className="text-gray-600">
                {formatDateTime(eventData.date, eventData.startTime, eventData.endTime)}
              </p>
            </div>

            <div className="space-y-4">
              <h2 className={cn(inter.className, "text-2xl font-bold mb-4")}>Location</h2>
              <button
                onClick={() => handleLocationClick(eventData.location)}
                className="text-gray-600 hover:text-blue-500 transition-colors flex items-center gap-2"
              >
                <span className="material-icons text-base">place</span>
                <span className="underline">{eventData.location}</span>
              </button>
            </div>
          </div>

          <div>
            <div className="border rounded-lg p-6">
              <h2 className={cn(
                inter.className,
                "text-2xl font-bold mb-2"
              )}>
                {hasSubmittedRSVP ? 'Your RSVP' : 'Will you be attending?'}
              </h2>
              
              {hasSubmittedRSVP ? (
                <div className="mb-8">
                  <p className="text-gray-600 mb-4">
                    Your RSVP: {currentUserRSVP?.status === 'going' ? 'Attending' : 'Not attending'}. Click below to change your RSVP.
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedRSVPStatus(currentUserRSVP?.status === 'going' ? 'not_going' : 'going')
                        setIsRSVPDialogOpen(true)
                      }}
                      className={cn(
                        "h-10 px-4 rounded-lg transition-colors flex items-center gap-2",
                        currentUserRSVP?.status === 'going'
                          ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                          : "bg-blue-500 text-white hover:bg-blue-600"
                      )}
                    >
                      <span className="material-icons text-base leading-none">
                        {currentUserRSVP?.status === 'going' ? 'close' : 'check'}
                      </span>
                      {currentUserRSVP?.status === 'going' ? "Can't Go Anymore" : 'Attend'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Let the host know if you'll be attending.
                  </p>

                  <div className="flex gap-2 mb-8">
                    <button 
                      onClick={() => {
                        setSelectedRSVPStatus('going')
                        setIsRSVPDialogOpen(true)
                      }}
                      className="h-10 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons text-base leading-none">check</span>
                      Attend
                    </button>

                    <button 
                      onClick={() => {
                        setSelectedRSVPStatus('not_going')
                        setIsRSVPDialogOpen(true)
                      }}
                      className="h-10 px-4 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <span className="material-icons text-base leading-none">close</span>
                      Can't Go
                    </button>
                  </div>
                </>
              )}
              
              <h2 className={cn(
                inter.className,
                "text-2xl font-bold mb-2"
              )}>
                {getGoingCount() > 0 
                  ? `${getGoingCount()} ${getGoingCount() === 1 ? 'Attendee' : 'Attendees'}` 
                  : 'Attendees'
                }
              </h2>
              
              <p className="text-gray-600">
                {getGoingCount() === 0 && 'No one has indicated they will be attending yet.'}
              </p>

              {getGoingCount() > 0 && (
                <div className="space-y-2 mt-4">
                  {getAnonymousCount(attendees) > 0 && (
                    <p className="text-gray-600">
                      {getAnonymousCount(attendees)} anonymous {getAnonymousCount(attendees) === 1 ? 'guest' : 'guests'}
                    </p>
                  )}
                  {attendees
                    .filter(rsvp => rsvp.status === 'going' && !rsvp.hide_from_guest_list)
                    .map((rsvp, index) => (
                      <p key={index} className="text-gray-600">
                        {formatName(rsvp.first_name, rsvp.last_name)}
                      </p>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedRSVPStatus && (
          <RSVPDialog
            isOpen={isRSVPDialogOpen}
            onClose={() => setIsRSVPDialogOpen(false)}
            onSubmit={handleRSVP}
            status={selectedRSVPStatus}
            eventId={id}
          />
        )}
      </div>
    </>
  )
} 