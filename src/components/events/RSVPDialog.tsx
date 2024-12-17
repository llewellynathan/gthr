'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

interface RSVPDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { 
    firstName: string
    lastName: string
    status: 'going' | 'interested' | 'not_going'
    hideFromGuestList: boolean
  }) => void
  status: 'going' | 'interested' | 'not_going'
  eventId: string
}

export function RSVPDialog({ isOpen, onClose, onSubmit, status, eventId }: RSVPDialogProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [hideFromGuestList, setHideFromGuestList] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    if (isOpen && eventId) {
      const storedRSVP = localStorage.getItem(`rsvp_${eventId}`)
      if (storedRSVP) {
        try {
          const parsedRSVP = JSON.parse(storedRSVP)
          setFirstName(parsedRSVP.firstName || '')
          setLastName(parsedRSVP.lastName || '')
          setHideFromGuestList(parsedRSVP.hideFromGuestList || false)
          setIsEditMode(true)
        } catch (error) {
          console.error('Error parsing stored RSVP:', error)
          setIsEditMode(false)
          setFirstName('')
          setLastName('')
          setHideFromGuestList(false)
        }
      } else {
        setIsEditMode(false)
        setFirstName('')
        setLastName('')
        setHideFromGuestList(false)
      }
    }
  }, [isOpen, eventId])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({ firstName, lastName, status, hideFromGuestList })
    setFirstName('')
    setLastName('')
    setHideFromGuestList(false)
  }

  const statusText = {
    going: 'Going',
    interested: 'Interested',
    not_going: "Can't Go"
  }

  const dialogTitle = isEditMode 
    ? `Change RSVP to ${statusText[status]}`
    : `RSVP as ${statusText[status]}`

  const nameFieldProps = isEditMode ? { 
    disabled: true,
    className: "w-full p-2 border rounded-lg bg-gray-100"
  } : { 
    required: true,
    className: "w-full p-2 border rounded-lg"
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className={cn(
          inter.className,
          "text-2xl font-bold mb-4"
        )}>
          {dialogTitle}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              {...nameFieldProps}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              {...nameFieldProps}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hideFromGuestList"
              checked={hideFromGuestList}
              onChange={(e) => setHideFromGuestList(e.target.checked)}
              className="h-4 w-4 text-blue-500 rounded border-gray-300 focus:ring-blue-500"
            />
            <label 
              htmlFor="hideFromGuestList" 
              className="text-sm text-gray-600"
            >
              Don't show my name on the public event page
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 