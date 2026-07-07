import { dirname } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = dirname(fileURLToPath(import.meta.url))

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
]

const productionSecurityHeaders =
  process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []

const privateRouteHeaders = [
  {
    key: "Cache-Control",
    value: "no-store, max-age=0",
  },
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
]

/** @type {import("next").NextConfig} */
const nextConfig = {
  outputFileTracingRoot: projectRoot,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders, ...productionSecurityHeaders],
      },
      {
        source: "/admin/:path*",
        headers: privateRouteHeaders,
      },
      {
        source: "/account/:path*",
        headers: privateRouteHeaders,
      },
      {
        source: "/auth/:path*",
        headers: privateRouteHeaders,
      },
    ]
  },
}

export default nextConfig