import type { Metadata } from 'next'

import { Navigation } from '@/components/Navigation'
import { Toaster } from 'sonner'

import { AppProviders } from './providers'
import '@/styles/globals.css'
import '@/dashboard.css'

export const metadata: Metadata = {
  title: 'RowGram - Professional Rowing Crew Images',
  description: 'Create professional rowing crew images for Instagram in just a few clicks',
  icons: {
    icon: '/RowGramImage.svg',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <Navigation />
          <main>{children}</main>
          <Toaster richColors position="bottom-right" />
        </AppProviders>
      </body>
    </html>
  )
}
