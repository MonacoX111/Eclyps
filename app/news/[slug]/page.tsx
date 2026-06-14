import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData } from "@/lib/data/homepage"
import { getPublishedNewsPostBySlug } from "@/lib/data/news"
import { getLanguage, getTranslations } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

type ArticlePageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const [post, t] = await Promise.all([
    getPublishedNewsPostBySlug(slug),
    getTranslations(),
  ])

  if (!post) {
    return {
      title: `${t.news.title} | Eclyps`,
      robots: { index: false, follow: false },
    }
  }

  const description = createSeoDescription(post.excerpt ?? post.content, t.metadata.description)
  const image = post.cover_image_url ?? "/og-image.png"
  const title = `${post.title} | Eclyps`

  return {
    title,
    description,
    alternates: {
      canonical: `/news/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/news/${post.slug}`,
      type: "article",
      siteName: "Eclyps",
      publishedTime: post.published_at ?? undefined,
      authors: [post.author_name ?? "Eclyps"],
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params

  return (
    <main className="relative min-h-screen overflow-x-hidden pt-20">
      <AdminShortcut />
      <ParticleField />
      <MotionProvider>
        <Suspense fallback={null}>
          <ActiveNavbar />
        </Suspense>

        <Suspense fallback={<ArticleLoading />}>
          <Article slug={slug} />
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

async function Article({ slug }: { slug: string }) {
  const [post, lang, t] = await Promise.all([
    getPublishedNewsPostBySlug(slug),
    getLanguage(),
    getTranslations(),
  ])

  if (!post) notFound()

  const categoryLabel = getCategoryLabel(post.category, t)

  return (
    <article className="relative z-10 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/news"
          className="text-sm font-medium text-primary transition hover:text-emerald-200"
        >
          {t.news.backToNews}
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {categoryLabel && (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono uppercase tracking-wider text-primary">
                {categoryLabel}
              </span>
            )}
            <span className="text-white/45">{formatNewsDate(post.published_at, lang, t)}</span>
            <span className="text-white/35">{t.news.by} {post.author_name ?? "Eclyps"}</span>
          </div>
          <h1 className="glow-text mt-5 text-4xl font-bold leading-tight text-white md:text-6xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/65">{post.excerpt}</p>
          )}
        </header>

        <CoverImage url={post.cover_image_url} title={post.title} />

        <div className="glass-card mt-8 rounded-2xl p-6 md:p-8">
          <div className="whitespace-pre-wrap text-base leading-8 text-white/78">
            {post.content}
          </div>
        </div>
      </div>
    </article>
  )
}

function createSeoDescription(value: string | null, fallback: string) {
  const compact = value?.replace(/\s+/g, " ").trim()
  if (!compact) return fallback
  return compact.length > 160 ? `${compact.slice(0, 157).trim()}...` : compact
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
        className="mt-8 max-h-[520px] w-full rounded-2xl border border-primary/15 object-cover shadow-2xl shadow-black/30"
      />
    )
  }

  return (
    <div
      className="mt-8 h-72 w-full rounded-2xl border border-primary/15 shadow-2xl shadow-black/30 md:h-96"
      style={{
        background:
          "radial-gradient(circle at 18% 22%, oklch(0.78 0.18 165 / 0.32), transparent 32%), radial-gradient(circle at 80% 70%, oklch(0.65 0.12 210 / 0.18), transparent 34%), linear-gradient(135deg, oklch(0.12 0.015 180), oklch(0.06 0.01 180))",
      }}
    />
  )
}

function formatNewsDate(value: string | null, lang: "uk" | "en", t: any) {
  if (!value) return t.news.dateTba

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "uk-UA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function ArticleLoading() {
  return (
    <section className="relative z-10 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="h-8 w-32 animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-8 h-24 max-w-3xl animate-pulse rounded bg-white/[0.04]" />
        <div className="glass-card mt-8 h-96 animate-pulse rounded-2xl" />
      </div>
    </section>
  )
}
