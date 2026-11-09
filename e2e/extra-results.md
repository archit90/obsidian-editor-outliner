# Editor Outliner extra checks

Run 2026-11-09T09:43:42.122Z by `e2e/extra.mjs`: 10 pass, 0 fail, 0 skipped of 10.

Obsidian 1.15.0; community plugins: editor-outliner@0.1.0; core plugins: backlink, bases, bookmarks, canvas, command-palette, daily-notes, editor-status, file-explorer, file-recovery, global-search, graph, note-composer, outgoing-link, outline, page-preview, properties, switcher, sync, tag-pane, templates, word-count. Vault: a sandbox (`.sandbox/sb4`).

| Id | Check | Result | Detail |
|---|---|---|---|
| X1 | Settings changes reach a tab, a Canvas card and a popover editor | PASS | `{"before":{"handles":5,"labels":6,"guides":0},"off":{"handles":0,"labels":0},"on":{"handles":5,"labels":6}}` |
| X2 | Disabling the plugin leaves no class or element in any editor | PASS | `{"left":[]}` |
| X3 | Popout: Tab indents an item with its children | PASS | `"# H\n- a\n\t- b\n\t\t- c\n- d"` |
| X4 | Popout: Enter splits (outline mode, always on) | PASS | `{"enter":"- one\n- two"}` |
| X6 | Popout: Escape cancels a drag | PASS | `{"text":"- a\n- b\n- c"}` |
| X7 | Popout: a drag moves the item; one Ctrl+Z undoes it | PASS | `{"text":"- b\n- a\n- c","undone":"- a\n- b\n- c"}` |
| X8 | Settings tab: five toggles (no outline mode or heading guides switch); clicking Heading level labels hides and shows the labels and saves | PASS | `{"names":["Logical outdenting","Outliner keys","Drag handles","Style headings beyond H6","Heading level labels"],"gOff":[0,false],"gOn":2}` |
| X9 | Long note (20006 lines): typing costs no more than ~2 ms over Obsidian's own; a move or indent under 100 ms; the palette's availability checks of five commands under 10 ms (median ms) | PASS | `{"lines":20006,"typingOn":10.4,"typingOff":11.8,"move":20.1,"indent":19,"palette":0.1}` |
| X9b | Long note (20006 lines): outline mode's Enter (split) and Backspace (merge) cost at most 15 ms over Obsidian's own Enter and Backspace there (median ms, after typing a character) | PASS | `{"lines":20006,"on":{"enter":24.8,"backspace":25.6},"off":{"enter":25.7,"backspace":21.4}}` |
| X12 | Obsidian renumbers every change of the fixture table as recorded (numbering.ts is checked against the table) | PASS | `{"cases":39}` |
