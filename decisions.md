**Dialogs vs Modals**  
I tried to use shadcn/radix dialogs, however I ended up having quite a few rendered permanently in <Tab />, and the workarounds necessary to achieve the same effect that I have right now with <FocusTrap> and <AnimatePresence> was simply not worth it.

**Recompilation of tab while editing**  
1/8/2025 - While editing: trying to debounce auto compilation of chord data to happen at most every two seconds, since recompiling immediately on every single change to the tab was computationally expensive.

**Tab caching strategy**
4/20/2025 - Each tab's page will have ISR for data fetching. Whenever the tab is updated by the creator, a programmatic invalidation of the current CDN cache will be triggered. Each tab has a special client side query for the tab's dynamic metadata (ratings, bookmark status, and page views). This should allow for the benefits of SSG and SSR without the drawbacks.

**Full Text Search (FTS) on Tab/Artist queries**
4/21/2025 - Keeping FTS on tabs because we can leverage adding the tab's description to the lexem builder, which if the description is wrote in a meaningful way it could capture more terms related to that specific tab. The same is not true for artists, unless we were to add a "bio" section later on or something of that nature. A prefix match for artists is more than sufficient for now.
