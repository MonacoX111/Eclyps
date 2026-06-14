# Eclyps Deployment Checklist

Use this checklist before every production deploy.

## 1. Environment variables

Add these required variables in Vercel production settings:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD_HASH=
ADMIN_SESSION_SECRET=
```

Recommended production variables:

```txt
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_INSTAGRAM_URL=
```

Security rules:

- Do not add `ADMIN_PASSWORD` in production. Use `ADMIN_PASSWORD_HASH` only.
- Keep `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`, and `ADMIN_SESSION_SECRET` server-only.
- `ADMIN_SESSION_SECRET` must be at least 32 characters.
- No AI-related environment variables are required.

## 2. Supabase configuration

Before deploy, confirm:

- Supabase migrations are applied.
- RLS policies are enabled as expected.
- Discord OAuth provider is configured in Supabase Auth.
- Supabase Auth redirect URLs include:
  - your production domain;
  - `/auth/callback`;
  - the local dev URL if needed.
- Storage/avatar URLs used by players, teams, tournaments, and news are publicly readable where the UI expects public images.

## 3. Pre-build checks

Run locally or in CI:

```bash
npm install
npm run qa:smoke
npm run build
```

If the build fails, copy the full terminal output and fix the first TypeScript/Next error before retrying.

## 4. Production smoke test

After deploy, test:

- Homepage loads and shows active tournament content.
- Discord login works and returns through `/auth/callback`.
- Account dashboard opens for a logged-in user.
- Tournament registration flow works.
- Check-in flow works.
- Match detail page loads and dispute form is reachable.
- Admin login works.
- Admin applications filter changes the list without reloading/resetting the tab.
- News list and news detail pages load.
- `/sitemap.xml` and `/robots.txt` open successfully.

## 5. Rollback trigger

Rollback if any of these happen after deploy:

- Login/callback redirects loop or fail for normal users.
- Admin login or admin mutations stop working.
- Registration/check-in actions fail for valid users.
- Public pages return 500 errors.
- Supabase server key or admin secrets were accidentally exposed.
