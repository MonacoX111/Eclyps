import type { MetadataRoute } from "next"
import { getPublishedNewsPosts } from "@/lib/data/news"
import { getTournamentArchiveList } from "@/lib/data/tournament-archive"

export const dynamic = "force-dynamic"

type SitemapEntry = MetadataRoute.Sitemap[number]

type StaticRouteConfig = {
  path: string
  changeFrequency: SitemapEntry["changeFrequency"]
  priority: number
}

const staticRoutes: StaticRouteConfig[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/registration", changeFrequency: "weekly", priority: 0.8 },
  { path: "/matches", changeFrequency: "weekly", priority: 0.8 },
  { path: "/teams", changeFrequency: "weekly", priority: 0.7 },
  { path: "/players", changeFrequency: "weekly", priority: 0.7 },
  { path: "/tournaments", changeFrequency: "weekly", priority: 0.75 },
  { path: "/news", changeFrequency: "weekly", priority: 0.7 },
  { path: "/schedule", changeFrequency: "weekly", priority: 0.65 },
  { path: "/results", changeFrequency: "weekly", priority: 0.65 },
  { path: "/bracket", changeFrequency: "weekly", priority: 0.65 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const now = new Date()
  const [newsPosts, archive] = await Promise.all([
    getPublishedNewsPosts().catch((error) => {
      console.error("Sitemap: failed to load published news posts", error)
      return []
    }),
    getTournamentArchiveList().catch((error) => {
      console.error("Sitemap: failed to load tournament archive", error)
      return { tournaments: [] }
    }),
  ])

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...newsPosts.map((post) => ({
      url: `${baseUrl}/news/${post.slug}`,
      lastModified: toValidDate(post.published_at, now),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...archive.tournaments.map((tournament) => ({
      url: `${baseUrl}/tournaments/${tournament.id}`,
      lastModified: toValidDate(tournament.eventDate ?? tournament.createdAt, now),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ]
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")
}

function toValidDate(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? fallback : date
}
