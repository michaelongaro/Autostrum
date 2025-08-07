**Dialogs vs Modals**  
I tried to use shadcn/radix dialogs, however I ended up having quite a few rendered permanently in <Tab />, and the workarounds necessary to achieve the same effect that I have right now with <FocusTrap> and <AnimatePresence> was simply not worth it.

**Recompilation of tab while editing**  
While editing: trying to debounce auto compilation of chord data to happen at most every two seconds, since recompiling immediately on every single change to the tab was computationally expensive.

**Route params**

- Tabs
  - Viewing
    - Including both tab title and tab's id, since multiple tabs can have the same title.
  - Editing
    - Only including the tab's id for simplicity.
- Artists
  - When selected from autofill results
    - Includes both artist's name and their id, since multiple artists can have the same name.
  - When manually searching after typing artist name
    - Only including artist's name, and client-side fetching exact match (if present), or displaying up to three related artists otherwise.
    - The associated artist id needs to be retroactively added to the URL to allow for searching of their tabs.
- Users
  - Just the username is necessary, since usernames are forced to be unique, and as it's more distinguishable than their id.
  - I wanted the URL to be as clean as possible for sharing purposes, so the user's id will also be retroactively added to the URL to allow for searching of their tabs.

**Tab caching strategy**  
Each tab's page will have ISR for data fetching. Whenever the tab is updated by the creator, a programmatic invalidation of the current CDN cache will be triggered. Each tab has a special client side query for the tab's dynamic metadata (ratings, bookmark status, and page views). This should allow for the benefits of SSG and SSR without the drawbacks.

**ISR - fallback: "blocking" vs fallback: true**  
I have fallback: "blocking" on /tab and /tab/edit instead of fallback: true, which means that users will not see any skeleton loading state for either. In general though the /tab route should always be cached in the CDN already, and it wasn't a fantastic UX to see a huge flash of content appear and the inevitable page-shift when the tab loaded in.

**Full Text Search (FTS) on Tab/Artist queries**  
Keeping FTS on tabs because we can leverage adding the tab's description to the lexem builder, which if the description is written in a meaningful way it could capture more terms related to that specific tab. The same is not true for artists, unless we were to add a "bio" section later on or something of that nature. A prefix match for artists is more than sufficient for now.  
Note: tab search still includes a simple prefix match to help cover cases that FTS doesn't.

**Loading state for infinite queries**  
I originally had skeleton loading components for <GridTabCard /> and <TableTabRow /> that would conditionally render three cards/rows whenever the next page of results was loading in <SearchResults />. I am moving away from this approach because of two reasons. First, it is dishonest to the user to "promise" them three results, when in reality any number between one and the max limit could be shown once the query is resolved. Secondly, there is a jarring user experience on mobile in the case that the user is fully scrolled to the page and the three vertically stacked skeletons are then replaced by just one or two results, as the existing tab list will shift down to meet the newly added cards/rows.

**Recorded audio & YouTube embeds**  
I originally had the functionality for users to record and upload their own audio for a tab they had made, however the use case was too niche, increased code complexity, and fundamentally went against the core principle of minimizing the work it takes to create an accurate and easy to follow tab. I similarly had an idea to allow users to link a YouTube playthrough of their song, however this also went against my philosophy, as it would only be beneficial if the provided tools were not sufficient to accurately recreate the tab.

**Content-visibility: auto**  
I tried using this instead of my custom virtualization approach for the tab playback modal believing that it would elegantly simplify my approach, however I was not able to achieve the necessary performance to warrant using it.

**Immediate search vs select multiple & apply**  
I originally push()'d the user to the new route as soon as they selected a different filter, however this proved to be bad UX. Now we allow the user to make any number of filter selections before "confirming" them by clicking the "apply" button. The same methodology goes for the "reset filters" button, which only locally changes the filters to their default states, but requires the user to click "apply" to actually get push()'d to the new route.

**[...filters].tsx vs [[...filters]].tsx**  
Come back to this once the search-and-official-artist-refactor has been merged. I would like to make the /filters be optional if no filters are currently applied, however I (believe) that I had to put a special early return on the useGetUrlParamFilters layout effect because if I was on the table viewing layout it would start off with the grid view and then shortly after switch over to the table view once the url params were loaded in. If this is just a dev server issue, then remove the early return and move to [...filters].tsx for all pages that have <SearchResults /> on them. Also, I am unsure of the best ergonomics surrounding representing default filters in a [[...filters]].tsx approach. Side note: you now are keeping track of layout preferences in localStorage so there should be even less of a barrier I believe to try [[...filters]] now.

**Keeping search autofill results global vs scoped to viewed context**  
I can see the benefit to limiting autofill results to only the current context the user is looking at (their own tabs if on /profile/tabs or a specific artist's tabs if on /artist/[artistName]). However I do think it is a niche that isn't immediately necessary to be filled. The main use case that I see is if a user vaguely remembers a word or two from a title they are trying to find again, but don't want to have to scroll through the extra noise that comes with a global search. This can be added later on, but causes some issues with how to structure the autofill results to accommodate this dynamic approach.

**Layout in localStorage vs as a param**  
I moved the user's layout preference to localStorage exclusively for two reasons. First off being that a user might have legitimate reasons to have device-specific preferences for their layout. For example, if the user is on a low-data internet plan and doesn't want to incur the extra bandwidth that the grid tab previews come with, they could exclusively view results in the list form. Second, the layout param never quite fit with the rest of the search params, especially on mobile within the <Drawer>, due to it's different UI from the full width pane toggles.

**OnDelete Strategy**  
In general, I am keeping Cascade as the default OnDelete strategy, with a few notable exceptions. Since a user can choose to anonymize their tabs upon deleting their account, the createdBy field on the Tab model uses SetNull. The next two follow the same logic and use SetNull as well - detaching this relation doesn't warrant any restriction or deletion of the main model: an artist being deleted on the Tab model or the tabCreator deleting their account on the Bookmark model.

**getById vs getByUsername**  
I originally had a combined "getByIdOrUsername" as I thought it aided in versatility, however I am now exclusively using "getById" within the codebase when retrieving a user. The only notable exception is when visiting a user's profile, where (for a better looking URL structure) only the username is available. This reduces confusion within the api and allows for proper optimistic DB logic.

**Pre-computed vs On-demand metadata fields**  
I highly value read speed to elevate use experience. Due to this, various models like Tab, Artist, and User each have their own pre-computed fields that get manually updated whenever corresponding actions occur (rating a tab, deleting a tab, deleting a user's account, etc.) I understand this brings on extra responsibility to make sure data stays aligned, but so far it seems manageable.

**Precomputed widths of table column headers**  
I decided to precompute and hardcode all variations of dynamic widths of each column so that the header in <SearchResults /> can always be rendered w/ hardcoded widths as well. Before I was using an effect to read the widths of each row's column, however that didn't work when there were no rows to display or initial results were still being fetched, so the column headers rendered with each one on it’s own separate row, causing layout shift when the results loaded in.

**User data in database vs. Clerk**  
For now, I am still storing user’s profile images and retrieving their email address through clerk, but I plan on moving away reliance on clerk. The user table should hold the user’s email address and S3 should hold the profile images. The current plan is to eventually migrate to betterAuth.

**Dynamic strum speed methodology**  
I’m mapping the current BPM to a range of delays between strummed notes to make the strumming sound more realistic. At slower BPMs, there’s a longer delay between each note, while at faster BPMs, the notes are strummed more quickly. I’ve set the range of delays to be relatively narrow and biased toward faster strumming. This is because, when users select a slower BPM for practice, they typically want more time between each strum, rather than having each chord strummed more slowly.

**Artist and username casing**  
Since different artists can have the same name but with different casings (Sia vs. SIA), we explicitly allow the same name as as long as the casings are different. I also am allowing the same for usernames, but this is just my personal choice

**Extracted in-line functions within `<TabNote>` to utils file**  
Due to the sheer number of `<TabNote>` components that could reasonably be rendered at one time while creating/editing a tab, I wanted to reduce the overall computation/memory footprint by extracting these rather heavy onKeyDown and onChange functions to a utils file so they could be cached instead of recreated on every render.

**Tab screenshot methodology**  
From the beginning, I really wanted to include tab screenshots at least as an option when viewing tab search results. I think it is a quite unique feature within the guitar tab scene, and it felt nice to see a small preview of what the tab looks like. Then after the customizable color/theme refactor, the screenshots needed to be dynamic in some way to match the user's current color/theme. Storing every combination of color and theme in S3 seemed ludicrous and wasteful, both on the storage front and extra bandwidth for the user. So then I decided to go with a grayscale light and dark screenshot combined with the current color, leveraging the css property color-mix. Thankfully the effect produces almost the same quality as a proper screenshot does.

**Local fallback soundfont files**  
I am still perplexed about exactly why the GitHub CDN hosted soundfont files only sporadically loaded on my phone during production testing. I concluded that it likely was some network restrictions that the wifi network had which blocked the downloading of these assets, so I have included logic to fallback to download the locally hosted soundfont files in the /public directory. Also I had to add the /public .js files to my .prettierignore file, as for whatever reason they were not being read properly otherwise by the soundfont-player library.
