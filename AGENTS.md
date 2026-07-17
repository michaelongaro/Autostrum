# AGENTS.md

## Cursor Cloud specific instructions

Autostrum is a single Next.js 16 (Pages Router) T3-stack app at the repo root — there is no monorepo and no local service orchestration. Dependencies install with `npm install` (its `postinstall` runs `prisma generate`).

### Services and how they run
- **Web app (dev):** `npm run dev` (Next.js dev server on Turbopack, serves on port 3000). This is the only long-running service you start locally.
- **PostgreSQL:** provided remotely via the `DATABASE_URL` secret (a hosted Railway Postgres). There is no local database to provision or start — do not install Postgres. The schema is already migrated; `npx prisma migrate status` should report "up to date".
- **Clerk (auth), AWS S3 (screenshots), and the external screenshot server:** all external SaaS configured entirely through injected secrets. The Clerk instance is a `pk_test_` dev instance.

### Environment variables / secrets
All env vars validated in `src/env.js` (`DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CRON_SECRET`, `SCREENSHOT_SERVER_URL`, `SCREENSHOT_SECRET`, `NEXT_PUBLIC_DOMAIN_URL`) are injected as Cloud Agent secrets and are required for the app to boot. If any are missing, boot fails env validation; you can set `SKIP_ENV_VALIDATION=true` to bypass validation for build-only checks, but the app needs a real `DATABASE_URL` to serve data.

### Lint / test / build
- **Lint:** `npm run lint` (`eslint .`). Note: the repo currently has many pre-existing lint errors/warnings unrelated to setup — a non-zero result is expected and is not a regression.
- **Tests:** there is no automated test suite (no `test` script, no Jest/Vitest). The only verification helper is `node scripts/verifyStaticTabVirtualization.mjs` (Playwright, requires the dev server running).
- **Build:** `npm run build` runs `prisma generate && prisma migrate deploy && next build`. Caution: `migrate deploy` targets the shared remote `DATABASE_URL`; prefer `npm run dev` for local verification and avoid running the full build unless necessary. `next.config.js` sets `typescript.ignoreBuildErrors: true`.

### Gotchas
- `.npmrc` sets `force=true`, so `npm install` prints "Recommended protections disabled" — expected.
- Installing with a different npm version than the committed lockfile can produce spurious `package-lock.json` diffs (e.g. removed `libc` fields); revert those rather than committing them.
- Since the database and Clerk are shared remote/dev instances, data created during testing (tabs, users) persists remotely.
