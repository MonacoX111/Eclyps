# Eclyps

Eclyps is a competitive esports tournament platform built with Next.js, TypeScript, Supabase, and Vercel. It includes public tournament pages, match schedules, brackets, player and team profiles, registrations, check-ins, notifications, and an admin dashboard for managing tournaments.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Supabase Postgres, Auth, RLS
- Tailwind CSS
- Vercel Analytics

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Fill `.env.local` with your real Supabase and admin values. Do not commit `.env.local`.

Run the development server:

```bash
npm run dev
```

Open the local URL shown in the terminal.

## Environment Variables

Copy `.env.example` to `.env.local` for local development and add the same production values in Vercel.

Required in production:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
```

Recommended in production:

```txt
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_INSTAGRAM_URL=
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`, and `ADMIN_SESSION_SECRET` are server-only secrets. Never expose them in client code.
- `ADMIN_PASSWORD_HASH` must use the `pbkdf2_sha256$iterations$salt$base64url-hash` format.
- `ADMIN_SESSION_SECRET` must be at least 32 characters.
- `ADMIN_PASSWORD` may be used only for local development and must not be set in production.
- No AI-related environment variables are required.

## Scripts

```bash
npm run dev
```

Starts the local Next.js development server.

```bash
npm run build
```

Builds the production app.

```bash
npm run start
```

Starts the production build locally.

```bash
npm run lint
```

Runs ESLint.

```bash
npm run qa:smoke
```

Runs lightweight project checks for critical tournament, bracket, invite, match-page, and debug-log behavior.

## Project Structure

```txt
app/                  Next.js app routes, pages, API routes, and server actions
components/           Shared UI and admin UI components
lib/                  Data loaders, auth, admin helpers, Supabase clients, utilities
scripts/              Local QA and maintenance scripts
supabase/migrations/  Database schema migrations
supabase/seed/        Seed data
public/               Static assets
```

## Core Features

- Public homepage with active tournament, matches, teams, players, and results
- Tournament archive and tournament detail pages
- Match detail pages with broadcast links, disputes, and brackets
- Public bracket rendering
- Team and player profile pages
- Discord login and player onboarding
- Tournament registration and check-in flow
- Team invites, join requests, and team roles
- Admin dashboard for tournaments, participants, matches, brackets, results, disputes, news, teams, and players
- Notifications system
- Ukrainian and English UI support

## Database

Database changes live in `supabase/migrations`.

Apply migrations through your Supabase workflow before deploying code that depends on new tables or columns.

Important data model areas:

- `tournaments`
- `players`
- `teams`
- `team_members`
- `participants`
- `matches`
- `results`
- `tournament_registrations`
- `team_invites`
- `team_join_requests`
- `notifications`
- `news_posts`

## Admin Auth

Production admin login uses:

- `ADMIN_PASSWORD_HASH`
- `ADMIN_SESSION_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

Use a hashed admin password in production. Do not deploy a plain admin password.

## Deployment

The project is intended for Vercel deployment.

Before deploying:

1. Add all required environment variables in Vercel.
2. Confirm Supabase Auth redirect URLs include your production domain and `/auth/callback`.
3. Apply Supabase migrations.
4. Run `npm run qa:smoke`.
5. Run `npm run build`.
6. Smoke-test Discord login, account dashboard, admin login, tournament registration, check-in, match detail, and news pages.

See `docs/deployment-checklist.md` for the full pre-launch checklist.

## Notes

- Match scheduling is timezone-aware and uses `Europe/Kyiv` as the default tournament match timezone.
- `.env.example` is a safe template. `.env.local` contains real local secrets and must stay private.
- Keep debug `console.log` calls out of `app`, `components`, and `lib`; `qa:smoke` checks for this.
