import { createContext, useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface User {
  id: string
  name: string
  email: string
  picture?: string
}

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  showAuthModal: boolean
  setShowAuthModal: (show: boolean) => void
  authModalMessage: string | undefined
  setAuthModalMessage: (message: string | undefined) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [user, setUserState] = useState<User | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authModalMessage, setAuthModalMessage] = useState<string | undefined>(undefined)

  const isLoading = status === 'loading'

  useEffect(() => {
    if (status === 'loading') return
    if (session?.user) {
      setUserState({
        id: (session.user as any).id || '',
        name: session.user.name || '',
        email: session.user.email || '',
        picture: session.user.image || undefined,
      })
    } else {
      setUserState(null)
    }
  }, [session, status])

  const setUser = (userData: User | null) => {
    setUserState(userData)
  }

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      showAuthModal,
      setShowAuthModal,
      authModalMessage,
      setAuthModalMessage,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export type { User, AuthContextType }
