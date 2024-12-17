'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/hooks/useUser'
import { Toast } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'] })

interface InviteDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
}

export function InviteDialog({ isOpen, onClose, eventId, eventTitle }: InviteDialogProps) {
  const { user } = useUser()
  const [emails, setEmails] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('Please sign in to send invitations')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      // Get current session to ensure we're authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error('Please sign in to send invitations')
      }

      // Split and clean email addresses
      const emailList = emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = emailList.filter(email => !emailRegex.test(email))
      if (invalidEmails.length > 0) {
        throw new Error(`Invalid email format: ${invalidEmails.join(', ')}`)
      }

      // Create invitation records
      const invitations = emailList.map(email => ({
        event_id: eventId,
        email,
        invite_code: crypto.randomUUID(),
      }))

      console.log('Creating invitations:', invitations)
      const { data: insertedData, error: dbError } = await supabase
        .from('invitations')
        .insert(invitations)
        .select()

      if (dbError) {
        console.error('Supabase error details:', {
          code: dbError.code,
          message: dbError.message,
          details: dbError.details
        })
        throw new Error(`Database error: ${dbError.message}`)
      }

      console.log('Inserted invitations:', insertedData)

      console.log('Sending email invitations...')
      const response = await fetch('/api/send-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          eventId,
          eventTitle,
          invitations: insertedData,
          userId: user.id
        }),
      })

      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitations')
      }

      setShowSuccessToast(true)
      setEmails('')
      onClose()

    } catch (error) {
      console.error('Detailed error:', error)
      setError(error instanceof Error ? error.message : 'An unexpected error occurred')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className={cn(
              inter.className,
              "text-2xl font-bold mb-4"
            )}>
              Invite guests
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email addresses
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  Enter email addresses separated by commas
                </p>
                <textarea
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  className="w-full p-2 border rounded-lg min-h-[100px]"
                  placeholder="john@example.com, jane@example.com"
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isSending ? 'Sending...' : 'Send invitations'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <Toast
          message="Invitations sent successfully!"
          type="success"
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </>
  )
} 