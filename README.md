# Eclyps

Eclyps is a competitive esports tournament platform built with Next.js, TypeScript, Supabase, and Vercel. It includes public tournament pages, match schedules, brackets, player and team profiles, registrations, check-ins, notifications, and an admin dashboard for managing tournaments.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Supabase Postgres, Auth, RLS
- Tailwind CSS
- Vercel Analytics
- Google Gemini API for the optional AI assistant

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

Required:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
```

Recommended:

```txt
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_INSTAGRAM_URL=
```

Optional:

```txt
GEMINI_API_KEY=
```

`GEMINI_API_KEY` is only needed for the AI assistant. The rest of the site can run without it.

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
2. Apply Supabase migrations.
3. Run `npm run qa:smoke`.
4. Run `npm run build`.

## Notes

- Match scheduling is timezone-aware and uses `Europe/Kyiv` as the default tournament match timezone.
- `.env.example` is a safe template. `.env.local` contains real local secrets and must stay private.
- Keep debug `console.log` calls out of `app`, `components`, and `lib`; `qa:smoke` checks for this.
