# Denormalized counters on Tab, Artist, and User

List/profile/explore reads prioritize speed over pure normalization. Counters and aggregates are maintained on write (create/delete/rate/view/account delete) rather than recomputed with aggregates. Faster reads and optimistic UI, with ongoing risk of drift if a write path forgets an update.
