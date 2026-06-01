import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Eclyps',
    short_name: 'Eclyps',
    description: 'Esports tournament platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#07080a',
    theme_color: '#00c896',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
