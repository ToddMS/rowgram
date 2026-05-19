import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.AUTH_SECRET ?? 'dev-secret-change-in-production'

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(userId).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string): string | null {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return null
  const payload = token.slice(0, dotIndex)
  const sig = token.slice(dotIndex + 1)
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url')
  try {
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expected)
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null
    return Buffer.from(payload, 'base64url').toString()
  } catch {
    return null
  }
}

export function sessionCookie(userId: string): string {
  const token = createSessionToken(userId)
  const maxAge = 7 * 24 * 60 * 60
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `rowgram_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`
}
