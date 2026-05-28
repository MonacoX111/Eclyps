import "server-only"

import { unstable_noStore as noStore } from "next/cache"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { readNullableString, readStringId } from "@/lib/data/normalize"

export const NEWS_STATUSES = ["draft", "published", "archived"] as const
export type NewsStatus = (typeof NEWS_STATUSES)[number]

export type AdminNewsPost = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover_image_url: string | null
  status: NewsStatus
  category: string | null
  author_name: string | null
  published_at: string | null
  created_at: string | null
  updated_at: string | null
}

export type AdminNewsQueryResult = {
  posts: AdminNewsPost[]
  error: string | null
}

export async function getAdminNewsPosts(): Promise<AdminNewsQueryResult> {
  noStore()

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) {
    return { posts: [], error: "Supabase admin client is not configured." }
  }

  const { data, error } = await supabaseAdmin
    .from("news_posts")
    .select(
      "id, title, slug, excerpt, content, cover_image_url, status, category, author_name, published_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false })

  if (error) return { posts: [], error: error.message }

  return {
    posts: (data ?? [])
      .map(normalizeAdminNewsPost)
      .filter((post): post is AdminNewsPost => post !== null),
    error: null,
  }
}

function normalizeAdminNewsPost(row: Record<string, unknown>): AdminNewsPost | null {
  const id = readStringId(row.id)
  const title = readNullableString(row.title)
  const slug = readNullableString(row.slug)
  const content = readNullableString(row.content)

  if (!id || !title || !slug || !content) return null

  return {
    id,
    title,
    slug,
    excerpt: readNullableString(row.excerpt),
    content,
    cover_image_url: readNullableString(row.cover_image_url),
    status: normalizeNewsStatus(row.status),
    category: readNullableString(row.category),
    author_name: readNullableString(row.author_name),
    published_at: readNullableString(row.published_at),
    created_at: readNullableString(row.created_at),
    updated_at: readNullableString(row.updated_at),
  }
}

export function normalizeNewsStatus(value: unknown): NewsStatus {
  return value === "published" || value === "archived" ? value : "draft"
}
