import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { getPublicEnv } from '@/lib/env/public'
import { getLanguage } from '@/lib/i18n/server'
import { translations } from '@/lib/i18n/translations'
import { LanguageProvider } from '@/components/language-provider'
import { AiChat } from '@/components/ai-chat'
import './globals.css'

const publicEnv = getPublicEnv()
const siteUrl = publicEnv.siteUrl
const metadataBase = new URL(
  siteUrl ?? 'http://localhost:3000',
)
const ogImage = '/og-image.png'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLanguage()
  const t = translations[lang]
  const title = t.metadata.title
  const description = t.metadata.description
  const keywords = t.metadata.keywords.split(', ')

  return {
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
    appleWebApp: {
      capable: true,
      title: 'Eclyps',
      statusBarStyle: 'black-translucent',
    },
  }
}

export const viewport = {
  themeColor: '#00c896',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const lang = await getLanguage()

  return (
    <html lang={lang} className="bg-background">
      <body className="font-sans antialiased">
        <LanguageProvider initialLang={lang}>
          {children}
          <AiChat />
        </LanguageProvider>
        {publicEnv.isProduction && <Analytics />}
      </body>
    </html>
  )
}
