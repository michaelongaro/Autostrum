# Audio lifecycle audit

## Ownership and entry points

`src/utils/audioContextRecovery.ts` owns context creation, resume, health checks,
replacement, disposal, and page/gesture events. Each tab store has one controller;
homepage demos retain independent stores and use that same controller implementation.
All controllers share one set of DOM listeners. The development strip harness also
uses the controller, with its own graph so its synthetic clock remains isolated.

- `ensureAudioContextReady()` starts resume synchronously and returns a healthy
  context and master gain. Use it for oscillators and microphone input.
- `ensureAudioSystemReady()` adds the selected soundfont, with context, instrument,
  and pause-generation guards around async loading. It does not wait for count-in
  samples. Use it for tab playback, previews, and instrument notes.
- `playTabWithCountIn()` owns both mouse and keyboard count-in starts. Count-in
  sources belong to the normal scheduled-node list; pause, interruption, another
  start, and disposal cancel their audio and delayed playback together.
- `subscribeAudioLifecycle()` lets tools stop their own oscillators, microphone,
  animation, and pending requests. Components should not implement another context
  resume loop or add page listeners for audio recovery.
- `disposeAudioSystem()` releases a session's context and listeners and invalidates
  pending work. Demos call it when deactivated or unmounted.

## Failures found and corrected

1. **Recreation after an async timeout lost Safari activation.** A resume attempt is
   bounded to 1.2 seconds. If it fails, a replacement is created and resumed during
   the next trusted gesture, in capture before the playback handler. Concurrent
   callers share recovery, but every fresh gesture still issues `resume()` and
   refreshes its deadline. Rejections from older attempts cannot defeat newer taps.
2. **`running` was treated as proof of working audio.** Readiness now checks that
   `currentTime` advances, with a 600 ms deadline, and monitors it each second after
   activation. A recent proof can be reused for 250 ms during one playback start.
   A frozen clock stops consumers and marks the graph for replacement on a gesture.
   This addresses the failure described in [WebKit 263627](https://bugs.webkit.org/show_bug.cgi?id=263627).
3. **Independent recovery watchers stopped different things at different times.**
   The controller now signals interruptions immediately. Tab scheduling, previews,
   count-in, metronome, note trainer, chord trainer, and tuner consume that lifecycle.
   Modal-specific layout restoration remains in the modal.
4. **Count-in used separate mouse and keyboard timers.** One store action now
   schedules count-in audio on the context clock and guards its handoff using the
   start request, playback session, context identity, visibility, and count-in state.
   Countdown-display timers are cleaned up when canceled or unmounted. If the
   optional count-in sample is unavailable, synthesized clicks keep count-in
   usable without waiting for a download.
5. **Metronome, generated notes, and microphone startup depended on guitar assets.**
   They now use resource-free readiness. Tuner reference notes load only their
   reference instrument.
6. **Pending sample fetch/decode promises could poison caches indefinitely.**
   Count-in and soundfont loads time out after 15 seconds and evict failed entries.
   The existing 600 ms CDN-to-local soundfont fallback remains. Play controls stay
   available when an instrument is missing, allowing another tap to retry.
7. **Tuner permission responses could attach after stop or replacement.** Every
   acquisition now checks its generation after awaits and releases its own late
   stream. A microphone source/analyser is rebuilt for a replacement context;
   changing only the context ref is insufficient. Opening the microphone can itself
   interrupt output, so an in-flight acquisition revalidates after permission rather
   than recursively reacquiring on that transition.
8. **Embedded playback primed the global store.** Gesture priming now uses the
   component's store, preserving independent demo ownership.
9. **Clock verification could prevent the first source from unlocking iOS audio.**
   Readiness waited for an advancing clock before scheduling any source, while
   some iOS contexts need a source started inside the tap to begin rendering.
   Recreating the graph could repeat that failure on every Play. A silent,
   one-frame buffer now starts synchronously during activation, before any
   readiness or sample-loading await, and disconnects when it ends. A trusted
   gesture also retries `resume()` during a pending clock check even when Safari
   reports `running`.

## Intended interruption behavior

Backgrounding, pagehide, closure, and interruption cancel pending song/preview/
count-in starts and stop existing notes. Foreground recovery unlocks the context
without restarting those performances. The next Play starts a fresh session at the
preserved position. The tuner retains explicit listening intent across backgrounding
and attempts to reacquire its microphone on foreground/ready; Stop and unmount clear
that intent. A browser denial or hardware fault can still require another tap.

No context is explicitly suspended on hide: Safari has had suspended-but-reported-
running recovery failures. Contexts that cannot recover are replaced in a gesture.
Audio buffers and players from an abandoned graph cannot overwrite the current
graph; master gain is preserved across replacements.

Pauses, rests, and replacement guitar notes release from their current envelope
level to zero over 25 ms. Queued notes and percussion are canceled before their
attack; repeated stops cannot extend a release that is already ending. Playback
state changes immediately while the short audio tail finishes on the context clock.

## Verification

- `node scripts/verifyGuitarEffects.mjs`: note scheduling and release deadlines.
  Add `--browser --stops` and evaluate the generated expression in the browser
  for native waveform checks at 44.1/48 kHz, all four guitar soundfonts in both
  formats, queued percussion cancellation, and abrupt/faded stop auditions.
- `node scripts/verifyAudioContextRecovery.mjs` (Node 22.15+): deterministic faults,
  resume timing, clock stalls, graph ownership, asset timeouts, stale sample loads,
  instrument changes, and count-in cancellation.
- `node scripts/verifyAudioLifecycleBrowser.mjs [baseURL]`: native Chromium Web
  Audio and a simulated microphone; sample stalls, tool interruption, context
  replacement, late microphone responses, and foreground recovery. Also models
  clocks locked until a source starts during activation, including replacement
  graphs, to verify modal Play succeeds on its first tap. Requires dev server
  and Playwright Chromium. Creates no remote records.
- `node scripts/verifyTabStoreSessions.mjs`: independent demo/store isolation.

The focused checks above pass, as does a native-browser smoke check of the strip
harness. TypeScript and ESLint comparisons introduce no new diagnostics; the
project's existing diagnostics remain. Two broader existing UI scripts were also
attempted: `verifyFeatureShowcase.mjs` stopped before its audio checks because the
homepage Editing selector was missing, and `verifyIPhoneSoundReminder.mjs` stopped
on its help-popover last-child assertion. Their later assertions were not verified
by those runs.

Physical iPhone checks remain necessary. For tab playback, previews, count-in,
homepage demos, metronome, both note-trainer modes, chord trainer, and tuner, repeat
app switching and screen locking; interrupt with a call/Siri; change Bluetooth or
headphone routes; and retry after a network change. During a count-in, also close
the modal and switch exercises. For the tuner, leave during the permission prompt,
return, stop, and reopen it. Canceled audio must remain stopped, the next Play must
work, and the mic indicator must clear when listening stops.

An advancing context clock cannot prove audible hardware output. Silent mode,
device volume, receiver/speaker routing, and WebKit device-specific bugs still need
an actual iPhone; desktop device emulation does not reproduce them. Manual sound
help remains independent of recovery.
