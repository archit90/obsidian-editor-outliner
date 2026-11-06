# Editor Outliner: spec

Outliner editing for Markdown notes: indent / outdent, move with children, and growing selection, for
headings, nested lists and body blocks. Agreed 2026-11-06.

## Outline model

Two separate hierarchies that never cross:

- **Headings.** A line of N `#` followed by a space (or nothing) is a heading of level N, for any N. Obsidian
  only renders 1–6; lines with 7 or more `#` are styled by the plugin. A section is its heading plus
  everything up to the next heading of the same or a higher level (fewer `#`). Underlined (setext)
  headings are not headings. Headings inside callouts / quotes are not outline headings.
- **Lists.** Items (`-`, `*`, `+`, `1.`, `1)`, tasks) nest by indentation, as CommonMark (and Obsidian)
  reads it: a line belongs to an item when it's indented at least to the item's text (` - b` under `- a`
  is a sibling, not a child). An item's subtree is its own lines (continuation lines, code blocks and
  quotes indented under it included) plus its more-indented items. Lists live in a heading's body and
  never affect headings. Inside a callout, lists separated by a paragraph are separate lists.
- **Body blocks.** A section's body (the text between its heading and its first sub-heading) is a run of
  blocks separated by blank lines: paragraph, fenced code / `$$` math / `%%` comment, table, quote or
  callout, horizontal rule, or a whole list.

Text before the first heading is the root's body. Frontmatter (closed by `---`) is never part of the
outline. Code, `$$` math, `%%` and `<!-- -->` comment blocks are opaque: `#` and `-` inside them mean
nothing, also when the block opens mid-line (`text %%`). A line starting with inline ` ``` ` code is
not a fence. A paragraph's setext underline (`---` right under it) moves with it.

## Which hierarchy a command acts on

1. The selection includes a heading line: the headings. The command acts on the smallest run of whole
   sibling sections that covers the selection.
2. Otherwise, the selection is inside one list (or one callout's list): that list's items. The command
   acts on the smallest run of whole sibling items that covers the selection.
3. Otherwise, in a body: body blocks (move only). Indent / outdent fall back to Obsidian's own Tab.

## Indent / outdent

- **List indent:** the items (with subtrees) become the last children of the previous sibling. No previous
  sibling: nothing happens. The new indent matches the existing children's, else the previous sibling's
  plus one indent unit (tab or spaces, per the editor's settings).
- **List outdent:** the items move to their parent's level. No parent: nothing happens.
  - **A list always stays a list.** A top-level item never leaves its list. Inside a list, Shift+Tab never goes to
    Obsidian's own outdent (which removes indentation line by line), with an autocomplete popup open or on a
    blank line between items too. Only in a code block inside an item does Obsidian's Shift+Tab apply, and
    only while the line stays inside the item.
  - **Default:** in place; the siblings that followed become the item's children.
  - **Logical outdenting** (setting): the items move to just after the parent's subtree; the siblings that
    followed stay with the parent.
- **Heading indent (demote):** every heading in the sections gets one more `#` (6 becomes 7, and so on).
- **Heading outdent (promote):** every heading in the sections loses one `#`. Refused for H1.
  Default / logical as for lists: in place (following sibling sections become its children) or moved to
  just after the parent section.
- Ordered lists the change touched are renumbered (start = the lowest number in the run; a list of one
  item that the change created starts at 1). Lists the change didn't touch keep their numbers; `1.` and
  `1)` runs are separate.
- Indenting keeps a list's own whitespace style (a space-indented list stays spaces in an editor set to
  tabs). Code lines inside an item only gain or lose the item's indent: the code's own whitespace stays.
- A demote past H6 shows a notice: Obsidian treats those lines as text.

## Move up / down

- Swaps with the previous / next sibling, subtrees included. Gaps (blank lines) between them are kept.
- **Headings:** stops at the first / last sibling.
- **List items:** at the first / last sibling, the items jump to the nearest item at the parent's depth
  before / after (last child of the previous one, first child of the next one). Top-level items stop at
  the edge of their list.
- **Body blocks:** swap with the neighbouring block in the same body; stop at the body's edges (never past
  a heading). Indent / outdent don't apply to them.

## Expand / shrink selection

Each Expand widens to the next step that strictly contains the selection:

1. word
2. inline construct: inside first, then the whole (`[[link]]`, `[text](url)`, `**bold**`, `*em*`,
   `==mark==`, `~~strike~~`, `` `code` ``, `$math$`)
3. sentence
4. line text without its marker (`- `, `- [ ] `, `1. `, `## `)
5. whole line
6. node's own lines: item + its continuation lines; heading + its body; the body block
7. node with its subtree
8. parent item subtree, …, the whole list, the section's heading + body, the section, the parent section,
   … , the whole note (without frontmatter)

Shrink undoes the Expand steps in order. Any other selection change forgets them.

## Folding

Commands: fold / unfold the node at the cursor, fold its children, unfold it and everything under it,
fold headings to level 1–6, unfold all. Folds inside moved nodes survive the move. Folding uses Obsidian's
fold ranges, so it needs Settings → Editor → "Fold heading" / "Fold indent"; when nothing can fold, a
notice says so (headings deeper than H6 can't fold).

## Indent guides

Each heading section gets one continuous vertical line in the left margin, from under its heading to its
last line, drawn on a layer behind the text, so it also runs past tables, callouts and embeds. Every section
at the same depth uses the same x for the whole note, outermost leftmost; the spacing shrinks to fit a narrow
margin. The guides use Obsidian's list indentation-guide colour and width, so list and heading guides look the
same. Not mirrored for right-to-left notes.

## Heading level labels

In Live Preview, Obsidian hides a heading's `#` marks except on the line being edited, so its level is hard to
tell. Each heading line (H1–H6 and H7+) gets a faint "H3"-style label after its text, in the interface font,
not selectable and not part of the note. It's hidden on the line being edited, where the marks show, and in
Source mode. Setting "Heading level labels", on by default.

## Drag handles (desktop)

A handle appears to the left of the heading, list item or body block under the mouse. A drag starts after
the pointer moves a few pixels (a click does nothing); the depth or level follows how far it moves
sideways from where it started, so a straight vertical drag keeps the node's depth.

- **Heading:** drops between sections; the horizontal position picks the level among the valid ones there
  (shown on the drop line). Sub-headings shift by the same amount.
- **List item:** drops between items of the lists in the same section; the horizontal position picks the
  depth.
- **Body block:** drops between blocks of the same body.

Escape cancels a drag (also in popout windows). A drop is one undo step.

## Keys

All are commands, with no default hotkeys of their own. The keys below are a CodeMirror keymap, switched by
the "Outliner keys" setting: Obsidian runs editor hotkeys only on its active editor (in a lanes tab that can
be the lanes view, so nothing happens) and only once while a key is held. The keys act on the focused editor,
repeat while held, and fall through to Obsidian where the outline doesn't apply. Commands run from the
palette act on the focused editor, else the last one focused.

| Key                                                                                                                                     | Command                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Tab / Shift+Tab                                                                                                                         | Indent / outdent (falls through to Obsidian outside headings and lists) |
| Alt+Shift+↑ / ↓, or Alt+Fn+↑ / ↓ (Alt+PageUp / PageDown); on macOS only Option+Fn+↑ / ↓ (Option+Shift+↑ / ↓ selects by paragraph there) | Move up / down                                                          |
| Alt+↑ / ↓                                                                                                                               | Expand / shrink selection                                               |

Every command is one undo step; undo restores the text, not folds. Works in Live Preview and Source mode,
in Editor Lanes cards and in popout windows. Not in read-only editors or nested editors (a Live Preview
table cell). Tab falls through to Obsidian inside code blocks, while an autocomplete popup is open, and
with several cursors (only the main cursor is used). Changes don't count as typing, so they don't open
autocomplete.

## Settings

Logical outdenting (off), Outliner keys (on), Heading guides (on), Drag handles
(on), Style headings beyond H6 (on).
