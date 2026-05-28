import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { supabase } from "@/lib/supabase/client"
import { readNullableString, readStringId } from "@/lib/data/normalize"

export type PublicNewsPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover_image_url: string | null
  status: "published"
  category: string | null
  author_name: string | null
  published_at: string | null
}

export type PublicNewsSummary = Pick<
  PublicNewsPost,
  "title" | "slug" | "excerpt" | "category" | "author_name" | "published_at" | "cover_image_url"
>

export async function getPublishedNewsPosts(): Promise<PublicNewsSummary[]> {
  noStore()

  const { rows } = await getPublishedNewsRows(
    "id, title, slug, excerpt, cover_image_url, status, category, author_name, published_at",
  )

  return rows.map((post) => ({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category: post.category,
    author_name: post.author_name,
    published_at: post.published_at,
    cover_image_url: post.cover_image_url,
  }))
}

export async function getPublishedNewsPostBySlug(
  slug: string,
): Promise<PublicNewsPost | null> {
  noStore()

  if (!slug) return null

  const { rows } = await getPublishedNewsRows(
    "id, title, slug, excerpt, content, cover_image_url, status, category, author_name, published_at",
    { slug, limit: 1 },
  )

  return rows[0] ?? null
}

export async function getLatestNewsForAi(limit = 5) {
  noStore()

  const { rows } = await getPublishedNewsRows(
    "id, title, slug, excerpt, status, category, author_name, published_at",
    { limit },
  )

  return rows.map((post) => ({
    title: post.title,
    category: post.category,
    date: post.published_at,
    excerpt: post.excerpt,
  }))
}

async function getPublishedNewsRows(
  select: string,
  options: { slug?: string; limit?: number } = {},
) {
  if (!supabase) return { rows: [] as PublicNewsPost[] }

  let query = supabase
    .from("news_posts")
    .select(select)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })

  if (options.slug) query = query.eq("slug", options.slug)
  if (options.limit) query = query.limit(options.limit)

  const { data, error } = await query
  if (error || !data) return { rows: [] as PublicNewsPost[] }

  const rawRows = data as unknown as Record<string, unknown>[]

  return {
    rows: rawRows
      .map(normalizePublicNewsPost)
      .filter((post): post is PublicNewsPost => post !== null),
  }
}

function normalizePublicNewsPost(row: Record<string, unknown>): PublicNewsPost | null {
  const id = readStringId(row.id)
  const title = readNullableString(row.title)
  const slug = readNullableString(row.slug)
  const content = readNullableString(row.content) ?? ""

  if (!id || !title || !slug || row.status !== "published") return null

  return {
    id,
    title,
    slug,
    excerpt: readNullableString(row.excerpt),
    content,
    cover_image_url: readNullableString(row.cover_image_url),
    status: "published",
    category: readNullableString(row.category),
    author_name: readNullableString(row.author_name),
    published_at: readNullableString(row.published_at),
  }
}
