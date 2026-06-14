import type { MetadataRoute } from "next"
import { getPublishedNewsPosts } from "@/lib/data/news"
import { getTournamentArchiveList } from "@/lib/data/tournament-archive"

export const dynamic = "force-dynamic"

const staticRoutes = [
  "",
  "/registration",
  "/matches",
  "/teams",
  "/players",
  "/tournaments",
  "/news",
  "/schedule",
  "/results",
  "/bracket",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const [newsPosts, archive] = await Promise.all([
    getPublishedNewsPosts(),
    getTournamentArchiveList(),
  ])

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    })),
    ...newsPosts.map((post) => ({
      url: `${baseUrl}/news/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...archive.tournaments.map((tournament) => ({
      url: `${baseUrl}/tournaments/${tournament.id}`,
      lastModified: new Date(tournament.eventDate ?? tournament.createdAt ?? Date.now()),
      changeFrequency: "monthly" as const,
      priority: 0.65,
    })),
  ]
}

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")
}
