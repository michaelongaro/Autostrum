**Dialogs vs Modals**  
I tried to use shadcn/radix dialogs, however I ended up having quite a few rendered permanently in <Tab />, and the workarounds necessary to achieve the same effect that I have right now with <FocusTrap> and <AnimatePresence> was simply not worth it.

**Recompilation of tab while editing**  
1/8/2025 - While editing: trying to debounce auto compilation of chord data to happen at most every two seconds, since recompiling immediatley on every single change to the tab was computationally expensive.
