import type { Metadata } from "next"
import { getPublicEnv } from "@/lib/env/public"

const DEFAULT_OG_IMAGE = "/og-image.png"
const SITE_NAME = "Eclyps"

type PageMetadataOptions = {
  title: string
  description: string
  path: string
  image?: string | null
  imageAlt?: string
  type?: "website" | "article"
  publishedTime?: string | null
  authors?: string[]
}

export function getSiteUrl() {
  return getPublicEnv().siteUrl ?? "http://localhost:3000"
}

export function getMetadataBase() {
  return new URL(getSiteUrl())
}

export function createPageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  type = "website",
  publishedTime,
  authors,
}: PageMetadataOptions): Metadata {
  const previewImage = image?.trim() || DEFAULT_OG_IMAGE
  const ogImage = createOgImagePath({
    title,
    description,
    image: previewImage,
  })

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: SITE_NAME,
      publishedTime: type === "article" ? publishedTime ?? undefined : undefined,
      authors: type === "article" ? authors : undefined,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt ?? title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

export function createSeoDescription(value: string | null | undefined, fallback: string) {
  const compact = value?.replace(/\s+/g, " ").trim()
  if (!compact) return fallback
  return compact.length > 160 ? `${compact.slice(0, 157).trim()}...` : compact
}

function createOgImagePath({
  title,
  description,
  image,
}: {
  title: string
  description: string
  image: string
}) {
  const params = new URLSearchParams({
    title,
    description,
    image: toAbsoluteUrl(image),
  })

  return `/api/og?${params.toString()}`
}

function toAbsoluteUrl(value: string) {
  try {
    return new URL(value).toString()
  } catch {
    return new URL(value, getSiteUrl()).toString()
  }
}
