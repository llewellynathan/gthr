'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export function Navigation() {
  const { user } = useUser()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <nav className="h-14 border-b">
      <div className="max-w-[1120px] h-full mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="font-bold">
          GTHR
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/events"
                className="h-10 px-4 flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="material-icons text-[20px]">calendar_today</span>
                My Events
              </Link>

              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="h-10 px-4 flex items-center gap-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {user.email}
                  <span className="material-icons text-gray-600">
                    {isMenuOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/auth"
              className="h-10 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
} 