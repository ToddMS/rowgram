import { signIn } from 'next-auth/react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (user: { id: string; name: string; email: string }) => void
  message?: string
}

export function AuthModal({ isOpen, onClose, message }: AuthModalProps) {
  const handleGoogleSignIn = () => {
    const callbackUrl = typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/'
    signIn('google', { callbackUrl })
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '2rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          width: '100%',
          maxWidth: '380px',
          position: 'relative',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#6b7280',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ margin: 0, marginBottom: '0.5rem', fontSize: '1.375rem', fontWeight: '700' }}>
            Sign in to RowGram
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
            {message ?? 'Sign in to save and manage your crews'}
          </p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.625rem',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: '500',
            color: '#111827',
            transition: 'background-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p style={{ margin: '1.25rem 0 0', textAlign: 'center', fontSize: '0.8125rem', color: '#9ca3af' }}>
          Free to use — no credit card required
        </p>
      </div>
    </div>
  )
}
