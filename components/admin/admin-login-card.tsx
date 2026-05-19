import { loginAdmin } from "@/app/admin/actions"
import { AdminLoginForm } from "@/app/admin/login-form"

export function AdminLoginCard({ error }: { error?: string }) {
  return (
    <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.28em] text-emerald-300/80">
        Eclyps Admin
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-white">Admin access</h1>
      <p className="mt-2 text-sm leading-6 text-white/60">
        Enter the admin password to continue.
      </p>

      <AdminLoginForm action={loginAdmin} error={error} />
    </section>
  )
}
