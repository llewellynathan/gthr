'use client'

import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import { use } from 'react'
import { RSVPDialog } from '@/components/events/RSVPDialog'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useUser } from '@/lib/hooks/useUser'
import { Auth } from '@/components/auth/Auth'
import { useRouter } from 'next/navigation'
import { CancelEventDialog } from '@/components/events/CancelEventDialog'
import { InviteDialog } from '@/components/events/InviteDialog'

const inter = Inter({ subsets: ['latin'] })

interface EventDetailsProps {
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

interface RSVPData {
  firstName: string
  lastName: string
  status: 'going' | 'interested' | 'not_going'
  hide_from_guest_list?: boolean
}

// Add this helper function to format names
const formatName = (firstName: string, lastName: string) => {
  return `${firstName} ${lastName}`
}

// Add this helper function
const getAttendeesList = (attendees: RSVPData[], isCreator: boolean) => {
  return attendees
    .filter(rsvp => {
      // If user is the creator, show all attendees who are going
      // Otherwise, only show attendees who haven't hidden themselves
      return rsvp.status === 'going' && (isCreator || !rsvp.hide_from_guest_list)
    })
    .map((rsvp, index) => (
      <div key={index} className="flex items-center gap-2">
        <p className="text-gray-600">
          {formatName(rsvp.first_name, rsvp.last_name)}
        </p>
        {isCreator && rsvp.hide_from_guest_list && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Hidden from public
          </span>
        )}
      </div>
    ))
}

// Add this helper function at the top with other helper functions
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

export default function EventDetails({ params }: EventDetailsProps) {
  const { id } = use(params)
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  
  const [isLoading, setIsLoading] = useState(true)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRSVPDialogOpen, setIsRSVPDialogOpen] = useState(false)
  const [selectedRSVPStatus, setSelectedRSVPStatus] = useState<'going' | 'interested' | 'not_going' | null>(null)
  const [attendees, setAttendees] = useState<RSVPData[]>([])
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isCreator, setIsCreator] = useState(false)

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

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setIsLoading(true)
        const { data: event, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          throw error
        }

        if (!event) {
          throw new Error('Event not found')
        }

        // Transform database column names to match frontend model
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
        setIsCreator(user?.id === event.user_id)
      } catch (error) {
        console.error('Error fetching event:', error)
        setError(error instanceof Error ? error.message : 'Failed to load event')
      } finally {
        setIsLoading(false)
      }
    }

    if (id && user) {
      fetchEvent()
    }
  }, [id, user])

  useEffect(() => {
    const loadEventAndRSVPs = async () => {
      try {
        // Load RSVPs from Supabase
        const { data: rsvps, error } = await supabase
          .from('rsvps')
          .select('*')
          .eq('event_id', id)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error loading RSVPs:', error)
        } else {
          setAttendees(rsvps)
        }
      } catch (error) {
        console.error('Failed to load event:', error)
      }
    }

    if (id) {
      loadEventAndRSVPs()
    }

    // Set up real-time subscription
    const rsvpSubscription = supabase
      .channel('rsvps')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'rsvps',
          filter: `event_id=eq.${id}`
        }, 
        (payload) => {
          // Update attendees list when changes occur
          setAttendees(current => {
            switch (payload.eventType) {
              case 'INSERT':
                return [...current, payload.new]
              case 'DELETE':
                return current.filter(rsvp => rsvp.id !== payload.old.id)
              case 'UPDATE':
                return current.map(rsvp => 
                  rsvp.id === payload.new.id ? payload.new : rsvp
                )
              default:
                return current
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(rsvpSubscription)
    }
  }, [id])

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

  const handleRSVP = async (data: RSVPData & { hideFromGuestList: boolean }) => {
    try {
      const { error } = await supabase
        .from('rsvps')
        .insert([
          {
            event_id: id,
            first_name: data.firstName,
            last_name: data.lastName,
            status: data.status,
            hide_from_guest_list: data.hideFromGuestList,
            created_at: new Date().toISOString()
          }
        ])

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setAttendees(current => [...current, {
        id: Date.now().toString(),
        event_id: id,
        first_name: data.firstName,
        last_name: data.lastName,
        status: data.status,
        hide_from_guest_list: data.hideFromGuestList,
        created_at: new Date().toISOString()
      }])

      setIsRSVPDialogOpen(false)
    } catch (error) {
      console.error('Error saving RSVP:', error)
      alert('Sorry, there was an error saving your RSVP. Please try again.')
    }
  }

  const getGoingCount = () => {
    return attendees.filter(rsvp => rsvp.status === 'going').length
  }

  const handleCancelEvent = async () => {
    if (!eventData) return
    
    setIsCanceling(true)
    try {
      // Delete RSVPs first
      const { error: rsvpError } = await supabase
        .from('rsvps')
        .delete()
        .eq('event_id', eventData.id)

      if (rsvpError) throw rsvpError

      // Then delete the event
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventData.id)

      if (eventError) throw eventError

      // Redirect to events page
      router.push('/events')
      router.refresh()
    } catch (error) {
      console.error('Error canceling event:', error)
      alert('Failed to cancel event. Please try again.')
    } finally {
      setIsCanceling(false)
      setIsCancelDialogOpen(false)
    }
  }

  // Add this handler function
  const handleLocationClick = (location: string) => {
    window.open(getMapUrl(location), '_blank');
  };

  if (userLoading || isLoading) {
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
    return <Auth />
  }

  if (eventData && eventData.user_id !== user.id) {
    return (
      <div className="max-w-[1120px] mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to view this event.</p>
          <Link
            href="/events"
            className="text-blue-500 hover:text-blue-600 transition-colors"
          >
            Back to events
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!eventData) {
    return (
      <div className="max-w-[1120px] mx-auto py-8 px-4">
        <p className="text-center text-gray-600">Event not found</p>
      </div>
    )
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
                "text-xl font-semibold mb-2"
              )}>
                Date and time
              </h2>
              <p className="text-gray-600">
                {formatDateTime(eventData.date, eventData.startTime, eventData.endTime)}
              </p>
            </div>

            <div>
              <h2 className={cn(
                inter.className,
                "text-xl font-semibold mb-2"
              )}>
                Location
              </h2>
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
            <div className="border rounded-lg p-6 sticky top-8">
              <h2 className={cn(
                inter.className,
                "text-2xl font-bold mb-4"
              )}>
                Manage event
              </h2>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="h-10 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <span className="material-icons text-base leading-none">send</span>
                  Send invitations
                </button>

                <Link
                  href={`/e/${eventData.id}`}
                  className="h-10 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="material-icons text-base leading-none">visibility</span>
                  View guest page
                </Link>

                <Link
                  href={`/events/${eventData.id}/edit`}
                  className="h-10 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <span className="material-icons text-base leading-none">edit</span>
                  Edit event
                </Link>

                <button 
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="h-10 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <span className="material-icons text-base leading-none">close</span>
                  Cancel event
                </button>
              </div>

              <div className="mt-8">
                <h2 className={cn(
                  inter.className,
                  "text-2xl font-bold mb-2"
                )}>
                  {getGoingCount() > 0 
                    ? `${getGoingCount()} ${getGoingCount() === 1 ? 'Attendee' : 'Attendees'}` 
                    : 'Attendees'
                  }
                </h2>
                
                {attendees.length === 0 ? (
                  <p className="text-gray-600">No one has RSVP'd yet.</p>
                ) : (
                  <div className="space-y-2">
                    {attendees
                      .filter(rsvp => rsvp.status === 'going')
                      .map((rsvp, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <p className="text-gray-600">
                            {formatName(rsvp.first_name, rsvp.last_name)}
                          </p>
                          {rsvp.hide_from_guest_list && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Hidden from public
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                <h2 className={cn(
                  inter.className,
                  "text-2xl font-bold mb-2 mt-8"
                )}>
                  {(() => {
                    const cantAttendCount = attendees.filter(rsvp => rsvp.status === 'not_going').length;
                    if (cantAttendCount === 0) return "Can't attend";
                    return `${cantAttendCount} ${cantAttendCount === 1 ? "Can't attend" : "Can't attend"}`;
                  })()}
                </h2>
                
                {attendees.filter(rsvp => rsvp.status === 'not_going').length === 0 ? (
                  <p className="text-gray-600">No one has indicated they can't attend.</p>
                ) : (
                  <div className="space-y-2">
                    {attendees
                      .filter(rsvp => rsvp.status === 'not_going')
                      .map((rsvp, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <p className="text-gray-600">
                            {formatName(rsvp.first_name, rsvp.last_name)}
                          </p>
                          {rsvp.hide_from_guest_list && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Hidden from public
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedRSVPStatus && (
          <RSVPDialog
            isOpen={isRSVPDialogOpen}
            onClose={() => setIsRSVPDialogOpen(false)}
            onSubmit={handleRSVP}
            status={selectedRSVPStatus}
          />
        )}

        {eventData && (
          <CancelEventDialog
            isOpen={isCancelDialogOpen}
            onClose={() => setIsCancelDialogOpen(false)}
            onConfirm={handleCancelEvent}
            eventTitle={eventData.title}
            isLoading={isCanceling}
          />
        )}

        {eventData && (
          <InviteDialog
            isOpen={isInviteDialogOpen}
            onClose={() => setIsInviteDialogOpen(false)}
            eventId={eventData.id}
            eventTitle={eventData.title}
          />
        )}
      </div>
    </>
  )
} 