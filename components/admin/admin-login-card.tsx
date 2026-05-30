import { loginAdmin } from "@/app/admin/actions"
import { AdminLoginForm } from "@/app/admin/login-form"
import type { AdminAuthHealth } from "@/lib/admin/types"
import { useLanguage } from "@/components/language-provider"

export function AdminLoginCard({
  error,
  health,
  retryAfter,
}: {
  error?: string
  health: AdminAuthHealth | null
  retryAfter?: string
}) {
  const { t } = useLanguage()

  return (
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.28em] text-emerald-300/80">
        {t.admin.subtitle}
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-white">
        {t.admin.login.title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-white/60">
        {t.admin.login.desc}
      </p>

      <AdminLoginForm
        action={loginAdmin}
        error={error}
        health={health}
        retryAfter={retryAfter}
      />
    </section>
  )
}
