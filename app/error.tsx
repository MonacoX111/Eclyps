"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-foreground">
      <div>
        <p className="mb-3 text-sm font-semibold tracking-widest uppercase text-primary">
          Eclyps Hub
        </p>
        <h1 className="text-2xl font-bold">Something went wrong.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Please try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full border border-primary/30 px-5 py-2 text-sm text-primary transition hover:border-primary/60"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
