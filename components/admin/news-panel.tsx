import type { AdminNewsPost, NewsStatus } from "@/lib/admin/news"
import type { AdminFeedback, AdminFormAction } from "@/lib/admin/types"
import {
  archiveNewsPost,
  createNewsPost,
  deleteNewsPost,
  publishNewsPost,
  updateNewsPost,
} from "@/app/admin/actions/news"
import {
  AdminEmptyState,
  AdminSection,
  innerPanelClassName,
  panelGridClassName,
  pillClassName,
  recordClassName,
} from "@/components/admin/admin-section"
import { AdminField, inputClassName, SubmitButton } from "@/components/admin/admin-form-fields"

const categories = ["announcement", "tournament", "update", "patch_notes"]

export function NewsPanel({
  posts,
  fetchError,
  feedback,
}: {
  posts: AdminNewsPost[]
  fetchError: string | null
  feedback: AdminFeedback | null
}) {
  return (
    <AdminSection
      id="news"
      title="News"
      description="Create and manage public announcements, tournament news, updates, and articles."
      feedback={feedback}
      fetchError={fetchError}
      fetchLabel="news posts"
    >
      <div className={panelGridClassName}>
        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Create post</h3>
          <NewsForm action={createNewsPost} submitLabel="Create post" />
        </article>

        <article className={innerPanelClassName}>
          <h3 className="text-lg font-medium">Existing posts</h3>
          {posts.length === 0 ? (
            <AdminEmptyState>No news posts exist in Supabase yet.</AdminEmptyState>
          ) : (
            <div className="mt-4 space-y-4">
              {posts.map((post) => (
                <NewsRecord key={post.id} post={post} />
              ))}
            </div>
          )}
        </article>
      </div>
    </AdminSection>
  )
}

function NewsRecord({ post }: { post: AdminNewsPost }) {
  return (
    <details className={recordClassName}>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="break-words font-medium">{post.title}</h4>
            <p className="mt-1 break-words text-sm text-white/55">/{post.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={pillClassName}>{post.status}</span>
            {post.category && <span className={pillClassName}>{post.category}</span>}
            {post.published_at && <span className={pillClassName}>{formatAdminDate(post.published_at)}</span>}
          </div>
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <NewsForm action={updateNewsPost} submitLabel="Save changes" post={post} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {post.status !== "published" && <SimplePostAction action={publishNewsPost} id={post.id} label="Publish" />}
          {post.status !== "archived" && <SimplePostAction action={archiveNewsPost} id={post.id} label="Archive" />}
          <DeleteNewsForm post={post} />
        </div>
      </div>
    </details>
  )
}

function NewsForm({
  action,
  submitLabel,
  post,
}: {
  action: AdminFormAction
  submitLabel: string
  post?: AdminNewsPost
}) {
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      {post && <input type="hidden" name="id" value={post.id} />}
      <AdminField label="Title">
        <input name="title" defaultValue={post?.title ?? ""} required className={inputClassName} />
      </AdminField>
      <AdminField label="Slug">
        <input
          name="slug"
          defaultValue={post?.slug ?? ""}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          placeholder="major-update"
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Category">
        <input
          name="category"
          list="news-categories"
          defaultValue={post?.category ?? ""}
          placeholder="announcement"
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Author">
        <input name="author_name" defaultValue={post?.author_name ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Status">
        <NewsStatusSelect value={post?.status} />
      </AdminField>
      <AdminField label="Published at">
        <input
          name="published_at"
          type="datetime-local"
          defaultValue={toDateTimeLocalValue(post?.published_at)}
          className={inputClassName}
        />
      </AdminField>
      <AdminField label="Cover image URL">
        <input name="cover_image_url" defaultValue={post?.cover_image_url ?? ""} className={inputClassName} />
      </AdminField>
      <AdminField label="Excerpt">
        <textarea name="excerpt" defaultValue={post?.excerpt ?? ""} rows={3} className={inputClassName} />
      </AdminField>
      <label className="space-y-2 text-sm text-white/75 sm:col-span-2">
        <span className="block">Content</span>
        <textarea
          name="content"
          defaultValue={post?.content ?? ""}
          required
          rows={10}
          className={inputClassName}
        />
      </label>
      <datalist id="news-categories">
        {categories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <SubmitButton label={submitLabel} />
    </form>
  )
}

function NewsStatusSelect({ value = "draft" }: { value?: NewsStatus }) {
  return (
    <select name="status" defaultValue={value} className={inputClassName}>
      <option value="draft">Draft</option>
      <option value="published">Published</option>
      <option value="archived">Archived</option>
    </select>
  )
}

function SimplePostAction({
  action,
  id,
  label,
}: {
  action: AdminFormAction
  id: string
  label: string
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="w-full rounded-xl border border-emerald-300/20 px-4 py-3 text-sm text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-300/10"
      >
        {label}
      </button>
    </form>
  )
}

function DeleteNewsForm({ post }: { post: AdminNewsPost }) {
  return (
    <form action={deleteNewsPost} className="space-y-3">
      <input type="hidden" name="id" value={post.id} />
      {post.status === "published" && (
        <label className="flex items-start gap-2 text-xs leading-5 text-white/60">
          <input name="confirm_delete_published" type="checkbox" className="mt-1" />
          Confirm published delete
        </label>
      )}
      <button
        type="submit"
        className="w-full rounded-xl border border-red-300/20 px-4 py-3 text-sm text-red-100 transition hover:border-red-300/40 hover:bg-red-300/10"
      >
        Delete
      </button>
    </form>
  )
}

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toISOString().slice(0, 16)
}

function formatAdminDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}
