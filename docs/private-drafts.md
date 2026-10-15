# Private drafts and recovery

Editing `/create` or an owned tab creates a private working copy. Incomplete
titles, metadata, sections, and music can all be saved. Published tabs, search,
statistics, screenshots, and public profiles change only after explicit
publication. The Drafts dialog on `/profile/tabs/filters` lists account drafts
and browser recovery copies.

## Persistence

- Every document change writes a versioned browser recovery record immediately.
  Each editor instance has its own writer ID, so multiple tabs cannot overwrite
  each other's recovery records.
- Signed-in editors debounce account saves for 1.2 seconds, with a five-second
  maximum wait. One request runs at a time. Edits made during a request are sent
  afterward using the acknowledged revision.
- Failed requests retry with exponential backoff, up to 30 seconds, and on
  reconnection. A stable mutation ID makes a lost-response retry idempotent.
- All draft endpoints require authentication, scope database queries to the
  authenticated owner, and return private, non-cacheable responses. Client query
  keys and browser records are also scoped by account.
- Revision conflicts pause account writes. Users can load the account version
  while retaining their local copy, or recover their edits as a separate draft.
- Draft publication and draft consumption run in one database transaction.
  Tombstones prevent delayed saves from reviving discarded or published drafts.
  Replaying a successful publication returns the existing tab without repeating
  public counts or screenshot work.
- Edits to published tabs retain their base publication timestamp. Publishing
  against a changed public version fails without consuming the private draft.

Guest drafts stay in the browser. The guest draft active in the same browser tab
is handed to the signed-in account after sign-in. Other guest drafts can be
copied explicitly from the Drafts dialog on My Tabs. Account drafts never become guest
drafts on sign-out or move to another account automatically.

Refresh resumes the active editor's recovery copy. The dialog can also reopen
copies, recover a draft as a new tab, and discard individual copies. Invalid
browser records are preserved for recovery. The old
`autostrum-tabData` snapshot migrates to a guest recovery record and is removed
only after its replacement is durably written.

If browser storage fails, the editor shows a warning and prevents an unnoticed
unload until account sync succeeds. Browser copies are lost if site storage is
cleared; account sync provides recovery beyond that browser.

## Deployment and verification

The migration is `20261014000000_private_tab_drafts`. Deploy it through the
normal release process before releasing the new account endpoints. Generate
the Prisma client with `npx prisma generate`. Local verification does not
require migrating the shared remote database.

Run `node scripts/verifyPrivateDrafts.mjs` for isolated checks of the actual
storage code, save coordinator, authentication middleware, draft router, and
publication routes. The script substitutes an in-memory database and external
service stubs; it does not access shared services.

Browser checks: edit an unfinished tab, refresh, open the Drafts dialog on My Tabs,
recover a copy and refresh its URL, create another draft, and verify that the
original remains intact. Check narrow layouts and storage failures. With a
migrated development database, also check cross-device recovery, sign-in
handoff, account switching, simultaneous editors, and publication conflicts.
