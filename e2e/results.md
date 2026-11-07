# Editor Outliner e2e results

Run 2026-11-07T18:57:15.270Z: 2284 checks, 2284 pass, 0 fail, 0 error, 0 needing a decision (DECIDE: the case waits for the user's choice; see CASES.md).

| Group | Pass | Fail | Error | Decide |
|---|---|---|---|---|
| Mode states and the status bar | 61 | 0 | 0 | 0 |
| Enter | 84 | 0 | 0 | 0 |
| Enter on an empty item | 58 | 0 | 0 | 0 |
| Enter with continuation paragraphs and code | 64 | 0 | 0 | 0 |
| Shift+Enter | 54 | 0 | 0 | 0 |
| Shift+Tab ending a list | 56 | 0 | 0 | 0 |
| Backspace | 104 | 0 | 0 | 0 |
| Backspace: the invisible item indent | 50 | 0 | 0 | 0 |
| Delete | 72 | 0 | 0 | 0 |
| Paste | 170 | 0 | 0 | 0 |
| Multi-block items and code-indent rules | 120 | 0 | 0 | 0 |
| Node selection | 156 | 0 | 0 | 0 |
| Move / indent / outdent with nested children | 122 | 0 | 0 | 0 |
| Folding interplay | 58 | 0 | 0 | 0 |
| Ordered lists and tasks | 76 | 0 | 0 | 0 |
| Callouts and quotes | 40 | 0 | 0 | 0 |
| Tab- vs space-indented lists | 36 | 0 | 0 | 0 |
| Loose lists (blank lines between items) | 20 | 0 | 0 | 0 |
| Undo | 18 | 0 | 0 | 0 |
| Step-aside | 53 | 0 | 0 | 0 |
| Edge cases of the note | 54 | 0 | 0 | 0 |
| Indent / outdent outside outline mode | 154 | 0 | 0 | 0 |
| Move outside outline mode | 137 | 0 | 0 | 0 |
| Expand / shrink selection | 83 | 0 | 0 | 0 |
| Node selection: headings and details | 33 | 0 | 0 | 0 |
| Folding commands | 38 | 0 | 0 | 0 |
| Heading guides, level labels and H7+ styling | 36 | 0 | 0 | 0 |
| Drag handles (real mouse drags) | 90 | 0 | 0 | 0 |
| Where it works and settings | 25 | 0 | 0 | 0 |
| Vim mode: the outliner keys | 17 | 0 | 0 | 0 |
| Item node selection with outline mode off | 145 | 0 | 0 | 0 |

Console during the run: 2 uncaught exception(s) / console.error call(s) (0 mentioning editor-outliner):

- `console.error: Error: MiniSearch: duplicate ID _test/e2e.canvas |     at e.add (plugin:omnisearch:90:100760) |     at e.addAll (plugin:omnisearch:90:101162)`
- `console.error: Error: MiniSearch: duplicate ID _test/e2e-card.md |     at e.add (plugin:omnisearch:90:100760) |     at e.addAll (plugin:omnisearch:90:101162)`
