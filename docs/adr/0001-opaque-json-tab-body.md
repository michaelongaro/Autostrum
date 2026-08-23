# Opaque JSON columns for tab body

Guitar-tab musical content is hierarchical and editor-driven, so normalizing every note/measure into relational rows would fight the document shape the editor already owns. We store `chords`, `strummingPatterns`, `sectionProgression`, and `tabData` as Postgres `Json` on `Tab`, validated in TypeScript/Zod. That keeps load/save and hydration simple, but makes SQL analytics, partial updates, and schema migrations harder.
