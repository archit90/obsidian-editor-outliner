# Editor Outliner extra checks

Run 2026-11-08T19:53:15.300Z by `e2e/extra.mjs` --mobile: 12 pass, 0 fail, 0 skipped of 12.

Obsidian 1.15.0; community plugins: editor-outliner@0.1.0; core plugins: backlink, bases, bookmarks, canvas, command-palette, daily-notes, editor-status, file-explorer, file-recovery, global-search, graph, note-composer, outgoing-link, outline, page-preview, properties, switcher, sync, tag-pane, templates, word-count. Vault: a sandbox (`.sandbox/sb4`).

| Id | Check | Result | Detail |
|---|---|---|---|
| X1 | Settings changes reach a tab, a Canvas card and a popover editor | PASS | `{"before":{"handles":5,"guides":5,"labels":6},"off":{"handles":0,"guides":0,"labels":0},"on":{"handles":5,"guides":5,"labels":6}}` |
| X2 | Disabling the plugin leaves no class or element in any editor | PASS | `{"left":[]}` |
| X3 | Popout: Tab indents an item with its children | PASS | `"# H\n- a\n\t- b\n\t\t- c\n- d"` |
| X4 | Popout: Enter splits (outline mode, always on) | PASS | `{"enter":"- one\n- two"}` |
| X6 | Popout: Escape cancels a drag | PASS | `{"text":"- a\n- b\n- c"}` |
| X7 | Popout: a drag moves the item; one Ctrl+Z undoes it | PASS | `{"text":"- b\n- a\n- c","undone":"- a\n- b\n- c"}` |
| X8 | Settings tab: six toggles (no outline mode switch); clicking Heading guides hides and shows the guides and saves | PASS | `{"names":["Logical outdenting","Outliner keys","Heading guides","Drag handles","Style headings beyond H6","Heading level labels"],"gOff":[0,false],"gOn":2}` |
| X9 | Long note (20006 lines): typing costs no more than ~2 ms over Obsidian's own; a move or indent under 100 ms; the palette's availability checks of five commands under 10 ms (median ms) | PASS | `{"lines":20006,"typingOn":11.2,"typingOff":11.1,"move":24,"indent":17.5,"palette":0}` |
| X9b | Long note (20006 lines): outline mode's Enter (split) and Backspace (merge) cost at most 15 ms over Obsidian's own Enter and Backspace there (median ms, after typing a character) | PASS | `{"lines":20006,"on":{"enter":25.2,"backspace":27.2},"off":{"enter":25.6,"backspace":22.3}}` |
| X12 | Obsidian renumbers every change of the fixture table as recorded (numbering.ts is checked against the table) | PASS | `{"cases":39}` |
| X10 | Mobile emulation: no drag handle; guides; Enter and Tab from a hardware keyboard | PASS | `{"mobile":true,"handle":false,"guides":true,"menter":"# H\n- a\n- one\n\t- two\n\t- c","mtab":"# H\n- a\n\t- one two\n\t\t- c"}` |
| X11 | Mobile toolbar: indent / outdent buttons move a list item or heading with its subtree; in body text Obsidian's indent | PASS | `{"indentItem":"# H\n- a\n\t- b\n\t\t- c","outdentItem":"# H\n- a\n- b\n\t- c\n\t- d","indentHeading":"# H\n### S\nx","outdentHeading":"# H\n# S\nx","para":"# H\n\n\tpara","paraObsidian":"# H\n\n\tpara"}` |
