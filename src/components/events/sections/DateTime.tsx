'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Inter } from 'next/font/google'
import { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

const inter = Inter({ subsets: ['latin'] })

const isDateInPast = (date: string) => {
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selectedDate < today;
};

const isEndTimeAfterStart = (endTime: string, startTime: string, date: string) => {
  const eventDate = new Date(date);
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);
  
  const startDateTime = new Date(eventDate).setHours(startHours, startMinutes);
  const endDateTime = new Date(eventDate).setHours(endHours, endMinutes);
  
  return endDateTime > startDateTime;
};

const schema = z.object({
  date: z.string()
    .min(1, "Date is required")
    .refine(date => !isDateInPast(date), {
      message: "The date can't be in the past."
    }),
  startTime: z.string()
    .min(1, "Start time is required"),
  endTime: z.string()
    .min(1, "End time is required"),
  location: z.string()
    .min(1, "Location is required"),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
}).refine((data) => isEndTimeAfterStart(data.endTime, data.startTime, data.date), {
  message: "The event end time must be later than the start time on the selected date.",
  path: ["endTime"],
});

type FormData = z.infer<typeof schema>

interface DateTimeProps {
  isActive: boolean
  isLocked: boolean
  isCompleted: boolean
  onComplete: (data: FormData) => void
  defaultValues?: Partial<FormData>
  onClick: () => void
  isEditing?: boolean
  onEdit: () => void
}

export function DateTime({
  isActive,
  isLocked,
  isCompleted,
  onComplete,
  defaultValues,
  onClick,
  isEditing,
  onEdit
}: DateTimeProps) {
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
    reValidateMode: 'onChange'
  })

  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    defaultValues?.coordinates || null
  )
  const [selectedAddress, setSelectedAddress] = useState(defaultValues?.location || "")

  const isEnabled = isActive || isEditing

  // Initialize Mapbox
  useEffect(() => {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox access token is missing');
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    
    if (mapContainer.current && !map.current && selectedLocation) {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [selectedLocation.lng, selectedLocation.lat],
          zoom: 15
        });

        marker.current = new mapboxgl.Marker()
          .setLngLat([selectedLocation.lng, selectedLocation.lat])
          .addTo(map.current);
      } catch (error) {
        console.error('Error initializing Mapbox map:', error);
      }
    }
  }, [selectedLocation]);

  // Update marker position when location changes
  useEffect(() => {
    if (map.current && marker.current && selectedLocation) {
      marker.current.setLngLat([selectedLocation.lng, selectedLocation.lat]);
      map.current.setCenter([selectedLocation.lng, selectedLocation.lat]);
    }
  }, [selectedLocation]);

  // Initialize map and geocoder immediately when the section becomes active
  useEffect(() => {
    if (!isActive || !isEnabled) return;
    
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      console.error('Mapbox access token is missing');
      return;
    }

    // Initialize geocoder immediately
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxToken,
      mapboxgl: mapboxgl as any,
      marker: false,
      placeholder: 'Search location'
    });

    const input = document.getElementById('address-input');
    if (input) {
      try {
        geocoder.addTo(input.parentElement!);
        if (selectedAddress) {
          geocoder.setInput(selectedAddress);
        }

        geocoder.on('result', (event) => {
          const { geometry, place_name } = event.result;
          if (geometry.type === 'Point') {
            const [lng, lat] = geometry.coordinates;
            setSelectedLocation({ lat, lng });
            setValue('coordinates', { lat, lng });
            setValue('location', place_name);
            setSelectedAddress(place_name);
          }
        });
      } catch (error) {
        console.error('Error initializing Mapbox geocoder:', error);
      }
    }

    return () => {
      try {
        geocoder.onRemove();
      } catch (error) {
        console.error('Error removing geocoder:', error);
      }
    };
  }, [isActive, isEnabled, setValue, selectedAddress]);

  useEffect(() => {
    if (defaultValues?.coordinates && !selectedLocation) {
      setSelectedLocation(defaultValues.coordinates)
    }
  }, [defaultValues, selectedLocation])

  console.log('DateTime render:', {
    isActive,
    isLocked,
    isCompleted,
    isEditing,
    isEnabled
  })

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
          Date and location
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
            Date and time
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className={cn(
                inter.className,
                "block text-[16px] font-medium leading-[24px] text-[#090909] mb-2"
              )}>
                Date
              </label>
              <input
                type="date"
                {...register("date")}
                className={cn(
                  "w-full p-3 border rounded-lg bg-background",
                  errors.date && "border-red-500",
                  !isEnabled && "opacity-50"
                )}
                disabled={!isEnabled}
              />
              {errors.date && isEnabled && (
                <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn(
                  inter.className,
                  "block text-[16px] font-medium leading-[24px] text-[#090909] mb-2"
                )}>
                  Start time
                </label>
                <input
                  type="time"
                  {...register("startTime")}
                  className={cn(
                    "w-full p-3 border rounded-lg bg-background",
                    errors.startTime && "border-red-500",
                    !isEnabled && "opacity-50"
                  )}
                  disabled={!isEnabled}
                />
                {errors.startTime && isEnabled && (
                  <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>
                )}
              </div>
              <div>
                <label className={cn(
                  inter.className,
                  "block text-[16px] font-medium leading-[24px] text-[#090909] mb-2"
                )}>
                  End time
                </label>
                <input
                  type="time"
                  {...register("endTime")}
                  className={cn(
                    "w-full p-3 border rounded-lg bg-background",
                    errors.endTime && "border-red-500",
                    !isEnabled && "opacity-50"
                  )}
                  disabled={!isEnabled}
                />
                {errors.endTime && isEnabled && (
                  <p className="text-red-500 text-sm mt-1">{errors.endTime.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className={cn(
            inter.className,
            "text-[20px] font-medium leading-[24px] text-[#090909] mb-4"
          )}>
            Location
          </h3>
          <div className="space-y-4">
            <div>
              <label className={cn(
                inter.className,
                "block text-[16px] font-medium leading-[24px] text-[#090909] mb-2"
              )}>
                Search location
              </label>
              {isEnabled ? (
                <>
                  <div 
                    id="address-input"
                    className={cn(
                      "mapboxgl-ctrl",
                      !isEnabled && "opacity-50 pointer-events-none"
                    )}
                  />
                  <input
                    type="hidden"
                    {...register("location")}
                  />
                </>
              ) : (
                <input
                  type="text"
                  value={selectedAddress}
                  disabled
                  className="w-full p-3 border rounded-lg bg-background opacity-50"
                />
              )}
              {errors.location && isEnabled && (
                <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
              )}
            </div>

            {selectedLocation && (
              <div ref={mapContainer} className="h-[300px] rounded-lg overflow-hidden" />
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