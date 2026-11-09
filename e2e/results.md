# Editor Outliner e2e results

Run 2026-11-09T10:23:54.277Z: 2294 checks, 2108 pass, 0 flaky (passed on a retry), 0 fail, 0 error, 186 skipped (a skipped check needs a plugin that isn't enabled).

Obsidian 1.15.0; community plugins: editor-outliner@0.1.1; core plugins: backlink, bases, bookmarks, canvas, command-palette, daily-notes, editor-status, file-explorer, file-recovery, global-search, graph, note-composer, outgoing-link, outline, page-preview, properties, switcher, sync, tag-pane, templates, word-count. Vault: a sandbox (`.sandbox/sb4`).

| Group | Pass | Fail | Error | Skipped |
|---|---|---|---|---|
| Enter | 80 | 0 | 0 | 2 |
| Enter on an empty item | 54 | 0 | 0 | 2 |
| Enter with continuation paragraphs and code | 64 | 0 | 0 | 0 |
| Shift+Enter | 50 | 0 | 0 | 2 |
| Shift+Tab ending a list | 50 | 0 | 0 | 2 |
| Backspace | 100 | 0 | 0 | 2 |
| Backspace: the invisible item indent | 50 | 0 | 0 | 0 |
| Delete | 68 | 0 | 0 | 2 |
| Paste | 166 | 0 | 0 | 2 |
| Multi-block items and code-indent rules | 117 | 0 | 0 | 11 |
| Node selection | 136 | 0 | 0 | 8 |
| Move / indent / outdent with nested children | 114 | 0 | 0 | 4 |
| Folding interplay | 54 | 0 | 0 | 4 |
| Ordered lists and tasks | 76 | 0 | 0 | 0 |
| Callouts and quotes | 40 | 0 | 0 | 0 |
| Tab- vs space-indented lists | 36 | 0 | 0 | 0 |
| Loose lists (blank lines between items) | 20 | 0 | 0 | 0 |
| Undo | 18 | 0 | 0 | 2 |
| Step-aside | 41 | 0 | 0 | 0 |
| Edge cases of the note | 54 | 0 | 0 | 0 |
| Indent / outdent outside outline mode | 130 | 0 | 0 | 14 |
| Move outside outline mode | 119 | 0 | 0 | 12 |
| Expand / shrink selection | 91 | 0 | 0 | 16 |
| Home in headings and lists | 72 | 0 | 0 | 12 |
| Node selection: headings and details | 30 | 0 | 0 | 3 |
| Folding commands | 36 | 0 | 0 | 26 |
| No heading guides; level labels and H7+ styling | 22 | 0 | 0 | 6 |
| Inline code and block delimiters | 4 | 0 | 0 | 1 |
| Drag handles (real mouse drags) | 68 | 0 | 0 | 13 |
| Where it works and settings | 19 | 0 | 0 | 1 |
| Vim mode: the outliner keys | 14 | 0 | 0 | 2 |
| Item node selection: more cases | 99 | 0 | 0 | 30 |
| Working with other plugins | 16 | 0 | 0 | 0 |
| Editor Multiple Lanes cards | 0 | 0 | 0 | 7 |

Skipped (needs a plugin that isn't enabled):

- needs dataview: 1 checks (WH11 [tab/lp])
- needs editor-multiple-lanes: 185 checks (E1 [lanes/lp], EE1 [lanes/lp], SE1 [lanes/lp], ST1 [lanes/lp], B1 [lanes/lp], D1 [lanes/lp], P1 [lanes/lp], MB1 [lanes/lp], MB2 [lanes/lp], MB3 [lanes/lp], MB4 [lanes/lp], MB5 [lanes/lp], …)

Console during the run: 0 uncaught exception(s) / console.error call(s) / warnings of the plugin.
