# project

2026-11-04 — whole-project transformation engine for customized legacy shadcn default-style wrappers. Vaul drawer migration was separately authorized and completed.

## Changed

- Installed shadcn and migrate-radix-to-base using npx skills add shadcn/ui --agent codex --yes. Project-local skills and skills-lock.json are included; the skills catalog will pick them up on the next turn.
- Added @base-ui/react 1.9.0. Removed all 14 direct @radix-ui/react-* dependencies and Vaul; no transitive Radix React components remain.
- Migrated accordion, alert-dialog, button, checkbox, dialog, drawer, dropdown-menu, label, popover, select, separator, switch, toggle, tooltip, and visually-hidden utility. See each component report for its source and consumer changes.
- Swept callers for asChild/render, array accordion values, nullable Select callbacks, menu click handlers, focus management and data selectors. Labels now have required group contexts. Existing custom styles and theme tokens are retained.
- Base UI's finalFocus fires when the focus scope releases; lifecycle cleanup for print snapshots and help handoff instead runs on Root onOpenChangeComplete.
- Added dev-only interaction fixture and scripts/verifyBaseUiMigration.mjs. Updated existing verification selectors for Base UI and hidden form inputs.
- eslint.config.mjs excludes installed skill reference examples from application linting.

Validation:

- Final post-drawer npx next build --webpack passed without invoking database migrations.
- Primitive fixture passed at 1280px and 390px on Chromium and WebKit: rich labels before popup mount, keyboard scroll, checkbox labels/disabled state, switch geometry, tooltip, popover placement, menus/submenus, note lengths, nested dialogs, alerts, drawer geometry/swipe lock/swipe dismissal and focus return.
- Full scripts/verifyPrintTab.mjs passed: print layout/options, PDF page counts, mobile print handoff, retry/reprint, section selection, reset, Escape/Close and smooth 300ms exit.
- scripts/verifyIPhoneSoundReminder.mjs with Chromium iPhone 13 passed: manual open/reopen, focus handoff/containment/return, button/Escape dismissal, playback afterward, and no media-session override.
- The iPhone SE portrait (reduced motion) and landscape help/playback checks also passed.
- Typecheck: 30 existing diagnostics remain vs 123 baseline diagnostics; no new diagnostic messages after normalizing line numbers. Existing failures include soundfont assets, related-tab types, practice exercise descriptions, playback keyframes, and color utility tests.
- Targeted ESLint on all migrated wrappers, shared types, local fixture, and note-length menu passed. Full repository lint reports 101 existing problems (78 errors, 23 warnings), outside the migrated wrappers/fixture.
- No remote test users or tabs were created. Shared database migrations were not run.

## Left alone

- @radix-ui/colors is a palette dependency, not a UI primitive.
- Non-Radix third-party controls and unrelated pre-existing type/lint problems.
- components.json style stays default to preserve the existing look. There is no base-default equivalent. IMPORTANT: future shadcn add commands still choose Radix variants; use explicit Base UI sources or deliberately choose a new Base style before adding components.

## Behavior changes

Menu checkbox/radio items follow Base UI's default of remaining open when selected. Tooltip 1.9 is a visual hint and does not add Radix's automatic tooltip role/description association; triggers should carry their own accessible names/descriptions. Separator defaults to semantic separator rather than decorative. Native Button defaults to type=button and rendered links retain role=link. Checkbox/switch IDs attach to hidden form inputs, so tests interact through roles or labels. Drawer behavior differences are documented in drawer.md. Overlay animations now use starting/ending-style transitions.

## Verify by hand

Review keyboard and touch behavior on a physical phone, including image editing, search filters, tuner microphone use and the software keyboard. Review authenticated profile/rating flows with a test account. WebKit UI checks run with Next development chrome hidden because this installed engine lacks Web Audio; they do not validate Safari audio playback.

Derived source scan: 0 wrappers remain on Radix.
