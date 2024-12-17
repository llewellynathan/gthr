'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Inter } from 'next/font/google'
import { useState } from 'react'

const inter = Inter({ subsets: ['latin'] })

const schema = z.object({
  // We don't need any validation since this is just a preview/publish section
})

type FormData = z.infer<typeof schema>

interface PublishProps {
  isActive: boolean
  isLocked: boolean
  isCompleted: boolean
  onComplete: (data: FormData) => void
  defaultValues?: Partial<FormData>
  previewData: {
    title: string
    description: string
    coverImage: string
    date: string
    startTime: string
    endTime: string
    location: string
  }
  onClick: () => void
  isEditing?: boolean
  onEdit: () => void
}

export function Publish({
  isActive,
  isLocked,
  isCompleted,
  onComplete,
  previewData,
  onClick,
  isEditing,
  onEdit
}: PublishProps) {
  const { handleSubmit } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async (data: FormData) => {
    setIsPublishing(true)
    setError(null)
    try {
      await onComplete(data)
    } catch (error) {
      console.error('Failed to publish:', error)
      setError(error instanceof Error ? error.message : 'Failed to publish event')
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <section className={cn(
      "rounded-lg border p-6",
      isLocked && "opacity-50 pointer-events-none",
      isCompleted && !isActive && "hover:border-blue-200 cursor-pointer",
      isCompleted && "border-green-500",
      (isActive || isEditing) && "border-blue-500 shadow-sm"
    )}>
      <div className="mb-10 flex items-center justify-between">
        <h2 className={cn(
          inter.className,
          "text-[32px] font-bold leading-[40px] text-[#090909]"
        )}>
          Publish and share
        </h2>
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center",
          isCompleted ? "border-green-500 bg-green-500" : "border-gray-300",
          isActive && !isCompleted && "border-blue-500"
        )}>
          {isCompleted && (
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(handlePublish)} className="space-y-10">
        <div>
          <h3 className={cn(
            inter.className,
            "text-[20px] font-medium leading-[24px] text-[#090909] mb-4"
          )}>
            Event preview
          </h3>
          <p className={cn(
            inter.className,
            "text-[16px] font-medium leading-[24px] text-[#767676] mb-4"
          )}>
            Before publishing, please preview your event. Don't worry, you can always edit your event details after publishing if needed.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <div>
              {previewData.coverImage && (
                <div className="mb-4">
                  <img
                    src={previewData.coverImage}
                    alt="Event cover"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <h3 className="font-semibold">{previewData.title}</h3>
              <p className="text-sm text-gray-600">{previewData.description}</p>
            </div>
            
            <div className="text-sm">
              <div className="flex gap-2 text-gray-600">
                <span>📅</span>
                <span>
                  {previewData.date} at {previewData.startTime} - {previewData.endTime}
                </span>
              </div>
              <div className="flex gap-2 text-gray-600">
                <span>📍</span>
                <span>{previewData.location}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className={cn(
            inter.className,
            "text-[20px] font-medium leading-[24px] text-[#090909] mb-4"
          )}>
            Share
          </h3>
          <p className={cn(
            inter.className,
            "text-[16px] font-medium leading-[24px] text-[#767676] mb-4"
          )}>
            More share options are coming soon!
          </p>
          <button
            type="button"
            className="mt-2 text-sm text-gray-500 border rounded-lg px-4 py-2"
            disabled
          >
            Copy event link (Coming soon)
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm mt-2">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  />
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Publishing...
              </>
            ) : (
              'Publish event'
            )}
          </button>
        </div>
      </form>
    </section>
  )
} 