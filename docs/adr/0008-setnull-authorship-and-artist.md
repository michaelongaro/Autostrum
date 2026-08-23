# SetNull for tab authorship, artist link, and bookmark tabCreator

Account anonymization and “detach without destroying content” require nullable FKs. `Tab.createdBy`, `Tab.artist`, and `Bookmark.tabCreator` use `onDelete: SetNull` while most other relations Cascade. Content and bookmarks can survive owner/artist deletion; queries must always handle null creators/artists.
