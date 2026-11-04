# Deployed tab lifecycle check

`npm run test:e2e` uses Playwright to sign in, create and publish a tab in the
editor, verify its row and note data directly in PostgreSQL, delete it through
the editor's confirmation dialog, and verify the row no longer exists.
It uses a unique title for every run and checks the signed-in owner's ID.
On failure it attempts to delete that run's remaining tab through the authenticated
app API. It also removes this run's draft recovery records from the database.
A failed UI assertion stays failed even if cleanup succeeds.

## Vercel and GitHub Actions

The workflow in `.github/workflows/tab-lifecycle.yml` runs after a successful
Vercel Git deployment using GitHub's `deployment_status` event. It checks out the
deployed commit and tests that deployment's URL. It does not rebuild the app,
run migrations, or start another server.

An npm `postbuild` hook executes while Vercel is still building, before that
deployment is available. Testing the actual deployed app belongs after deployment;
Vercel and Playwright both document GitHub Actions for this:

- [Vercel post-deployment E2E testing](https://vercel.com/kb/guide/how-can-i-run-end-to-end-tests-after-my-vercel-preview-deployment)
- [Playwright deployment-status workflow](https://playwright.dev/docs/ci#on-deployment)

### One-time configuration

1. Add this workflow to the repository's default branch so GitHub receives the
   deployment events. The project must use Vercel's GitHub integration.
2. Create GitHub Actions environments named `e2e-preview` and `e2e-production`.
   The workflow selects one using the deployment's `production_environment` flag.
3. Add these environment secrets, matching **that deployment's** database and
   Clerk instance:

   | Secret                              | Value                                                                             |
   | ----------------------------------- | --------------------------------------------------------------------------------- |
   | `DATABASE_URL`                      | Connection string for the deployed app's database, reachable from GitHub runners. |
   | `CLERK_SECRET_KEY`                  | Secret key for the app's Clerk instance.                                          |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Publishable key for that same instance.                                           |
   | `E2E_CLERK_USER_EMAIL`              | Existing account email, with Autostrum username setup completed.                  |
   | `VERCEL_AUTOMATION_BYPASS_SECRET`   | Required only when Vercel Deployment Protection is enabled.                       |

   Repository secrets can be used instead if both environments share the same
   database and Clerk instance. Vercel environment variables are not automatically
   copied to GitHub Actions. If any required value is missing, the workflow logs a
   warning and skips the E2E execution instead of failing that deployment check.

4. Trigger a new deployment and look for **Deployed tab lifecycle** in Actions.

[Clerk's testing helper](https://clerk.com/docs/guides/development/testing/playwright/test-helpers)
signs in the existing account using a server-side token, so no stored password or
manual verification code is needed. Use a dedicated test account where possible.
The test makes real writes to the configured database, and normal publishing also
requests a screenshot. Cleanup targets only the unique title and authenticated
owner for the current run. A forcibly terminated runner cannot finish cleanup;
failed logs identify the run's tab title.

For protected deployments, create an automation bypass secret in Vercel's
Deployment Protection settings and copy it to the GitHub environment. The test
only sends the bypass header to the app's own origin. See
[Vercel's automation bypass documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

This is a **post-deployment check**. A failing run fails the GitHub job; it does
not roll back a deployment or prevent production traffic. To gate production
promotion, configure a staged deployment plus Vercel Deployment Checks separately.

## Run locally

Install dependencies and Chromium once:

```sh
npm install
npx playwright install chromium
```

Start the app with `npm run dev`, then in another terminal set
`E2E_CLERK_USER_EMAIL` and run `npm run test:e2e`. The config loads Next.js's local
environment files, so the existing `.env` credentials can be reused. You can put
the account email in `.env.local` (ignored by Git). Set `E2E_BASE_URL` to test an
already deployed URL; otherwise it defaults to `http://localhost:3000`.

Test discovery without signing in or touching the database:

```sh
npm run test:e2e -- --list
```

The local HTML report is in `playwright-report/`. Failure screenshots are in
`test-results/`. Authentication state and traces are not saved, and the workflow
does not upload artifacts containing authenticated browser data.
