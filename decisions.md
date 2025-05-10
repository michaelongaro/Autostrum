**Dialogs vs Modals**  
I tried to use shadcn/radix dialogs, however I ended up having quite a few rendered permanently in <Tab />, and the workarounds necessary to achieve the same effect that I have right now with <FocusTrap> and <AnimatePresence> was simply not worth it.

**Recompilation of tab while editing**  
While editing: trying to debounce auto compilation of chord data to happen at most every two seconds, since recompiling immediately on every single change to the tab was computationally expensive.

**Route params**  
Tabs (viewing) - Including both tab title and tab's id, since multiple tabs can have the same title.  
Tabs (editing) - Only including the tab's id for simplicity.  
Artists - Including both artist's name and their id, since multiple artists can have the same name.  
Users - Just the username is necessary, since usernames are forced to be unique, and as it's more distinguishable than their id.

**Tab caching strategy**  
Each tab's page will have ISR for data fetching. Whenever the tab is updated by the creator, a programmatic invalidation of the current CDN cache will be triggered. Each tab has a special client side query for the tab's dynamic metadata (ratings, bookmark status, and page views). This should allow for the benefits of SSG and SSR without the drawbacks.

**ISR - fallback: "blocking" vs fallback: true**
I have fallback: "blocking" on /tab and /tab/edit instead of fallback: true, which means that user's will not see any skeleton loading state for either. In general though the /tab route should always be cached in the CDN already, and it wasn't fantastic UX to see a huge flash of content appear and the inevitable page-shift when the tab loaded in.

**Full Text Search (FTS) on Tab/Artist queries**  
Keeping FTS on tabs because we can leverage adding the tab's description to the lexem builder, which if the description is wrote in a meaningful way it could capture more terms related to that specific tab. The same is not true for artists, unless we were to add a "bio" section later on or something of that nature. A prefix match for artists is more than sufficient for now.  
Note: tab search still includes a simple prefix match to help cover cases that FTS doesn't.

**Loading state for infinite queries**  
I originally had skeleton loading components for <GridTabCard /> and <TableTabRow /> that would conditionally render three cards/rows whenever the next page of results was loading in <SearchResults />. I am moving away from this approach because of two reasons. First, it is dishonest to the user to "promise" them three results, when in reality any number between one and the max limit could be shown once the query is resolved. Secondly, there is a jarring user experience on mobile in the case that the user is fully scrolled to the page and the three vertically stacked skeletons are then replaced by just one or two results, as the existing tab list will shift down to meet the newly added cards/rows.

**Recorded audio & YouTube embeds**  
I originally had the functionality for users to record and upload their own audio for a tab they had made, however the use case was too niche, increased code complexity, and fundamentally went against the core principle of minimizing the work it takes to create an accurate and easy to follow tab. I similarly had an idea to allow users to link a YouTube playthrough of their song, however this also went against my philosophy, as it would only be beneficial if the provided tools were not sufficient to accurately recreate the tab.

**Content-visibility: auto**
I tried using this instead of my custom virtualization approach for the tab playback modal believing that it would elegantly simplify my approach, however I was not able to achieve the necessary performance to warrent using it.
