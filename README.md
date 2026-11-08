# Editor Outliner

An Obsidian plugin for outliner-style editing of ordinary Markdown notes: headings, nested lists and body
blocks behave like an outline you can indent, move and select as a tree, with a Logseq-like outline mode in
lists.

## Features

- **Indent / outdent** headings and list items with their children (Tab / Shift+Tab).
- **Move** the item, section or block at the cursor, or the selected ones, up and down with their children
  (Ctrl+↑ / ↓, Cmd+↑ / ↓ on macOS). Items move into neighbouring lists as in Logseq.
- **Expand / shrink selection** (Alt+↑ / ↓ and Alt+Shift+↑ / ↓): word, sentence, line, then whole items and
  sections: siblings first, then the parent, up to the top level.
- **Node selection:** a selection of whole items or sections acts as a tree: ← / → fold or go to the parent /
  child, Backspace deletes, copy gives clean Markdown.
- **Outline mode in lists** (always on in a list): Enter splits items, Enter on the last empty item leaves the
  list, Shift+Enter adds a line in the same item, Backspace and Delete merge items, paste turns Markdown blocks
  into items.
- **Multi-block list items:** paragraphs and fenced code blocks (Dataview queries too) inside an item, laid
  out under the item in Live Preview.
- **Folding commands, heading guides** (vertical lines per section), **heading level labels** (a faint H2
  after each heading), **headings beyond H6** (7+ `#`), and **drag handles** to move nodes (desktop).
- Works in tabs, [Editor Multiple Lanes](https://github.com/{{OWNER}}/obsidian-editor-multiple-lanes) cards (optional), Canvas cards, popout windows and page previews; on mobile the toolbar's
  indent buttons indent with children.

Every action is also a command, so you can bind your own hotkeys.

## Settings

Logical outdenting (off) · Outliner keys (on) · Heading guides (on) · Drag handles (on) · Style headings
beyond H6 (on) · Heading level labels (on).

## Install with BRAT

1. Install **BRAT** (Obsidian42 - BRAT) from Community plugins.
2. BRAT → **Add beta plugin** → `{{REPO}}` → Add plugin.
3. Enable **Editor Outliner** in Community plugins.

## Notes

Requires Obsidian 1.15 or later. It uses some Obsidian and CodeMirror internals (checked against 1.15.0), so a
new Obsidian version may need an update. With Obsidian's Vim mode, the outline-mode keys act in insert mode.

## Building

```sh
npm install
npm run build   # main.js
npm test        # unit tests
```

## Licence

MIT
