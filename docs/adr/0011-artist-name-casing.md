# Artist names are case-distinct; search may still match case-insensitively

Different Artists may share the same letters with different casing (for example `Sia` vs `SIA`) because casing can be part of the credit identity. Routes that need a single Artist therefore carry an id (or resolve carefully); name-only search/autofill is allowed to return multiple case-variants via case-insensitive matching. Callers must not assume a case-insensitive `findFirst` is a unique identity lookup.
