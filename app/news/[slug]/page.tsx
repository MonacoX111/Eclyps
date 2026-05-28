import { Suspense } from "react"
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
import { getLanguage } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

type ArticlePageProps = {
  params: Promise<{ slug: string }>
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
  const [post, lang] = await Promise.all([
    getPublishedNewsPostBySlug(slug),
    getLanguage(),
  ])

  if (!post) notFound()

  return (
    <article className="relative z-10 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/news"
          className="text-sm font-medium text-primary transition hover:text-emerald-200"
        >
          {"<-"} Back to news
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {post.category && (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono uppercase tracking-wider text-primary">
                {post.category}
              </span>
            )}
            <span className="text-white/45">{formatNewsDate(post.published_at, lang)}</span>
            <span className="text-white/35">by {post.author_name ?? "Eclyps"}</span>
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

function formatNewsDate(value: string | null, lang: "uk" | "en") {
  if (!value) return "Date TBA"

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
