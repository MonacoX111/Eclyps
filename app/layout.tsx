import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const title = 'Eclyps — Competitive Esports Tournaments'
const description =
  'Join Eclyps tournaments, follow live matches, registered teams and players, schedules, and results for competitive esports events.'
const keywords = [
  'Eclyps',
  'esports',
  'tournaments',
  'CS2',
  'Counter-Strike 2',
  'gaming',
  'online tournaments',
  'competitive gaming',
]
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  process.env.VERCEL_URL
const metadataBase = new URL(
  siteUrl ? (siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`) : 'http://localhost:3000',
)
const ogImage = '/og-image.png'

export const metadata: Metadata = {
  metadataBase,
  title,
  description,
  keywords,
  authors: [{ name: 'Eclyps' }],
  creator: 'Eclyps',
  applicationName: 'Eclyps',
icons: {
  icon: [
    { url: '/favicon.ico' },
    { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    { url: '/favicon.svg', type: 'image/svg+xml' },
  ],
  apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
},
  openGraph: {
    title,
    description,
    type: 'website',
    siteName: 'Eclyps',
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: 'Eclyps competitive esports tournaments',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [ogImage],
  },
}

export const viewport = {
  themeColor: '#00c896',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
