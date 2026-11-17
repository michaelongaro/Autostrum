# Database and data fetching

PostgreSQL stores published tabs, private drafts, engagement data, and discovery
rankings. Prisma migration history lives in `prisma/migrations/`.

## Access and consistency

- Bookmark searches require the authenticated owner. Public search responses
  contain card metadata rather than private bookmark relations.
- Engagement writes preserve the published document version so views and ratings
  do not invalidate draft revisions, screenshots, or page caches.
- Bookmark date ordering happens in SQL before pagination. Browse and relevance
  queries use ID tie breakers and validate pagination inputs.
- Aggregate counters must be updated transactionally with their source rows.
  Direct SQL writes need the same reconciliation discipline.
- Weekly discovery reads, replaces snapshots, and resets counters in one
  serializable transaction.
- Each tRPC provider owns its React Query client; account changes mount a fresh
  provider. The shared Prisma client's lifecycle belongs to the application.

## Verification

`node scripts/auditDatabase.mjs` runs read-only checks for aggregate drift,
orphaned records, rating ranges, and full-text vector consistency against the
configured database.

`node scripts/verifyDatabaseFetching.mjs` exercises router behavior in a temporary
schema. It needs database access and creates and removes test data.

`npm run build` deploys Prisma migrations before building Next.js. Use the dev
server for routine local checks; use `npx next build` when only a production
compile is needed.

## Scaling limits

- Related-tab ranking loads the catalog for each ISR page. Preserve its
  catalog-wide frequency model when moving ranking into bounded queries or a
  maintained snapshot.
- Fuzzy-search `word_similarity(...)` comparisons need production-sized query
  plans; existing trigram indexes alone do not make them index predicates.
- Offset pagination and exact counts get more expensive on deep searches.
  Concurrent writes can still move rows between pages despite ID tie breakers.
- Statistics, pinned-tab selection, unrestricted artist lookup, and sitemaps
  need bounded/grouped queries as the dataset grows. A sitemap index is needed
  before exceeding 50,000 URLs.
- PostgreSQL, Clerk, ISR, and screenshots do not share a transaction. External
  cleanup runs after commit; guaranteed completion needs durable retries and
  Clerk-side deletion reconciliation.
- Legacy pinned-tab IDs use sentinels rather than an ownership-constrained
  relation. Normalize them before adding foreign keys.
- Tune the Prisma pool and public cache freshness from workload measurements.
