# On-demand revalidation for tab pages (SSG + blocking, no TTL)

Tab pages need fast CDN reads but must reflect edits immediately. We SSG with `fallback: "blocking"` (no build-time paths, no ISR TTL) and programmatically revalidate on write, while ratings/bookmarks/views stay client-fetched. That beats pure SSR latency and TTL ISR staleness, at the cost of write-path revalidation and first-hit blocking generation.
