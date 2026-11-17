# Client state

App preferences (theme, color, device-theme following, and viewport) live in
`src/stores/AppPreferencesStore.ts`. They outlive route resets and are separate
from playback notifications. Playback preferences whose behavior belongs to a
particular player, such as looping and speed, remain session-owned so embedded
demos can use independent settings.

`src/stores/TabStore.ts` creates tab sessions and coordinates document edits,
history, and resets. Its `tab/` modules hold shared types/defaults, document
operations, the audio runtime/transport slice, and playback compilation. Mutable
audio resources and cancellation bookkeeping stay in the audio slice's closure,
outside Immer snapshots. Document and transport state share a session store so
loading, seeking, and loop changes can publish consistent state together.

Use `useTabStore(selector)` for primitives and existing object references; it uses
identity equality. Use `useTabStoreShallow(selector)` when returning a new object
or array of selected values. Shallow comparison stabilizes the result after the
selector runs; it does not cache expensive calculations. Cache derivations by
their immutable inputs, as the editor beam helpers do.

Reusable components read imperative state through `useTabStoreApi().getState()`
or `useTabDataGetter()`. Use `TabStoreProvider` for an independent session; it
provides both the session and its preference store. Singleton helpers are for
route-level orchestration and verification scripts. Event-only values should be
read in the handler rather than subscribed to through React.

Use `loadDocument` for published/draft hydration, and `importDocument` for an
undoable import. Loading stops audio resources, replaces the document and its
identity, clears history, and publishes once. Playback compilation also publishes
once, and its invalidation compares editable progression structure while ignoring
derived timing. Keep heavy dialog subscriptions inside portal-mounted content so
they exist only during opening, display, and the closing animation.

Run `node scripts/verifyZustandArchitecture.mjs` and
`node scripts/verifyTabStoreSessions.mjs` for store regressions.
With the dev server running, `node scripts/verifyZustandBrowser.mjs` verifies
native audio-context replacement and the editor dialogs in an isolated guest session.
