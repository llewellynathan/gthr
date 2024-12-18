'use client'

import { useState, useEffect } from "react"
import { EventOverview } from "@/components/events/sections/EventOverview"
import { CoverImage } from "@/components/events/sections/CoverImage"
import { DateTime } from "@/components/events/sections/DateTime"
import { Publish } from "@/components/events/sections/Publish"
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '../../lib/hooks/useUser'

type Section = "overview" | "cover" | "datetime" | "publish"

interface EventFormProps {
  initialData?: {
    id: string
    title: string
    description: string
    coverImage: string
    date: string
    startTime: string
    endTime: string
    location: string
    coordinates: { lat: number; lng: number } | null
  }
  mode?: 'create' | 'edit'
}

// Add this interface for the database payload
interface EventPayload {
  title: string
  description: string
  coverimage: string | null
  date: string
  starttime: string
  endtime: string
  location: string
  user_id: string
  coordinates: { type: string; coordinates: number[] } | null
  created_at?: string
  updated_at?: string
}

interface UpdatePayload {
  title: string
  description: string
  coverimage: string | null
  date: string
  starttime: string
  endtime: string
  location: string
  updated_at: string
  coordinates?: { type: string; coordinates: number[] } | null
  user_id?: string
}

// Add this helper function at the top of the file
const getCoverImageUrl = (imagePath: string) => {
  if (!imagePath) return ''
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
    return ''
  }
}

export function EventForm({ initialData, mode = 'create' }: EventFormProps) {
  const router = useRouter()
  const { user } = useUser()
  const [currentSection, setCurrentSection] = useState<Section>("overview")
  const [completedSections, setCompletedSections] = useState<Section[]>([])
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    coverImage: initialData?.coverImage || "",
    coverImageUrl: "",
    date: initialData?.date || "",
    startTime: initialData?.startTime || "",
    endTime: initialData?.endTime || "",
    location: initialData?.location || "",
    coordinates: initialData?.coordinates || null,
  })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    const checkSupabase = async () => {
      try {
        // Test connection
        const { data: connectionTest, error: connectionError } = await supabase
          .from('events')
          .select('id')
          .limit(1)

        console.log('Supabase connection test:', {
          success: !connectionError,
          error: connectionError,
          data: connectionTest
        })

        // Test user authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        console.log('Supabase auth test:', {
          success: !!user,
          error: authError,
          user: user
        })

      } catch (error) {
        console.error('Supabase check failed:', error)
      }
    }

    checkSupabase()
  }, [])

  useEffect(() => {
    // Verify Supabase connection
    const checkConnection = async () => {
      try {
        const { data, error } = await supabase.from('events').select('id').limit(1)
        if (error) {
          console.error('Supabase connection error:', error)
        } else {
          console.log('Supabase connection successful')
        }
      } catch (error) {
        console.error('Failed to check Supabase connection:', error)
      }
    }
    
    checkConnection()
  }, [])

  useEffect(() => {
    // When in edit mode, mark all sections as completed initially
    if (mode === 'edit' && initialData) {
      setCompletedSections(["overview", "cover", "datetime"])
    }
  }, [mode, initialData])

  // Add this effect to update the cover image URL when formData changes
  useEffect(() => {
    if (formData.coverImage && !formData.coverImage.startsWith('blob:')) {
      const publicUrl = getCoverImageUrl(formData.coverImage)
      setFormData(prev => ({
        ...prev,
        coverImageUrl: publicUrl // Add this new field to store the public URL
      }))
    }
  }, [formData.coverImage])

  const isCompleted = (section: Section) => completedSections.includes(section)
  const isLocked = (section: Section) => {
    // In edit mode, publish section is never locked
    if (mode === 'edit' && section === 'publish') {
      return false
    }

    // For create mode, keep the existing logic
    const order: Section[] = ["overview", "cover", "datetime", "publish"]
    const currentIndex = order.indexOf(currentSection)
    const sectionIndex = order.indexOf(section)
    return sectionIndex > currentIndex && !isCompleted(section)
  }

  const handleSectionComplete = async (section: Section, data: any) => {
    try {
      // Update form data first
      setFormData(prev => ({
        ...prev,
        ...data
      }))
      setHasUnsavedChanges(true)
      
      if (section === "publish") {
        // Get current user
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !currentUser) {
          throw new Error(authError?.message || 'User not authenticated')
        }

        // Prepare event payload
        const eventPayload = {
          title: formData.title,
          description: formData.description,
          date: formData.date,
          starttime: formData.startTime,
          endtime: formData.endTime,
          location: formData.location,
          coordinates: formData.coordinates,
          coverimage: formData.coverImage,
          user_id: currentUser.id,
        }

        if (mode === 'edit' && initialData?.id) {
          // Update existing event
          const { error: updateError } = await supabase
            .from('events')
            .update(eventPayload)
            .eq('id', initialData.id)

          if (updateError) {
            throw new Error(`Failed to update event: ${updateError.message}`)
          }

          // Redirect to event page
          router.push(`/e/${initialData.id}`)
        } else {
          // Create new event
          const { data: newEvent, error: insertError } = await supabase
            .from('events')
            .insert([eventPayload])
            .select()
            .single()

          if (insertError || !newEvent) {
            throw new Error(`Failed to create event: ${insertError?.message}`)
          }

          // Redirect to event page
          router.push(`/e/${newEvent.id}`)
        }
        return
      }

      // If we're in edit mode and a section was being edited, just mark it as no longer being edited
      if (mode === 'edit' && editingSection) {
        setEditingSection(null)
        return
      }

      // For create mode, continue with normal section progression
      const order: Section[] = ["overview", "cover", "datetime", "publish"]
      const nextSection = order[order.indexOf(section) + 1]

      if (nextSection) {
        setCurrentSection(nextSection)
        if (!completedSections.includes(section)) {
          setCompletedSections(prev => [...prev, section])
        }
        scrollToSection(nextSection)
      }
    } catch (error) {
      console.error('Error completing section:', error)
      throw error // Re-throw the error so it can be handled by the Publish component
    }
  }

  const handleEdit = (section: Section) => {
    setEditingSection(section)
  }

  // Add this helper function to handle scrolling
  const scrollToSection = (section: Section) => {
    setTimeout(() => {
      const sectionElement = document.querySelector(`[data-section="${section}"]`)
      if (sectionElement) {
        const offset = 32 // Add some padding at the top
        const elementPosition = sectionElement.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        })
      }
    }, 100)
  }

  return (
    <div className="space-y-6">
      <div data-section="overview">
        <EventOverview
          isActive={currentSection === "overview"}
          isLocked={isLocked("overview")}
          isCompleted={isCompleted("overview")}
          onComplete={(data) => handleSectionComplete("overview", data)}
          defaultValues={formData}
          onClick={() => handleEdit("overview")}
          isEditing={editingSection === "overview"}
          onEdit={() => handleEdit("overview")}
          mode={mode}
        />
      </div>
      
      <div data-section="cover">
        <CoverImage
          isActive={currentSection === "cover"}
          isLocked={isLocked("cover")}
          isCompleted={isCompleted("cover")}
          onComplete={(data) => handleSectionComplete("cover", data)}
          defaultValues={{ coverImage: formData.coverImage }}
          onClick={() => handleEdit("cover")}
          isEditing={editingSection === "cover"}
          onEdit={() => handleEdit("cover")}
          mode={mode}
        />
      </div>

      <div data-section="datetime">
        <DateTime
          isActive={currentSection === "datetime"}
          isLocked={isLocked("datetime")}
          isCompleted={isCompleted("datetime")}
          onComplete={(data) => handleSectionComplete("datetime", data)}
          defaultValues={{
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            location: formData.location,
          }}
          onClick={() => handleEdit("datetime")}
          isEditing={editingSection === "datetime"}
          onEdit={() => handleEdit("datetime")}
          mode={mode}
        />
      </div>

      <div data-section="publish">
        <Publish
          isActive={currentSection === "publish"}
          isLocked={isLocked("publish")}
          isCompleted={isCompleted("publish")}
          onComplete={(data) => handleSectionComplete("publish", data)}
          previewData={{
            ...formData,
            coverImage: formData.coverImageUrl || formData.coverImage
          }}
          onClick={() => handleEdit("publish")}
          isEditing={editingSection === "publish"}
          onEdit={() => handleEdit("publish")}
          mode={mode}
        />
      </div>
    </div>
  )
} 