'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
})

type FormData = z.infer<typeof schema>

interface EventOverviewProps {
  isActive: boolean
  isLocked: boolean
  isCompleted: boolean
  onComplete: (data: FormData) => void
  defaultValues?: Partial<FormData>
  onClick: () => void
  isEditing?: boolean
  onEdit: () => void
}

export function EventOverview({ 
  isActive, 
  isLocked, 
  isCompleted, 
  onComplete,
  defaultValues,
  onClick,
  isEditing,
  onEdit
}: EventOverviewProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues
  })

  const isEnabled = isActive || isEditing

  console.log('EventOverview render:', {
    isActive,
    isLocked,
    isCompleted,
    isEditing,
    isEnabled
  })

  return (
    <section 
      className={cn(
        "rounded-lg border p-6",
        isLocked && "opacity-50 pointer-events-none",
        isCompleted && !isActive && "hover:border-blue-200 cursor-pointer",
        isCompleted && "border-green-500",
        (isActive || isEditing) && "border-blue-500 shadow-sm"
      )}
    >
      <div className="mb-10 flex items-center justify-between">
        <h2 className={cn(
          inter.className,
          "text-[32px] font-bold leading-[40px] text-[#090909]"
        )}>
          Event overview
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
            Event title
          </h3>
          <p className={cn(
            inter.className,
            "text-[16px] font-medium leading-[24px] text-[#767676] mb-4"
          )}>
            Write a descriptive title to tell people what the event is about.
          </p>
          <label className={cn(
            inter.className,
            "block text-[16px] font-medium leading-[24px] text-[#090909] mb-2"
          )}>
            Event title
          </label>
          <input
            {...register("title")}
            className={cn(
              "w-full p-3 border rounded-lg bg-background",
              errors.title && "border-red-500",
              !isEnabled && "opacity-50"
            )}
            placeholder=""
            disabled={!isEnabled}
          />
          {errors.title && isEnabled && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        <div>
          <h3 className={cn(
            inter.className,
            "text-[20px] font-medium leading-[24px] text-[#090909] mb-4"
          )}>
            Description
          </h3>
          <p className={cn(
            inter.className,
            "text-[16px] font-medium leading-[24px] text-[#767676] mb-4"
          )}>
            Build excitement and interest with a short description. This will show at the top of your event page.
          </p>
          <label className={cn(
            inter.className,
            "block text-[16px] font-medium leading-[24px] text-[#090909] mb-2"
          )}>
            Event description
          </label>
          <textarea
            {...register("description")}
            className={cn(
              "w-full p-3 border rounded-lg bg-background min-h-[120px]",
              errors.description && "border-red-500",
              !isEnabled && "opacity-50"
            )}
            placeholder=""
            disabled={!isEnabled}
          />
          {errors.description && isEnabled && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
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