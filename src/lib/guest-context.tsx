'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface GuestCrew {
  id: string
  name: string
  raceName?: string
  raceDate?: string
  boatName?: string
  coachName?: string
  raceCategory?: string
  crewNames: Array<string>
  boatCode: string
  clubName?: string
  clubId?: string
  createdAt: string
  isGuest: true
}

export interface GuestClub {
  id: string
  name: string
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
  createdAt: string
  isGuest: true
}

interface GuestContextType {
  guestCrews: Array<GuestCrew>
  guestClubs: Array<GuestClub>
  addGuestCrew: (crew: Omit<GuestCrew, 'id' | 'createdAt' | 'isGuest'>) => GuestCrew
  updateGuestCrew: (id: string, updates: Partial<Omit<GuestCrew, 'id' | 'isGuest'>>) => void
  removeGuestCrew: (id: string) => void
  addGuestClub: (club: Omit<GuestClub, 'id' | 'createdAt' | 'isGuest'>) => GuestClub
  updateGuestClub: (id: string, updates: Partial<Omit<GuestClub, 'id' | 'isGuest'>>) => void
  removeGuestClub: (id: string) => void
  clearGuestData: () => void
  syncedCrewIds: Record<string, string>
  setSyncedCrewIds: (ids: Record<string, string>) => void
  hasGuestData: boolean
}

const GUEST_CREWS_KEY = 'rowgram_guest_crews'
const GUEST_CLUBS_KEY = 'rowgram_guest_clubs'

const GuestContext = createContext<GuestContextType | null>(null)

export function useGuest() {
  const context = useContext(GuestContext)
  if (!context) throw new Error('useGuest must be used within GuestProvider')
  return context
}

function generateId() {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function loadFromStorage<T>(key: string): Array<T> {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as Array<T>) : []
  } catch {
    return []
  }
}

function saveToStorage<T>(key: string, data: Array<T>) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [guestCrews, setGuestCrews] = useState<Array<GuestCrew>>([])
  const [guestClubs, setGuestClubs] = useState<Array<GuestClub>>([])
  const [syncedCrewIds, setSyncedCrewIds] = useState<Record<string, string>>({})
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    setGuestCrews(loadFromStorage<GuestCrew>(GUEST_CREWS_KEY))
    setGuestClubs(loadFromStorage<GuestClub>(GUEST_CLUBS_KEY))
  }, [])

  const addGuestCrew = useCallback((crew: Omit<GuestCrew, 'id' | 'createdAt' | 'isGuest'>): GuestCrew => {
    const newCrew: GuestCrew = { ...crew, id: generateId(), createdAt: new Date().toISOString(), isGuest: true }
    setGuestCrews((prev) => {
      const updated = [newCrew, ...prev]
      saveToStorage(GUEST_CREWS_KEY, updated)
      return updated
    })
    return newCrew
  }, [])

  const updateGuestCrew = useCallback((id: string, updates: Partial<Omit<GuestCrew, 'id' | 'isGuest'>>) => {
    setGuestCrews((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      saveToStorage(GUEST_CREWS_KEY, updated)
      return updated
    })
  }, [])

  const removeGuestCrew = useCallback((id: string) => {
    setGuestCrews((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      saveToStorage(GUEST_CREWS_KEY, updated)
      return updated
    })
  }, [])

  const addGuestClub = useCallback((club: Omit<GuestClub, 'id' | 'createdAt' | 'isGuest'>): GuestClub => {
    const newClub: GuestClub = { ...club, id: generateId(), createdAt: new Date().toISOString(), isGuest: true }
    setGuestClubs((prev) => {
      const updated = [newClub, ...prev]
      saveToStorage(GUEST_CLUBS_KEY, updated)
      return updated
    })
    return newClub
  }, [])

  const updateGuestClub = useCallback((id: string, updates: Partial<Omit<GuestClub, 'id' | 'isGuest'>>) => {
    setGuestClubs((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      saveToStorage(GUEST_CLUBS_KEY, updated)
      return updated
    })
  }, [])

  const removeGuestClub = useCallback((id: string) => {
    setGuestClubs((prev) => {
      const updated = prev.filter((c) => c.id !== id)
      saveToStorage(GUEST_CLUBS_KEY, updated)
      return updated
    })
  }, [])

  const clearGuestData = useCallback(() => {
    setGuestCrews([])
    setGuestClubs([])
    try {
      localStorage.removeItem(GUEST_CREWS_KEY)
      localStorage.removeItem(GUEST_CLUBS_KEY)
    } catch {
      // ignore
    }
  }, [])

  return (
    <GuestContext.Provider
      value={{
        guestCrews,
        guestClubs,
        addGuestCrew,
        updateGuestCrew,
        removeGuestCrew,
        addGuestClub,
        updateGuestClub,
        removeGuestClub,
        clearGuestData,
        syncedCrewIds,
        setSyncedCrewIds,
        hasGuestData: guestCrews.length > 0 || guestClubs.length > 0,
      }}
    >
      {children}
    </GuestContext.Provider>
  )
}
