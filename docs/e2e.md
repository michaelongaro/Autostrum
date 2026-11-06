# Local tab lifecycle check

Run `npm run test:e2e` manually whenever you want to check the tab lifecycle.
It is not part of CI/CD or the Vercel build.

The App Router smoke tests check client navigation, back/forward history, direct loads,
metadata, Route Handler validation, and signed-out API/profile access. Scroll tests
cover desktop/mobile page navigation, cached routes, back/forward restoration,
hash links, and filter changes that preserve scroll. These checks do not create or
modify tabs; visiting a published tab can update its normal page-view counters.

Console regression checks cover public routes, search filters/layouts, practice,
tool sliders, editor accordions, and signed-in profiles (when the test account is
configured). Run them with `npm run test:e2e -- navigation-console.spec.ts`.
They check caught console errors and component warnings as well as uncaught
exceptions; Clerk's normal development-key notice is expected. Offline avatar
fallback checks run with `node scripts/verifyProfileImages.mjs`.

The tab lifecycle test signs in, creates and publishes a tab in the editor, verifies
its row and note data directly in PostgreSQL, deletes it through the editor's
confirmation dialog, and verifies the row no longer exists.
It uses a unique title for every run and checks the signed-in owner's ID.
On failure it attempts to delete that run's remaining tab through the authenticated
app API. It also removes this run's draft recovery records from the database.
A failed UI assertion stays failed even if cleanup succeeds.

## One-time setup

Install dependencies and Chromium:

```sh
npm install
npx playwright install chromium
```

The config loads Next.js's local environment files, so the app's existing `.env`
credentials can be reused. Add the test account email to `.env.local` (ignored by
Git):

```dotenv
E2E_CLERK_USER_EMAIL=your-test-account@example.com
```

Use an existing account that has completed Autostrum's username setup.
`DATABASE_URL`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` must
match the running app's database and Clerk instance. The Clerk testing helper
signs in the account using a server-side token, so no password or manual
verification code is needed.

## Run the test

Start the app and leave it running:

```sh
npm run dev
```

Once the app is ready, run the test in another terminal:

```sh
npm run test:e2e
```

The default URL is `http://localhost:3000`. If the app is running on another local
port, set `E2E_BASE_URL` in `.env.local`, for example:

```dotenv
E2E_BASE_URL=http://localhost:3001
```

Test discovery without signing in or touching the database:

```sh
npm run test:e2e -- --list
```

The local HTML report is in `playwright-report/`. Failure screenshots are in
`test-results/`. Authentication state and traces are not saved.

The test makes real writes to the configured database, and normal publishing also
requests a screenshot. Cleanup targets only the unique title and authenticated
owner for the current run. A forcibly terminated test cannot finish cleanup;
failed logs identify the run's tab title.
