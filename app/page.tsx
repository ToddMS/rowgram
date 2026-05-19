'use client'

import Link from 'next/link'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

function AuthCallback() {
  const searchParams = useSearchParams()
  const { setUser } = useAuth()

  useEffect(() => {
    const auth = searchParams.get('auth')
    const userParam = searchParams.get('user')
    const error = searchParams.get('error')

    if (auth === 'success' && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam))
        setUser(userData)
        window.history.replaceState({}, '', '/')
      } catch (e) {
        console.error('Failed to parse user data:', e)
      }
    }

    if (error) {
      toast.error('Authentication failed: ' + error)
      window.history.replaceState({}, '', '/')
    }
  }, [searchParams, setUser])

  return null
}

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="dashboard-container">
      <Suspense>
        <AuthCallback />
      </Suspense>
      <div className="container">
        <section className="hero">
          <h1>{user ? 'Welcome back to RowGram' : 'Welcome to RowGram'}</h1>
          <p>
            {user
              ? 'Create professional rowing crew images for Instagram in just a few clicks'
              : 'Create professional rowing crew images for Instagram - Sign in to get started'}
          </p>
        </section>

        <div className="action-cards">
          <Link href="/crews" className="action-card">
            <h3 className="action-title">Create Crew</h3>
            <p className="action-description">Set up a new crew with members, cox, and coach details</p>
            <div className="action-arrow">
              Get started <span>→</span>
            </div>
          </Link>

          <Link href="/clubs" className="action-card">
            <h3 className="action-title">Manage Clubs</h3>
            <p className="action-description">Create and customise club presets with colors and branding</p>
            <div className="action-arrow">
              Manage <span>→</span>
            </div>
          </Link>

          <Link href="/generate" className="action-card">
            <h3 className="action-title">Generate Images</h3>
            <p className="action-description">Turn your crews into beautiful Instagram-ready images</p>
            <div className="action-arrow">
              Create now <span>→</span>
            </div>
          </Link>

          <Link href="/gallery" className="action-card">
            <h3 className="action-title">View Gallery</h3>
            <p className="action-description">Browse and download all your generated crew images</p>
            <div className="action-arrow">
              Browse <span>→</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
