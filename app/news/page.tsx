import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { ListEmptyState } from "@/components/list-empty-state"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData } from "@/lib/data/homepage"
import { getPublishedNewsPosts, type PublicNewsSummary } from "@/lib/data/news"
import { getLanguage, getTranslations } from "@/lib/i18n/server"
import { createPageMetadata } from "@/lib/seo"

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const [homepageData, t] = await Promise.all([
    getHomepageData(),
    getTranslations(),
  ])

  return createPageMetadata({
    title: `${t.news.title} | Eclyps`,
    description: t.news.subtitle,
    path: "/news",
    image: homepageData.tournamentView?.bannerUrl,
    imageAlt: "Eclyps news",
  })
}

export default async function NewsPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<NewsLoading />}>
          <NewsIndex />
        </Suspense>
      </MotionProvider>
      <Footer />
    </main>
  )
}

async function ActiveNavbar() {
  const [homepageData, userProfile] = await Promise.all([
    getHomepageData(),
    getCurrentUserProfile(),
  ])

  return (
    <Navbar
      participantLabel={homepageData.participantLabel}
      userProfile={userProfile}
    />
  )
}

async function NewsIndex() {
  const [posts, lang, t] = await Promise.all([
    getPublishedNewsPosts(),
    getLanguage(),
    getTranslations(),
  ])

  return (
    <section className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            {t.news.wire}
          </p>
          <h1 className="glow-text text-4xl font-bold text-foreground md:text-6xl">
            {t.news.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/58">
            {t.news.subtitle}
          </p>
        </div>

        {posts.length === 0 ? (
          <ListEmptyState variant="news" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <NewsCard key={post.slug} post={post} lang={lang} t={t} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function NewsCard({
  post,
  lang,
  t,
}: {
  post: PublicNewsSummary
  lang: "uk" | "en"
  t: any
}) {
  const categoryLabel = getCategoryLabel(post.category, t)

  return (
    <Link
      href={`/news/${post.slug}`}
      className="glass-card group flex min-h-full flex-col overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-1"
    >
      <CoverImage url={post.cover_image_url} title={post.title} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {categoryLabel && (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono uppercase tracking-wider text-primary">
              {categoryLabel}
            </span>
          )}
          <span className="text-white/45">{formatNewsDate(post.published_at, lang, t)}</span>
        </div>
        <h2 className="mt-4 text-xl font-bold leading-tight text-white transition group-hover:text-primary">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/60">{post.excerpt}</p>
        )}
        <p className="mt-auto pt-6 text-xs uppercase tracking-[0.2em] text-white/45">
          {post.author_name ?? "Eclyps"}
        </p>
      </div>
    </Link>
  )
}

function getCategoryLabel(category: string | null, t: any) {
  if (!category) return ""
  switch (category) {
    case "announcement":
      return t.news.categoryAnnouncement
    case "tournament":
      return t.news.categoryTournament
    case "update":
      return t.news.categoryUpdate
    case "patch_notes":
      return t.news.categoryPatchNotes
    default:
      return category
  }
}

function CoverImage({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={title}
        className="h-48 w-full object-cover opacity-90 transition duration-300 group-hover:opacity-100"
      />
    )
  }

  return (
    <div
      className="h-48 w-full"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, oklch(0.78 0.18 165 / 0.32), transparent 32%), linear-gradient(135deg, oklch(0.12 0.015 180), oklch(0.06 0.01 180))",
      }}
    />
  )
}

function formatNewsDate(value: string | null, lang: "uk" | "en", t: any) {
  if (!value) return t.news.dateTba

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "uk-UA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function NewsLoading() {
  return (
    <section className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 h-12 max-w-sm animate-pulse rounded bg-white/[0.04]" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="glass-card h-96 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    </section>
  )
}
