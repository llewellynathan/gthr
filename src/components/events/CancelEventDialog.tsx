'use client'

import { cn } from '@/lib/utils'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

interface CancelEventDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  eventTitle: string
  isLoading: boolean
}

export function CancelEventDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  eventTitle,
  isLoading 
}: CancelEventDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className={cn(
          inter.className,
          "text-2xl font-bold mb-4"
        )}>
          Cancel event
        </h2>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to cancel "{eventTitle}"? This action cannot be undone, and all RSVPs will be deleted.
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isLoading}
          >
            Keep event
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Canceling...
              </>
            ) : (
              'Cancel event'
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 