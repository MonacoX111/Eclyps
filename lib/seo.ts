import type { Metadata } from "next"
import { getPublicEnv } from "@/lib/env/public"

const DEFAULT_SITE_URL = "https://eclyps.vercel.app"
const DEFAULT_OG_IMAGE = "/og.png"
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
  return getPublicEnv().siteUrl ?? DEFAULT_SITE_URL
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
  const previewImage = toAbsoluteUrl(image?.trim() || DEFAULT_OG_IMAGE)
  const pageUrl = toAbsoluteUrl(path)

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type,
      siteName: SITE_NAME,
      publishedTime: type === "article" ? publishedTime ?? undefined : undefined,
      authors: type === "article" ? authors : undefined,
      images: [
        {
          url: previewImage,
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
      images: [previewImage],
    },
  }
}

export function createSeoDescription(value: string | null | undefined, fallback: string) {
  const compact = value?.replace(/\s+/g, " ").trim()
  if (!compact) return fallback
  return compact.length > 160 ? `${compact.slice(0, 157).trim()}...` : compact
}

function toAbsoluteUrl(value: string) {
  try {
    return new URL(value).toString()
  } catch {
    return new URL(value, getSiteUrl()).toString()
  }
}
