import { Suspense } from "react"
import Link from "next/link"
import { AdminShortcut } from "@/components/admin-shortcut"
import { Footer } from "@/components/footer"
import { MotionProvider } from "@/components/motion-provider"
import { Navbar } from "@/components/navbar"
import { ParticleField } from "@/components/particle-field"
import { getCurrentUserProfile } from "@/lib/auth/user-profile"
import { getHomepageData } from "@/lib/data/homepage"
import { getPublishedNewsPosts, type PublicNewsSummary } from "@/lib/data/news"
import { getLanguage } from "@/lib/i18n/server"

export const dynamic = "force-dynamic"

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
  const [posts, lang] = await Promise.all([getPublishedNewsPosts(), getLanguage()])

  return (
    <section className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Eclyps Wire
          </p>
          <h1 className="glow-text text-4xl font-bold text-foreground md:text-6xl">
            News
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-white/58">
            Announcements, tournament updates, patch notes, and official Eclyps posts.
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <p className="text-lg font-semibold text-white">No published posts yet.</p>
            <p className="mt-2 text-sm text-white/55">
              Official Eclyps news will appear here after admins publish it.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <NewsCard key={post.slug} post={post} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function NewsCard({ post, lang }: { post: PublicNewsSummary; lang: "uk" | "en" }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="glass-card group flex min-h-full flex-col overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-1"
    >
      <CoverImage url={post.cover_image_url} title={post.title} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {post.category && (
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 font-mono uppercase tracking-wider text-primary">
              {post.category}
            </span>
          )}
          <span className="text-white/45">{formatNewsDate(post.published_at, lang)}</span>
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

function formatNewsDate(value: string | null, lang: "uk" | "en") {
  if (!value) return "Date TBA"

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
