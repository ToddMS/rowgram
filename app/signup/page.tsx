'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/lib/auth-context'

export default function SignupPage() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const signupMutation = trpc.user.signup.useMutation({
    onSuccess: (user) => { setUser({ id: user.id, name: user.name ?? '', email: user.email ?? '' }); router.push('/crews') },
    onError: (err) => { setFormError(err.message); setLoading(false) },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    if (password !== confirmPassword) { setFormError('Passwords do not match'); return }
    if (password.length < 6) { setFormError('Password must be at least 6 characters'); return }
    setLoading(true)
    signupMutation.mutate({ name, email, password })
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '1rem' }
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: '#1f2937', fontSize: '1.5rem', fontWeight: 'bold' }}>Create Account</h1>
        <form onSubmit={handleSubmit}>
          {[
            { id: 'name', label: 'Name', type: 'text', value: name, onChange: setName, placeholder: 'Enter your full name' },
            { id: 'email', label: 'Email', type: 'email', value: email, onChange: setEmail, placeholder: 'Enter your email' },
            { id: 'password', label: 'Password', type: 'password', value: password, onChange: setPassword, placeholder: 'Choose a password (min 6 characters)' },
            { id: 'confirmPassword', label: 'Confirm Password', type: 'password', value: confirmPassword, onChange: setConfirmPassword, placeholder: 'Confirm your password' },
          ].map(({ id, label, type, value, onChange, placeholder }, i, arr) => (
            <div key={id} style={{ marginBottom: i === arr.length - 1 ? '1.5rem' : '1rem' }}>
              <label htmlFor={id} style={labelStyle}>{label}</label>
              <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required style={inputStyle} placeholder={placeholder} />
            </div>
          ))}
          {formError && <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>{formError}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: loading ? '#9ca3af' : '#2563eb', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '1rem' }}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <div style={{ textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          Already have an account?{' '}
          <Link href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
