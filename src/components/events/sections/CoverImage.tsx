'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Inter } from 'next/font/google'
import { supabase } from "@/lib/supabase"

const inter = Inter({ subsets: ['latin'] })

const schema = z.object({
  coverImage: z.string().min(1, "Cover image is required"),
})

type FormData = z.infer<typeof schema>

interface CoverImageProps {
  isActive: boolean
  isLocked: boolean
  isCompleted: boolean
  onComplete: (data: FormData) => void
  defaultValues?: Partial<FormData>
  onClick: () => void
  isEditing?: boolean
  onEdit: () => void
}

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

export function CoverImage({
  isActive,
  isLocked,
  isCompleted,
  onComplete,
  defaultValues,
  onClick,
  isEditing,
  onEdit
}: CoverImageProps) {
  const [previewUrl, setPreviewUrl] = useState(defaultValues?.coverImage || "")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues
  })

  const isEnabled = isActive || isEditing

  console.log('CoverImage render:', {
    isActive,
    isLocked,
    isCompleted,
    isEditing,
    isEnabled
  })

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      // Create preview URL for display
      const previewUrl = URL.createObjectURL(file)
      setPreviewUrl(previewUrl)
      setUploadedFile(file)

      // Set the preview URL as the form value - actual upload will happen in EventForm
      setValue('coverImage', previewUrl)
      
      console.log('Image preview set successfully')
    } catch (error) {
      console.error('Error handling image:', error)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl('')
      setUploadedFile(null)
      setValue('coverImage', '')
      alert('Failed to handle image. Please try again.')
    }
  }

  // Cleanup preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

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
          Cover image
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

      <form onSubmit={handleSubmit(onComplete)} className="space-y-10">
        <div>
          <h3 className={cn(
            inter.className,
            "text-[20px] font-medium leading-[24px] text-[#090909] mb-4"
          )}>
            Cover image
          </h3>
          <p className={cn(
            inter.className,
            "text-[16px] font-medium leading-[24px] text-[#767676] mb-4"
          )}>
            Upload a photo to help people recognize your event.
          </p>
          <label className={cn(
            inter.className,
            "block text-[16px] font-medium leading-[24px] text-[#090909] mb-2"
          )}>
            Event photo
          </label>
          <input type="hidden" {...register("coverImage")} />
          <div className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center",
            !isEnabled && "opacity-50"
          )}>
            {previewUrl ? (
              <div className="relative aspect-video w-full">
                <img
                  src={uploadedFile ? previewUrl : getCoverImageUrl(previewUrl)}
                  alt="Cover preview"
                  className="object-cover rounded-lg w-full h-full"
                />
                {isEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      if (previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(previewUrl)
                      }
                      setPreviewUrl('')
                      setUploadedFile(null)
                      setValue('coverImage', '')
                    }}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md"
                  >
                    <span className="material-icons text-gray-600">close</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="py-8">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="cover-image"
                  disabled={!isEnabled}
                />
                <label
                  htmlFor="cover-image"
                  className={cn(
                    "cursor-pointer inline-flex flex-col items-center gap-2",
                    !isEnabled && "cursor-not-allowed"
                  )}
                >
                  <span className="text-3xl">+</span>
                  <span className="text-sm text-gray-500">Upload a photo</span>
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          {isCompleted ? (
            isActive || isEditing ? (
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Save
              </button>
            ) : (
              <button
                type="button"
                className="text-blue-500 px-6 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  console.log('Edit button clicked')
                  onEdit()
                }}
              >
                Edit
              </button>
            )
          ) : (
            <button
              type="submit"
              className={cn(
                "bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors",
                isEnabled ? "hover:bg-blue-600" : "opacity-50 cursor-not-allowed"
              )}
              disabled={!isEnabled}
            >
              Continue
            </button>
          )}
        </div>
      </form>
    </section>
  )
} 