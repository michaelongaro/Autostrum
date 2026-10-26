# Database and data fetching audit

Audited October 26, 2026, on `audit/database-data-fetching`, starting from `e60aafff`.

## Environment and evidence

Used the repository's configured Railway **dev database**, with the local domain and Clerk test instance verified before applying a migration. No production database connection, full production build, Clerk write, or S3 write was used for verification.

The initial read-only snapshot contained 71 tabs, 33 users, 5 artists, 13 bookmarks, 3 ratings, and 15 private drafts. All 32 existing migrations were applied. The audit found:

- Four users whose stored counters disagreed with their source rows.
- Three daily view records referring to deleted tabs.
- One weekly user view record referring to a deleted user.
- No invalid rating/difficulty values, bookmark recipient mismatch, or tab/artist aggregate drift.
- No browse-sort or reverse foreign-key indexes beyond the existing primary/unique keys and full-text/trigram indexes.

Migration `20261026000000_database_fetch_audit` was applied to dev. All ten checks in `node scripts/auditDatabase.mjs` now pass, including full-text vector consistency. Public content and private draft row counts are unchanged. The migration removes only orphaned ephemeral tracking records and repairs derived counters from authoritative rows.

## Implemented fixes

| Priority | Finding                                                                                                                                                             | Result                                                                                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Bookmark lists could be fetched for arbitrary user IDs; public user metadata included their saved tab IDs.                                                          | Bookmark searches require the authenticated owner. User metadata includes bookmark IDs only for that owner.                                                                                                 |
| High     | Page views, ratings, and bookmarks trusted client-supplied creator/artist IDs.                                                                                      | Resolve recipients from the tab or existing bookmark. Legacy input fields remain accepted for compatibility.                                                                                                |
| High     | Multi-step engagement writes could partially commit, double-count duplicate views, or lose concurrent ratings.                                                      | Serializable transactions retry write conflicts, including Prisma 7 raw SQL conflicts. Unique daily views gate increments atomically; bookmarks are idempotent; ratings derive aggregates from source rows. |
| High     | Publishing and artist reassignment updated counters outside the publication transaction.                                                                            | Counter changes commit with the tab and draft publication. Replayed publications do not increment twice.                                                                                                    |
| High     | Account deletion deleted the user before querying their tabs/bookmarks/ratings. Cascades and `SetNull` erased the information needed for cleanup and recalculation. | Capture affected rows first, then delete or preserve tabs and recompute recipients inside one transaction. External cleanup starts after commit.                                                            |
| High     | Tab deletion left artist totals stale and could fail when comments existed.                                                                                         | Delete with counter recalculation and pinned-tab cleanup in one transaction. Comments/replies and tracking rows cascade.                                                                                    |
| Medium   | Engagement updates changed `Tab.updatedAt`, invalidating private drafts' base versions without any document edit.                                                   | Update engagement fields without changing the published document version. Full-text indexing also runs only when title, description, or artist changes.                                                     |
| Medium   | Bookmark date sorting happened in JavaScript after a page had already been selected by tab creation date.                                                           | Order bookmarks in SQL before `skip`/`take`. Add unique ID tie breakers to browse and relevance results. Reject negative/fractional pagination values.                                                      |
| Medium   | Ordinary tab searches fetched bookmark rows even without a bookmark filter.                                                                                         | Select only card metadata; bookmark-date searches read their owner-scoped bookmark relation. Public search responses contain no bookmark rows.                                                              |
| Medium   | Recent/popular discovery queries ran sequentially. Initial search queries could run before URL filters or the bookmark owner were ready.                            | Start independent discovery reads together and gate initial search queries on parsed filters and the required identity.                                                                                     |
| Medium   | A module-global React Query client could be reused across server requests and account transitions.                                                                  | Construct a client per tRPC provider and mount a fresh provider when the Clerk user changes.                                                                                                                |
| Medium   | Sitemap requests disconnected the shared Prisma client.                                                                                                             | Leave shared connection lifecycle management with the application.                                                                                                                                          |
| Medium   | Weekly refresh assumed snapshot IDs 1–5 existed and read counters before its write/reset transaction.                                                               | Read, replace snapshots, and reset counters in one serializable transaction. Works with deleted slots and fewer than five eligible records. Preserve featured-user rank when fetching profile data.         |
| Low      | Statistics mapped difficulty 1 to “Easy,” omitted difficulty 5, and shifted capo frets by one.                                                                      | Use the actual 1–5 difficulty scale and the saved capo fret.                                                                                                                                                |

The schema migration adds 18 indexes for browse ordering, creator/artist/genre filtering, bookmark date ordering, reverse relationship lookups, and weekly ranking. It adds foreign keys for daily tab views and weekly user tables, cascade behavior for comments/replies, and rating/difficulty range checks. Existing full-text and trigram indexes are preserved.

Dev `EXPLAIN (FORMAT JSON)` now selects `Tab_createdAt_id_idx` and `Tab_pageViews_id_idx` for the recent and popular lists. The earlier recent-list plan used a sequential scan plus sort. This demonstrates index use on the observed dataset; it is not a production latency benchmark.

Nullable tab authors/artists remain intentional. Private drafts remain isolated from public queries. Draft source/publication IDs remain recoverable references rather than cascading foreign keys, so deleting a source tab does not destroy the private recovery document. Duplicate artist names and the legacy artist snapshot table were retained.

## Remaining work

These are open follow-ups, not claimed as resolved by this change:

1. **Related tab generation reads the entire catalog for each ISR page.** Its ranking uses catalog-wide attribute frequencies, so replacing it with an arbitrary `take` would change recommendations. Move frequency aggregation and candidate ranking into bounded database queries or a maintained recommendation snapshot. This is the next scaling priority in `src/pages/tab/[id]/[title].tsx` and `src/utils/relatedTabs.ts`.
2. **Fuzzy search predicates call `word_similarity(...) >= threshold`.** The existing GIN indexes support trigram operators and `ILIKE`; they do not by themselves make that function comparison an index predicate. Test an operator-based candidate query with a transaction-local threshold while preserving the current matching/ranking behavior. Autocomplete joins and combined `OR` predicates also need production-sized `EXPLAIN ANALYZE` measurements.
3. **Offset pagination and exact counts still scale with deeper searches.** Tie breakers fix ambiguous ordering on an unchanged dataset. Inserts, deletes, and changing popularity between requests can still move rows between pages. Introduce keyset cursors for date/popularity lists and decide whether exact counts are necessary on every page. Count and page reads are not promised to share one snapshot.
4. **Some owner-specific lists and export paths are unbounded.** Statistics distributions, pinned-tab selection, artist lookup with `limitResults: false`, and sitemap generation should move to grouped/paginated queries as the dataset grows. Sitemap generation currently warns above 50,000 URLs but needs a real sitemap index before reaching that size.
5. **Clerk, ISR, screenshots, and PostgreSQL do not share a transaction.** Cleanup is scheduled after database commit and failures are logged. A durable outbox/retry worker is still needed for guaranteed external completion, including Clerk deletion failures. Direct Clerk-side account deletion also needs a verified webhook reconciliation path.
6. **Legacy pinned-tab IDs lack a foreign key and ownership constraint.** Existing callers use sentinel values; normalize these and enforce the chosen ownership policy before adding a relation. Comment authors likewise remain external identity references.
7. **Connection and cache budgets need workload measurements.** Production's one-connection Prisma pool can queue a batched request's database work. Tune it against Railway connection limits and deployment concurrency; avoid a blind pool-size increase. Set endpoint-specific freshness policies for public discovery data after measuring request volume.

The migration repairs existing drift once. Future direct SQL writes or external deletion paths must update aggregates transactionally or use a deliberate reconciliation job. The read-only audit is reusable for detecting divergence.

## Verification

- `npx prisma validate` and `npx prisma generate`: pass.
- `npx prisma migrate deploy` on dev: pass; 33 migrations applied and schema up to date.
- `node scripts/auditDatabase.mjs`: all ten integrity checks pass; 42 indexes present; source/content row counts unchanged.
- `node scripts/verifyDatabaseFetching.mjs --dev-database`: pass against a disposable schema in the dev database. Covers real routers, concurrent duplicate views/bookmarks and rating updates, rollback, authoritative recipients, stable document versions, bookmark pagination/privacy, invalid pagination, FTS, account/tab deletion, cascades, counters, weekly snapshot gaps, and database constraints. External services are stubbed; the disposable schema is removed in `finally`.
- `node scripts/verifyPrivateDrafts.mjs`: pass, including publication replay, optimistic conflicts, isolation, and recovery.
- Targeted ESLint on the new verification scripts and changed server/provider/page modules: pass. `SearchResults.tsx` retains its two pre-existing `set-state-in-effect` errors outside the changed query options.
- `npx tsc --noEmit --pretty false`: same 30 pre-existing diagnostics as the baseline; no new diagnostics.
- Webpack dev HTTP checks: homepage, explore, search, sitemap, recent/popular discovery, filtered search, and trending/autocomplete metadata return 200. The existing stale Turbopack process was replaced with the documented `npm run dev` server.
- Headless browser checks: homepage, explore, and search hydrate and fetch data successfully; no uncaught browser errors were observed.

The full `npm run build` was not run because it deploys migrations as part of the build. No production migration command was run. Before a later production rollout, run the read-only audit against that environment and account for the migration's transactional index creation and aggregate repair locks.

Reference: [Prisma v7 transactions and conflict retries](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions), [TanStack Query v4 cache isolation](https://tanstack.com/query/v4/docs/framework/react/guides/ssr), [PostgreSQL trigram index support](https://www.postgresql.org/docs/17/pgtrgm.html).
