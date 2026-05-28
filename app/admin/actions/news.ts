"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { logMutationError } from "@/lib/admin/errors"
import { normalizeNewsStatus } from "@/lib/admin/news"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parseRequiredIdFormData } from "./parsers"
import { requireAdminSession, runSupabaseMutation } from "./shared"

const newsPostSchema = z.object({
  title: requiredString(),
  slug: slugString(),
  excerpt: optionalString(),
  content: requiredString(),
  cover_image_url: optionalString(),
  category: optionalString(),
  author_name: optionalString(),
  status: z.enum(["draft", "published", "archived"]),
  published_at: optionalDateTime(),
})

type NewsPostInput = z.infer<typeof newsPostSchema>

export async function createNewsPost(formData: FormData) {
  await requireAdminSession()
  const parsed = parseNewsPostFormData(formData)
  if (!parsed.ok) redirect(`/admin?newsError=${parsed.error}#news`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?newsError=admin-client-unavailable#news")

  const { error } = await runSupabaseMutation("create news post", () =>
    supabaseAdmin.from("news_posts").insert(withPublishTimestamp(parsed.data)),
  )
  if (error) {
    logMutationError("create news post", error)
    redirect("/admin?newsError=mutation-failed#news")
  }

  revalidateNewsPaths()
  redirect("/admin?newsSuccess=created#news")
}

export async function updateNewsPost(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  const parsed = parseNewsPostFormData(formData)
  if (!parsedId.ok) redirect("/admin?newsError=missing-id#news")
  if (!parsed.ok) redirect(`/admin?newsError=${parsed.error}#news`)

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?newsError=admin-client-unavailable#news")

  const { error } = await runSupabaseMutation("update news post", () =>
    supabaseAdmin
      .from("news_posts")
      .update(withPublishTimestamp(parsed.data))
      .eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("update news post", error)
    redirect("/admin?newsError=mutation-failed#news")
  }

  revalidateNewsPaths(parsed.data.slug)
  redirect("/admin?newsSuccess=updated#news")
}

export async function publishNewsPost(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?newsError=missing-id#news")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?newsError=admin-client-unavailable#news")

  const { error } = await runSupabaseMutation("publish news post", () =>
    supabaseAdmin
      .from("news_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("publish news post", error)
    redirect("/admin?newsError=mutation-failed#news")
  }

  revalidateNewsPaths()
  redirect("/admin?newsSuccess=published#news")
}

export async function archiveNewsPost(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?newsError=missing-id#news")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?newsError=admin-client-unavailable#news")

  const { error } = await runSupabaseMutation("archive news post", () =>
    supabaseAdmin
      .from("news_posts")
      .update({ status: "archived" })
      .eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("archive news post", error)
    redirect("/admin?newsError=mutation-failed#news")
  }

  revalidateNewsPaths()
  redirect("/admin?newsSuccess=archived#news")
}

export async function deleteNewsPost(formData: FormData) {
  await requireAdminSession()
  const parsedId = parseRequiredIdFormData(formData, "missing-id")
  if (!parsedId.ok) redirect("/admin?newsError=missing-id#news")

  const supabaseAdmin = createSupabaseAdminClient()
  if (!supabaseAdmin) redirect("/admin?newsError=admin-client-unavailable#news")

  const { data: existingPost, error: lookupError } = await supabaseAdmin
    .from("news_posts")
    .select("status")
    .eq("id", parsedId.data.id)
    .maybeSingle()

  if (lookupError) {
    logMutationError("lookup news post", lookupError)
    redirect("/admin?newsError=mutation-failed#news")
  }

  const isPublished = normalizeNewsStatus(existingPost?.status) === "published"
  const confirmed = formData.get("confirm_delete_published") === "on"
  if (isPublished && !confirmed) {
    redirect("/admin?newsError=confirm-published-delete#news")
  }

  const { error } = await runSupabaseMutation("delete news post", () =>
    supabaseAdmin.from("news_posts").delete().eq("id", parsedId.data.id),
  )
  if (error) {
    logMutationError("delete news post", error)
    redirect("/admin?newsError=mutation-failed#news")
  }

  revalidateNewsPaths()
  redirect("/admin?newsSuccess=deleted#news")
}

function parseNewsPostFormData(
  formData: FormData,
): { ok: true; data: NewsPostInput } | { ok: false; error: string } {
  const result = newsPostSchema.safeParse(Object.fromEntries(formData.entries()))
  if (result.success) return { ok: true, data: result.data }

  const field = result.error.issues[0]?.path[0]
  const error =
    {
      title: "invalid-title",
      slug: "invalid-slug",
      content: "invalid-content",
      status: "invalid-status",
      published_at: "invalid-published-at",
    }[String(field)] ?? "invalid-form"

  return { ok: false, error }
}

function withPublishTimestamp(data: NewsPostInput) {
  return {
    ...data,
    published_at:
      data.status === "published"
        ? data.published_at ?? new Date().toISOString()
        : data.published_at,
  }
}

function revalidateNewsPaths(slug?: string) {
  revalidatePath("/admin")
  revalidatePath("/news")
  if (slug) revalidatePath(`/news/${slug}`)
}

function requiredString() {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1),
  )
}

function slugString() {
  return z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  )
}

function optionalString() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const trimmedValue = value.trim()
      return trimmedValue.length > 0 ? trimmedValue : null
    },
    z.string().nullable(),
  )
}

function optionalDateTime() {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return null

      const trimmedValue = value.trim()
      if (trimmedValue.length === 0) return null

      const date = new Date(trimmedValue)
      return Number.isNaN(date.getTime()) ? trimmedValue : date.toISOString()
    },
    z
      .string()
      .refine((value) => !Number.isNaN(new Date(value).getTime()))
      .nullable(),
  )
}
