"use client"

import { useState } from "react"
import { updateOwnPlayerProfile } from "@/app/account/actions"

type EditProfileFormProps = {
  initialNickname: string | null
  initialRealName: string | null
  initialRegion: string | null
}

export function EditProfileForm({
  initialNickname,
  initialRealName,
  initialRegion,
}: EditProfileFormProps) {
  const [nickname, setNickname] = useState(initialNickname || "")
  const [realName, setRealName] = useState(initialRealName || "")
  const [region, setRegion] = useState(initialRegion || "")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    setError(null)

    const formData = new FormData()
    formData.append("nickname", nickname)
    formData.append("real_name", realName)
    formData.append("region", region)

    try {
      const res = await updateOwnPlayerProfile(formData)
      if (res.ok) {
        setSuccess(true)
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(res.error || "Failed to update profile.")
      }
    } catch (err) {
      setError("An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const inputClassName =
    "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500/60"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-lg font-bold tracking-wide text-white">Edit Profile Details</h3>

      {success && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-200">
          Your profile has been securely updated successfully! Changes synced to registered tournaments.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
          Error: {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
          <span>Public Nickname / Display Name</span>
          <input
            type="text"
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter public nickname..."
            className={inputClassName}
          />
        </label>

        <label className="space-y-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
          <span>Real Name (Optional)</span>
          <input
            type="text"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            placeholder="Enter real name..."
            className={inputClassName}
          />
        </label>
      </div>

      <label className="space-y-2 block text-xs font-semibold uppercase tracking-wider text-white/60">
        <span>Region / Country</span>
        <input
          type="text"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="e.g. EU, NA, Ukraine, USA..."
          className={inputClassName}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto rounded-full bg-emerald-400 px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)] hover:scale-102 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {loading ? "Saving Changes..." : "Save Profile Details"}
      </button>
    </form>
  )
}
