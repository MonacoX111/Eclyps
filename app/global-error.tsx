"use client"

import "./globals.css"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="uk">
      <body className="bg-background font-sans text-foreground antialiased">
        <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-16 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(0.78_0.18_165_/_0.16),transparent_38%),radial-gradient(circle_at_bottom,oklch(0.54_0.18_260_/_0.12),transparent_34%)]" />
          <div className="relative z-10 mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-black/45 p-8 shadow-[0_0_60px_oklch(0.78_0.18_165_/_0.12)] backdrop-blur md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">
              Eclyps failsafe
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-foreground md:text-5xl">
              Сайт тимчасово недоступний
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/65 md:text-base">
              Сталася критична помилка інтерфейсу. Спробуй перезавантажити сторінку або повернутися на головну.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-primary/90"
              >
                Спробувати ще раз
              </button>
              <a
                href="/"
                className="rounded-full border border-primary/25 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/10"
              >
                На головну
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
