'use client'

import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { SessionProvider } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { GuestProvider, useGuest } from '@/lib/guest-context'
import { AuthModal } from '@/components/AuthModal'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        refetchOnWindowFocus: true,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

function TRPCProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          fetch(url, options) {
            return fetch(url, { ...options, credentials: 'include' })
          },
        }),
      ],
    }),
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

function GuestSyncManager() {
  const { user } = useAuth()
  const { guestCrews, guestClubs, clearGuestData, setSyncedCrewIds } = useGuest()
  const createCrew = trpc.crew.create.useMutation()
  const createClub = trpc.club.create.useMutation()
  const utils = trpc.useUtils()

  const prevUserIdRef = useRef<string | null>(null)
  const isSyncingRef = useRef(false)
  const guestCrewsRef = useRef(guestCrews)
  const guestClubsRef = useRef(guestClubs)

  guestCrewsRef.current = guestCrews
  guestClubsRef.current = guestClubs

  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    prevUserIdRef.current = user?.id ?? null

    if (!user?.id || user.id === prevUserId || isSyncingRef.current) return

    const currentCrews = guestCrewsRef.current
    const currentClubs = guestClubsRef.current

    if (currentCrews.length === 0 && currentClubs.length === 0) return

    isSyncingRef.current = true

    const doSync = async () => {
      const clubIdMap: Record<string, string> = {}

      for (const club of currentClubs) {
        try {
          const created = await createClub.mutateAsync({
            name: club.name,
            primaryColor: club.primaryColor,
            secondaryColor: club.secondaryColor,
            ...(club.logoUrl ? { logoUrl: club.logoUrl } : {}),
          })
          clubIdMap[club.id] = created.id
        } catch {
          // skip on error, continue syncing others
        }
      }

      const crewIdMap: Record<string, string> = {}

      for (const crew of currentCrews) {
        try {
          const realClubId = crew.clubId ? clubIdMap[crew.clubId] : undefined
          const created = await createCrew.mutateAsync({
            name: crew.name,
            ...(crew.raceName ? { raceName: crew.raceName } : {}),
            ...(crew.raceDate ? { raceDate: crew.raceDate } : {}),
            boatCode: crew.boatCode,
            crewNames: crew.crewNames,
            ...(crew.coachName ? { coachName: crew.coachName } : {}),
            ...(crew.raceCategory ? { raceCategory: crew.raceCategory } : {}),
            ...(crew.clubName ? { clubName: crew.clubName } : {}),
            ...(realClubId ? { clubId: realClubId } : {}),
            userId: user.id,
          })
          crewIdMap[crew.id] = created.id
        } catch {
          // skip on error, continue syncing others
        }
      }

      clearGuestData()
      setSyncedCrewIds(crewIdMap)
      void utils.crew.getAll.invalidate()
      void utils.club.getAll.invalidate()
      isSyncingRef.current = false
    }

    void doSync()
    // Intentionally minimal deps: we want this to fire only when user.id changes,
    // and we read guest data via refs to avoid stale closure issues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return null
}

function AppContent({ children }: { children: ReactNode }) {
  const { showAuthModal, setShowAuthModal, authModalMessage } = useAuth()

  return (
    <>
      {children}
      <GuestSyncManager />
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {}}
        message={authModalMessage}
      />
    </>
  )
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TRPCProvider>
        <GuestProvider>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </GuestProvider>
      </TRPCProvider>
    </SessionProvider>
  )
}
