# FTS for tabs, prefix/ILIKE for artists

Tab search benefits from description + title lexemes via a maintained `searchVector`; artists are short names without rich text, so FTS was removed in favor of prefix/contains (and trigram for longer queries). Split search strategies add migration/trigger complexity but match the data each entity actually has.
