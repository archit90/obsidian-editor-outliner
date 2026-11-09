# Editor Outliner: specification

This document describes the plugin as it is now; `README.md` is the user guide and `TEST-CASES.md` the test
catalogue. **Keeping this current:** every change updates this document in the same commit. There is no change
log: git history has the past, this document the present.

Plugin id `editor-outliner` (until 2026-11-08 `obsidian-editor-outliner`); repo `archit90/obsidian-editor-outliner`.

Outliner editing for Markdown notes: indent / outdent, move with children and growing selection, for
headings, nested lists and body blocks; list items that hold several paragraphs and code blocks (Dataview
queries too); an outline mode in which Enter, Shift+Enter, Shift+Tab, Backspace, Delete and paste work inside
lists as in Logseq; node selection (whole items or sections, reached by Expand selection) with tree-like keys; plus
folding commands, heading guides, heading level labels and drag handles.

## Outline model

Two separate hierarchies that never cross:

- **Headings.** A line of N `#` followed by a space (or nothing) is a heading of level N, for any N. Obsidian
  renders only 1–6; lines with 7 or more `#` are styled by the plugin. A section is its heading plus
  everything up to the next heading of the same or a higher level. Underlined (setext) headings are not
  headings, nor are headings inside callouts or quotes.
- **Lists.** Items (`-`, `*`, `+`, `1.`, `1)`, tasks) nest as CommonMark reads them: a line belongs to an
  item when it's indented at least to the item's text (` - b` under `- a` is a sibling). An item's subtree is
  its own lines (continuation lines, and code blocks and quotes indented under it) plus its more-indented
  items. Its own lines are the marker line up to its first child; they split, at blank lines, into
  paragraphs (the first starts with the marker line), code blocks and quotes (see Multi-block items). Lists live in a heading's body and never affect headings. Inside a callout, lists separated by a
  paragraph are separate lists.
- **Body blocks.** A section's body (between its heading and its first sub-heading) is a run of blocks
  separated by blank lines: paragraph, fenced code, `$$` math, `%%` comment, table, quote or callout,
  horizontal rule, or a whole list.

Text before the first heading is the root's body. Frontmatter (closed by `---`) is never part of the outline.
Code, `$$` math, `%%` and `<!-- -->` comment blocks are opaque (`#` and `-` inside mean nothing), also when
the block opens mid-line; a delimiter inside inline code (`` `%%` ``) opens nothing, as in Obsidian. A line starting
with inline ` ``` ` code is not a fence. A paragraph's setext underline moves with it.

## Which hierarchy a command acts on

1. The selection includes a heading line: headings, the smallest run of whole sibling sections covering it.
2. Otherwise, inside one list: that list's items, the smallest run of whole sibling items covering it.
3. Otherwise, in a body: body blocks (move only). Indent and outdent fall back to Obsidian's Tab.

## Indent / outdent

- **List indent:** the items (with subtrees) become the last children of the previous sibling; none, nothing
  happens. The new indent matches existing children, else the previous sibling's plus one indent unit.
- **List outdent:** the items move to their parent's level; no parent, nothing happens.
  - **A list always stays a list:** a top-level item never leaves its list, and inside a list Shift+Tab never
    reaches Obsidian's own line-by-line outdent (on a blank line between items or with an autocomplete
    popup open, too). Only in a code block inside an item does Obsidian's Shift+Tab apply, and only while the
    line stays inside the item. The one exception is outline mode's Shift+Tab on an empty top-level item,
    which ends the list (see Outline mode).
  - **In place (default):** the siblings that followed become the item's children.
  - **Logical outdenting** (setting): the items move to just after the parent's subtree; the following
    siblings stay with the parent.
- **Heading indent (demote):** every heading in the sections gets one more `#` (6 becomes 7…), with a notice
  past H6, since Obsidian treats those lines as text.
- **Heading outdent (promote):** every heading loses one `#`; refused for H1. In place or logical, as for
  lists.
- **Renumbering:** every change the plugin makes numbers ordered lists exactly as Obsidian's own renumbering
  would, so Obsidian finds nothing to change and the change stays one undo step. Obsidian (1.15) renumbers in
  a transaction filter on every editor change (not on loading a note, in table cells or while composing), and
  the plugin applies the same rules to its change: lists the change touched are first numbered from their
  lowest number (a one-item list the change created starts at 1; a move keeps the list's start, as
  Obsidian's Move line up does), then Obsidian's rules on top. Obsidian's rules, for each line in the changed
  range and the line after it: an ordered item numbers on from the previous item at the same level (levels
  count whole tabs or 4 spaces; quote depth must match), across blank lines; the first item of a list keeps
  its own number when the change gave it a new marker, else the number the list started with; the items after
  it follow until one already has the right number. `1.` and `1)` items are one list (each keeps its
  delimiter); a bullet at the same level, a heading, a quote, a rule or a fence ends it, and so does a
  paragraph after a blank line, or a blank line after an item's continuation or code lines (so the item after
  a code block with an empty line in it starts again at 1).
- **Whitespace:** a list keeps its own style (spaces stay spaces in an editor set to tabs). A code line inside
  an item only has its item indent (the whitespace up to the item's content column) rebuilt, in the list's
  style; the code's own whitespace beyond it, tabs and spaces mixed, stays byte for byte, also on
  whitespace-only code lines.

## Move up / down

- Ctrl+↑ / ↓ (Cmd on macOS): the selection, snapped to whole sibling nodes, else the node at
  the cursor (a list item with its subtree, a heading section or a body block), moves; the selection follows
  and a node selection stays one, so the key repeats.
- Swaps with the previous / next sibling, subtrees included, keeping blank lines between them.
- **Headings** stop at the first / last sibling.
- **List items** at the edge move into the parent's adjacent sibling, as in Logseq: up, to the end of the
  previous sibling's children; down, to the start of the next sibling's children. When the parent has no
  sibling on that side, nothing happens (an item never jumps into another branch further away). Top-level
  items stop at the edge of their list.
- **Body blocks** swap with the neighbouring block in the same body and stop at its edges (never past a
  heading).

## Expand / shrink selection

Four commands: **Expand selection up / down** (Alt+↑ / Alt+↓) and **Shrink selection up / down** (Alt+Shift+↑ /
Alt+Shift+↓). Each keeps the selection's state itself: where it started and the runs it grew through.

- **Text steps first, the same either way:** word → inline construct, inside then whole (`[[link]]`,
  `[text](url)`, `**bold**`, `*em*`, `==mark==`, `~~strike~~`, `` `code` ``, `$math$`) → sentence → line text
  without its marker → whole line → in a list item: the paragraph (the item's first paragraph is its marker
  line and the continuation lines up to a blank line), in a fenced code block (in an item, a body or a
  callout) the code lines, then the whole block with its fence lines, then the item's own lines; on a heading
  line, the heading with its own body (when it has subsections). Steps that select the same text count once.
- **Then whole nodes, by direction:** the node at the cursor (a list item with its subtree, a paragraph, a
  code block, a callout, a table, a heading section). Expand up / down adds the next sibling above / below;
  at that edge it selects the parent (all of it), then grows across the parent's siblings, then its parent,
  and so on. It stops at the note's top level: Expand up with the first top-level node selected does nothing.
- **The tree:** a list item's children are its child items; a list's are its top-level items, so a list with
  all its items selected is the list block and its siblings come next; a callout's children are its inner
  blocks (lists, paragraphs, code); a section's are the blocks of its own body, then its subsections; the
  note's top level is the body blocks before the first heading and the top-level sections (never the
  frontmatter). A parent with the same lines as the run (a whole list, a callout holding one block) is passed
  through to the next step that changes the selection.
- **Shrink retraces that edge:** Shrink up moves the top edge back down, Shrink down the bottom edge back up,
  toward the node it started from. With nothing left to take back at that edge, it returns to the run below a
  parent step, then to the text steps and the cursor where it started; there it does nothing. These keys do
  nothing else (CodeMirror's copy line up / down never runs).
- The moving edge is the selection's head (Expand up leaves the head at the top), so the view follows it.
  Another selection change forgets the state: Expand then starts from that selection (its anchor as the
  start; a run of whole sibling nodes carries on as a run, anything else first grows to the smallest step
  holding it), and Shrink only acts on a selection that is a step. A step that covers whole items or sections
  is a node selection. Expand steps aside (Obsidian's key) in a nested editor, with several cursors and while
  composing (IME); Shrink then does nothing.

## Node selection

A selection of whole sibling nodes: list items with their subtrees, or heading sections. The selection is one
when it starts at the start of an item's marker line (or a heading line) and ends at the end of the last line
of that node or of a later sibling (or at the start of the line after it): what Expand selection reaches, or
whole item lines selected by hand. Node selection, of headings and list items alike (also when the run is the
whole list), works while the "Outliner keys" setting is on, inside a list or not. It is anchored at the node the
selection started from (the first, or the last for a selection made backwards), and is worked out from the
selection: any other selection change forgets it. The selected lines are highlighted whole (the text
selection inside is hidden). A selection reaching past the list, or spanning lists, is no item node
selection; past a section's end the next step is the parent section (heading node selection again).

- **↑ / ↓** are the editor's (the cursor moves and the selection goes); Alt+↑ / ↓ grow the run by siblings
  and Alt+Shift+↑ / ↓ take them back off (Expand / shrink selection).
- **←:** folds the selected nodes that can fold and aren't folded; when none can, selects their parent (nothing
  for a top-level item or section). **→:** unfolds the folded ones; when none is folded, selects the first
  child of the node at the moving end (nothing without children). Sub-sections are a section's children;
  lists never are.
- **Escape** has no special handling: it is Obsidian's, which clears the selection (the cursor at its head;
  in a Canvas card it leaves the card, as with any selection). In Vim's insert mode Escape is vim's.
- **Backspace / Delete** remove the nodes with their subtrees, one undo step. Blank lines before the next
  sibling go with them; with no sibling after, the blank lines before them go instead (none when there are
  none, so the text after a list doesn't join the item above). Ordered lists are renumbered (the next item
  takes a removed first item's number). The cursor goes to the start of the next sibling's text, else the end
  of the line above.
- **Copy / cut** give the nodes' Markdown at column 0: items lose the first node's indent and a callout's
  `>` prefix, keeping relative indentation (code beyond it byte for byte); sections are copied as they are.
  Cut removes them as Backspace does.
- **Tab / Shift+Tab / Ctrl+↑ / ↓** (Cmd on macOS) indent, outdent and move the selected nodes (as for any selection);
  the selection follows them and stays a node selection. Typing replaces the selection (Obsidian's).
- The keys step aside as outline mode's do (autocomplete popup, IME, several cursors, read-only or nested
  editor, Vim outside insert mode).

## Multi-block items

An item can hold several paragraphs and code blocks as standard Markdown: lines indented to the item's content
column (the column its text starts at), after its marker line and before its children. The item indent of
such a line is the list's quote prefix (`> ` in a callout) plus that many columns, in the list's indent style.

- **Insert code block in item** / **Insert Dataview query in item** (commands, no default hotkeys): from
  anywhere in the item's own lines, insert ` ``` ` (or ` ```dataview `), an empty line and
  ` ``` ` right after the item's own lines, before its children, indented to the item's content column,
  with no blank lines around it; the cursor goes on the empty line. Not offered outside an item's own lines.
  Ordered lists are numbered as Obsidian does (its rules read the block's empty line as the list's end, so the
  next item starts again at 1).
- **Live Preview look** of a fenced code block in an item's own lines (always on; not in a callout, Source
  mode or Reading view): Obsidian indents an item's text lines but not its code lines, so the block's
  background and frame would start at the editor's left edge with the item indent inside them. The item indent
  of each code and fence line is hidden and the line box starts where the item's text does, with the inner
  padding Obsidian gives code blocks outside lists, so the block sits under the item; only the code's own
  indent shows. An empty cursor never rests in the hidden indent (it goes to its end; ← from there goes to the
  end of the line above), so typing can't take a line out of the item; Backspace right after it is outline
  mode's (the line joins the one above, or nothing next to a fence), also outside the active state.
- **Code-indent rules** for fenced (` ``` ` / `~~~`) code blocks in an item's own lines; they keep
  the code's standard Markdown meaning. Only the item indent is ever added or removed; a code line's own
  whitespace beyond it is content.
  - **Enter** in such a block (fence lines included): the new line starts with the line's own quote prefix and
    indent when that reaches the item's content column (item indent + the code's own indent), else with the
    item indent; whitespace right after the cursor is dropped. Part of the "Outliner keys"; steps aside with
    an autocomplete popup open, while composing (IME) and with several cursors.
  - **Copy / cut / drag** of a selection lying in one such block (fence lines may be included), over more
    than one line: every line loses its item indent (a first line selected from past the indent is taken as
    is), so it pastes as plain code anywhere.
  - **Paste** of multi-line text into such a block (cursor or selection between its fences): the first line
    goes at the cursor as is; every later line gets the item indent (an empty line only the quote prefix;
    the last line none when the selection ended inside the indent, whose rest still carries it).
  - The clipboard rules work whatever the settings. `$$` math and `%%` comment blocks aren't covered.
- Dataview queries in items are ordinary code blocks; Dataview renders them in Live Preview and Reading
  view.

## Outline mode

Always on: there is no switch, command, hotkey, setting or status bar item for it (an earlier version had all
of them; an old saved `outlineMode` value is dropped on load). Outside lists it changes nothing, so the reasons
to turn it off were all inside a list, and each has another way: "Toggle bullet list" removes a bullet, and
Enter on the last empty item (or Shift+Tab on an empty top-level one) leaves a list. It is either:

- **idle:** the selection isn't inside a list: the other keys as described (headings, body blocks); or
- **active:** the main selection's first and last lines are in items of one list: an item's lines are its
  marker line, continuation paragraphs, code blocks, the blank lines between them, and a whitespace-only line
  right after them indented at least to its content column (what Shift+Enter leaves). An empty line after
  the list, a blank line between items, and a selection reaching outside the list or into another one are
  idle.

Active-state keys, after Logseq (editor.cljs, paste.cljs). Each **steps aside** (Obsidian's key applies) with
an autocomplete popup open, during IME composition, with several cursors, in a read-only or nested editor (a
Live Preview table cell), in Vim outside insert mode (the Vim adapter's `insertMode`), on a quote line inside
the item, with a selection over more than one line (Backspace and Delete: with any selection), and when the
item isn't a clean tree node (a line of its own not indented to its content column, such as an unindented
lazy continuation line). Enter and Shift+Enter also step aside on a code (fenced, `$$`, `%%`) line in the
item; Backspace, Delete and paste have their own code rules below.

- **Enter** splits the item at the cursor (a selection within the line is replaced; spaces around the split
  go). The text after the cursor and the item's own lines below it (continuation paragraphs, code blocks)
  become a new item, re-indented from the old item's content column to the new one's (a code line's own
  whitespace beyond it stays byte for byte); leading blank lines go, and a first paragraph line becomes the
  new item's text, trailing blank lines stay off the first part. The cursor goes to the start of the new
  item's text.
  - Item with **unfolded children**: the new item is its **first child** (the children stay with the first
    part), with the children's bullet or number. Otherwise (no children, or folded): the **next sibling**
    after the subtree, with the item's own marker.
  - Marker: the bullet character and the gap after it are copied; a task's new item is `[ ] `; ordered lists
    are renumbered as for indent.
  - **Cursor at the start** of a non-empty item (at its text, in its marker, or at the start of a
    continuation line when nothing comes before): an empty item goes above, and the cursor stays on the text.
  - **Empty item** (nothing after the marker or checkbox, no own lines): the **last top-level item** (no
    children) **ends the list**, as Shift+Tab on it does (below): its marker goes, a blank line separates it
    from the list, and what is typed there is a paragraph. So at the end of a note, repeated Enter on an
    empty item outdents it level by level and then leaves the list. A nested item with no sibling after it
    **outdents** (the outdent operation, children included); any other gets another empty item after it
    (first child when it has unfolded children).
  - In a code block in an item, Enter is the code Enter of Multi-block items (or Obsidian's).
- **Shift+Enter:** a new line in the same item at its content column (a continuation line); whitespace
  after the cursor goes. On such a line left empty the same again: the empty line stays in the item as a
  paragraph break.
- **Shift+Tab on an empty top-level item without children ends the list** (Enter does too when it is the last item): the marker goes and the line is an
  empty paragraph line (`>` in a callout) with the cursor on it, outside the list, with a blank line between it
  and the list above, and another before the items after it (none added where one is already there): `- a`,
  `- |` gives `- a`, blank, `|`. What is typed there is a paragraph (never a lazy continuation of the item
  above) and outline mode stays idle. Items after it stay a list after it (numbered as Obsidian does: on
  across the blank lines). Any other Shift+Tab is the outdent above. Moving the cursor out (↓,
  click) also leaves the list.
- **Backspace** (with a cursor, not a selection):
  - **At the start of an item's text** (the cursor anywhere in its marker): the item **merges into the
    previous visible item** (the item just above in document order; one hidden in a folded item counts as
    that folded item). Its text is appended to that item's last own line (no space added; when that line is
    code or a quote, it goes on a new line at the item's content column instead, since text glued to a fence
    would break it), the cursor at the join. Its continuation paragraphs and code follow that item's own
    lines, re-indented to its content column (code bytes beyond the indent kept). Its **children become that
    item's children**, in document order: after its existing children, or, when it is the parent, where the
    merged item was. Its checkbox goes. Blank lines between the two go; ordered lists are renumbered.
  - The previous item **blank** (no text, no own lines, no children) and not the parent: it is **deleted
    instead** (with the blank lines after it); the current item keeps its place and children.
  - A **folded** previous item isn't unfolded: the merged children go under its fold. One whose own lines
    below its marker line are folded away takes nothing (the text would land out of sight): nothing happens.
  - The **first item of the list** doesn't merge into text above the list: nothing happens; an empty one
    without children gets Obsidian's Backspace.
  - **Right after a task's checkbox:** the checkbox goes (`- [ ] |x` → `- |x`); the next Backspace merges.
  - **The item indent is invisible:** at the start of a continuation line's text (or anywhere in its
    indent), or in a fenced code line's leading whitespace up to the item indent, the line joins the line
    above, its item indent going with the line break; the cursor goes to the join. An empty line above (a
    paragraph break) just goes. A code line's own indentation beyond the item indent is text (Obsidian's
    Backspace). Nothing happens where a join would glue text to a fence line or into code or a quote: on the
    first code line, on a fence line, on a continuation line right under a code block or quote. `$$` / `%%`
    lines: Obsidian's Backspace.
- **Delete** (with a cursor at the end of a line):
  - **At the end of an item's text** (its last own line): the **next visible item merges in** (its first child
    when the children show, else the next item in document order): the merge above, its text at the cursor
    (the cursor stays), its children under this item. **Nothing on a folded item** (Logseq), nor on the last
    item of the list.
  - **At the end of the marker line or a continuation line** with more own lines below, or of a fenced code
    line: the next line joins it without its item indent (an empty line below just goes); nothing where that
    would glue text to a fence line, code or a quote.
  - On the whitespace-only line after the item's own lines: nothing.
- **Paste** (Ctrl/Cmd+V; the cursor or a selection within one line). The text is what Obsidian's paste would
  insert: its own copies' plain text, else `text/markdown`, else HTML converted to Markdown (Obsidian's
  `htmlToMarkdown`, when Settings → Editor → "Auto convert HTML" is on), else plain text; files, a URL list
  (Obsidian makes links) and HTML with images or media are left to Obsidian. Inside a code block in an item
  the code-indent rule of Multi-block items comes first, whatever the mode. Then:
  - **A fenced code block alone** (blank lines around it ignored): new lines after the cursor's line (after
    the block, when on a fence line), at the item's content column, so it is a code block **in the current
    item**; the code's indentation relative to its opening fence stays byte for byte. The cursor goes to the
    end of the closing fence.
  - **Markdown blocks** (Logseq's test: a line starting with a bullet or `#`s and a space, or a fence or
    `$$` anywhere; numbered markers `1.` / `1)` and a space count too, so a pasted numbered list becomes items), or **paragraphs separated by blank lines**: the text becomes items. List items keep their
    tree, checkboxes and own lines (continuation paragraphs, code); a heading becomes an item with its `#`s
    (Logseq keeps heading blocks), a paragraph right under it joins it; every other block (paragraph, table,
    quote, code block) becomes an item of its own (a code block below an empty text line: a fence can't start
    on a marker line here). A selection in the line goes first. Placement (the cursor's spot in the item
    doesn't matter):
    - an **empty target item** without children is **replaced** by them (also with children when one block
      is pasted: the children stay under it);
    - a target with **unfolded children**: they become its **first children**;
    - otherwise: its **next siblings**, after its subtree.
      The tree is **re-indented to the target**: top-level items at the target's (or its first child's) column
      with that item's marker (bullet character, or number and delimiter, then renumbered; their own checkboxes
      kept), so the list stays one list; children one indent unit in (and past the marker) with their own
      markers; own lines at the item's content column, a code line's text beyond the source item indent byte
      for byte. A whitespace-only line the cursor was on (what Shift+Enter leaves) goes. The cursor goes to the
      end of the last pasted line.
  - **Anything else** over several lines: inserted at the cursor (replacing a selection; never into the
    marker); the lines after the first get the item indent, with their common indentation removed, so they
    stay in the item. One line of plain text: Obsidian's paste (links over a selection and so on).
  - On a `$$` / `%%` line, or a fence line (except a code block alone): Obsidian's paste.
- Every key is one undo step, keeps folds (applied as a whole change, Obsidian's folds are refolded), and
  doesn't count as typing (no autocomplete), except Shift+Enter, which is typing a newline, and a plain-text
  paste, which is a paste (`input.paste`). As with Obsidian's own Enter, typing within half a second after a
  key joins its undo step (CodeMirror's history grouping), so one Ctrl+Z then undoes both.

## Folding

Commands: fold / unfold the node at the cursor, fold its children, unfold it and everything under it, fold
headings to level 1–6, unfold all. Folds inside moved nodes survive the move. Uses Obsidian's fold ranges, so
it needs Settings → Editor → "Fold heading" / "Fold indent"; when nothing can fold a notice says so (also with the
cursor in text before the first heading, outside a list; headings deeper than H6 can't fold).

## Heading guides

Each heading section gets one continuous vertical line in the left margin, from under its heading to its
last non-blank line, drawn on a layer behind the text, so it runs past tables, callouts and embeds. Every
section at the same depth has the same x for the whole note, outermost leftmost, 10 px apart, less when the
margin is too narrow. They use Obsidian's list indentation-guide colour and width. Not mirrored for
right-to-left notes.

## Heading level labels

In Live Preview, each heading line (H1–H6 and H7+) shows a faint "H3"-style label after its text, in the
interface font, not selectable and not part of the note. Hidden on the line being edited (where the `#`
marks show) and in Source mode. After the text rather than in the margin, which holds the fold arrow, drag
handle and guides.

## Drag handles (desktop)

A handle appears left of the heading, list item or body block under the mouse. A drag starts after the
pointer moves a few pixels (a click does nothing); depth or level follows how far it moves sideways from where
it started, so a straight vertical drag keeps the depth.

- **Heading:** drops between sections; the horizontal position picks the level among the valid ones (shown on
  the drop line), and sub-headings shift with it.
- **List item:** drops between items of the lists in the same section; the horizontal position picks the depth.
- **Body block:** drops between blocks of the same body; the body's first block keeps the spacing under its
  heading that the first block had (as Move does).

Escape cancels (popout windows and Canvas cards too; in a card it doesn't leave the card). A drop is one undo
step. The handle hides on scroll. Where the editor's margin is too narrow for the handle, it stays at the
editor's left edge; a Canvas card's editor gets 22px more left margin while drag handles are on, so the handle
sits left of Obsidian's fold arrow as in a tab.

## Keys

Every action is a command, none with a default hotkey. The keys below are CodeMirror keymaps: the outline-mode
keys act wherever outline mode is active (always on, in a list), the rest (node
selection's keys included) the "Outliner keys" setting, because Obsidian runs editor hotkeys only on its active editor (in a lanes tab that
can be the lanes view) and only once while a key is held. The keys act on the focused editor, repeat while
held, and fall through to Obsidian where the outline doesn't apply. Commands run from the palette act on the
focused editor, else the last one focused.

| Key                                  | Action                                                                                                                                                                                                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab / Shift+Tab                      | Indent / outdent (falls through to Obsidian outside headings and lists)                                                                                                                                                                                                                |
| Ctrl+↑ / ↓ (Cmd+↑ / ↓ on macOS)      | Move up / down: the selection snapped to whole sibling nodes, else the node at the cursor; the selection follows. Where the outline doesn't apply (frontmatter, a table cell, several cursors, IME) the key is Obsidian's: on macOS Cmd+↑ / ↓ there goes to the document's start / end |
| Alt+↑ / Alt+↓                        | Expand selection up / down: text steps, then siblings that way, at the edge the parent, up to the note's top level                                                                                                                                                                     |
| Alt+Shift+↑ / Alt+Shift+↓            | Shrink selection up / down: the top / bottom edge back toward where it started. These keys do nothing else: with nothing to shrink, several cursors, IME or in a nested editor they do nothing (CodeMirror's copy line up / down never runs)                                           |
| ← / →, Backspace / Delete            | With a node selection: fold or select the parent / unfold or select the first child; remove the nodes                                                                                                                                                                                  |
| Enter                                | In a fenced code block in a list item: new line keeps the item indent and the code's indent. Outline mode active: split the item / empty-item rules. Else Obsidian's Enter                                                                                                             |
| Shift+Enter                          | Outline mode active: new line in the same item (else Obsidian's)                                                                                                                                                                                                                       |
| Shift+Tab on an empty top-level item | Outline mode active: end the list                                                                                                                                                                                                                                                      |
| Backspace                            | Outline mode active: at an item's start merge it into the item above (or delete a blank one above); at a continuation / code line's indent join the line above; after a checkbox remove it                                                                                             |
| Delete                               | Outline mode active: at an item's end pull the next item in; at a continuation / code line's end join the next line                                                                                                                                                                    |
| Ctrl/Cmd+V                           | Outline mode active: Markdown blocks become items, a code block alone goes into the item, multi-line text stays in it (code-block paste rule always)                                                                                                                                   |

On macOS Cmd+↑ / ↓ moves the node at the cursor wherever the note has one, paragraphs included: Obsidian's "go
to the start / end of the document" only remains in frontmatter (a decision, so moves have one key everywhere).

Every command is one undo step (undo restores the text, not folds). Tab falls through to Obsidian inside code
blocks, while an autocomplete popup is open, with several cursors and during IME composition; so do
Shift+Tab, the move keys and Alt+↑ / ↓ with several cursors and while composing. Changes don't count as typing, so they
don't open autocomplete.

## Where it works

- **Everywhere a note is edited:** Live Preview and Source mode, normal tabs, Editor Multiple Lanes cards, popout
  windows, page preview popovers (in their editing mode) and Canvas cards; not in read-only or nested editors
  (a Live Preview table cell).
- **Settings and unloading** reach every open editor at once, Canvas cards and popovers included (the
  extensions sit in a compartment the plugin reconfigures itself; Obsidian's `updateOptions()` only reaches
  Markdown tabs). An editor already open when the plugin loads gets it when reopened.
- **Performance:** typing doesn't re-parse the note: labels, guides and the code-in-item layout keep their
  decorations across edits that leave the line's shape (heading level, fences, block delimiters) as it was, typing
  in a heading's text included, and are worked out again after a short pause. A key that changes the note
  (outline mode's Enter or Backspace, a move, a drop) compares and writes only the lines it changed, numbers
  ordered lists only when the note has some, and hands the outline it worked out to the decorations; the
  palette's "does this command apply" checks don't work the change out. Measured on a 20,000-line note (X9, X9b):
  typing costs about the same with the plugin on or off; outline mode's Enter and Backspace cost a few
  milliseconds more than Obsidian's own.
- **Mobile:** the editor toolbar's indent / outdent buttons (Obsidian's "Indent list item" / "Unindent list
  item") indent and outdent the heading or list item at the cursor with its subtree, as Tab / Shift+Tab do;
  elsewhere (body text, code, a table cell) they are Obsidian's. There is no drag handle on mobile.
- **Canvas cards** (file cards and text cards, while being edited) get everything: outline mode (the same
  global state), all keys, the commands from the palette, expand selection, node selection, folding, heading
  guides, level labels, H7+ styling and drag handles. Obsidian edits a card in a same-origin iframe: it copies
  the app's styles (the plugin's included) into it and relays its key presses to the main window, so hotkeys
  reach a focused card, and "the focused editor" looks inside a focused iframe.
  Inside the iframe all coordinates are the card's own, so Canvas zoom changes nothing for drag handles, the
  drop line or the guides. A drag on a handle doesn't pan the canvas or move the card; Escape during a drag
  stays in the card (the next Escape leaves it, as Obsidian does).
- **Obsidian's Vim mode:** Vim sees a key before the plugin's keymaps, so normal- and visual-mode keys
  (Enter, Backspace, Delete, Escape, arrows, Ctrl+V) stay vim's. The outline-mode keys and node selection
  act only in insert mode (read from the Vim adapter's `insertMode`); a visual-mode selection is never a node
  selection (no highlight, no column-0 copy). Escape with a node selection in insert mode is vim's (back to
  normal mode). Tab / Shift+Tab, Ctrl+↑ / ↓, Alt+↑ / ↓ and Alt+Shift+↑ / ↓ aren't vim keys and work in every mode (Expand
  in normal mode leaves vim in visual mode). The plugin adds no vim motions of its own.

## Settings (defaults)

Logical outdenting (off) · Outliner keys (on) · Heading guides (on) · Drag handles (on) ·
Style headings beyond H6 (on) · Heading level labels (on).

## Working with other plugins

The plugin needs no other plugin, and no other plugin needs it. Where they meet, it goes through Obsidian's own
contracts; the e2e suite tests each side without the partner (simulating what it provides), then with it
(cases that need it are skipped without it).

- **Editor Multiple Lanes:** its cards are ordinary Markdown views hosted in a lanes tab, so they get the plugin
  like any tab (no code of either knows the other). What differs is the host: Obsidian's active editor may be
  the lanes view, so the keys are a CodeMirror keymap on the focused editor and the commands act on the focused
  (or last focused) editor; a card doesn't scroll itself, so a drag near the edge scrolls the nearest scrolling
  ancestor (the lane); cards come and go as Lanes opens and parks notes, and every new editor gets the plugin
  (settings changes and unloading reach every open one). Tested in a lanes card: the cases that run everywhere,
  the command cases, and LC1–LC6 (two cards and the palette, a drag that scrolls the lane, commands offered in a
  card, a card reopened, a move past the lane's bottom, settings and unloading). The suite uses Lanes' test
  contract only: `settings.lanesOnly` / `settings.routeExceptions` with `settingsChanged("routing")` (saved first,
  restored at the end; its normal-tab notes live in `_test/tab/`, an exception) and the view type `editor-lanes`
  to tell a card.
- **Backlinks Full View:** its panes sit inside a note's editor (below the text) but outside its content, so they
  get no guides, handles or keys; nothing to coordinate.
- **Autocomplete popups** of any plugin (Obsidian's EditorSuggest: links, tags, Tasks, Templater…): while one is
  open the outliner's keys step aside, so the popup gets Enter, Tab and the arrows.
- **Paste handlers** (`editor-paste`): a paste the outliner would take (multi-line text in a list item or in a code
  block in an item) goes to the other plugins' handlers first, as Obsidian's own paste does; one that calls
  `preventDefault` keeps it (OP1–OP3, with a simulated handler).
- **Dataview:** "Insert Dataview query in item" writes a `dataview` code block in the item; Dataview renders it,
  in Live Preview and Reading view, inside the item (WH11 needs Dataview).
- **Vim mode** (Obsidian's): normal and visual mode keep vim's keys; outline mode acts in insert mode
  (see Where it works).
- **Other outliners** binding Tab, Enter or Backspace in lists (the Outliner plugin, for one) conflict with the
  outline-mode keys: use one of them, or turn this plugin's "Outliner keys" off for the rest. Advanced Tables and
  other table plugins keep Tab in tables: the outliner's Tab falls through outside headings and lists.

## Development

- **Repository:** this folder is the whole repo. `package.json` (scripts and tool versions), `tsconfig.json`
  (strict, `noImplicitOverride`, `noUnusedLocals`), `eslint.config.mjs`, `.prettierrc`, `.editorconfig`,
  `.gitattributes`, `esbuild.config.mjs` (`src/main.ts` → `main.js`, not minified; `npm run dev` rebuilds on save
  with an inline source map) and `vitest.config.mts`. `main.js` is built, never committed.
- **`npm run check`:** format check, lint, typecheck, unit tests (vitest, including `test/typing.test.ts`), build,
  and a smoke load of the bundle (`test/smoke.cjs`, with stubs for `obsidian` and `@codemirror/language`). It must
  pass before a commit or a release; CI (`.github/workflows/ci.yml`) runs it on every push.
- **Typing:** no untyped code. `noImplicitAny` (strict) in TypeScript; ESLint fails any explicit `any` (tests
  included) and `@ts-ignore` / `@ts-nocheck` / an undescribed `@ts-expect-error`. Obsidian internals are typed
  in `src/types/*.d.ts` or taken as `unknown` and narrowed. An `any` that can't be avoided carries
  `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <reason>`; `test/typing.test.ts` fails
  any `eslint-disable` without its rules and a reason after `--`.
- **Code layout:** source in `src/` modules, with the pure logic kept free of Obsidian imports so it can be
  unit-tested (`test/obsidian-stub.ts` stands in for `obsidian`). Patches of Obsidian methods use
  `monkey-around` and are registered with the plugin, so they come off on unload.
- **Internals:** every Obsidian internal used was checked against Obsidian 1.15.0's `app.js` and `app.css`.
  `minAppVersion` is 1.15.0. A new Obsidian version means re-checking them:
  - typed in `src/types/`: `Editor.cm` / `activeCM`, `app.commands` (the mobile toolbar's indent buttons),
    `vault.getConfig("autoConvertHtml")`, `workspace.editorSuggest`, the Vim adapter on `EditorView.cm`;
    `src/internals.ts` checks the ones it can on load and warns in the console when one is missing
    (`missingInternals` on the plugin, WH14);
  - behaviour copied from Obsidian: the renumbering of ordered lists (`numbering.ts`), checked against a table
    recorded in Obsidian, `src/numbering.fixtures.json`: re-record it after an Obsidian update
    (`npm run e2e:numbering` in a sandbox); the unit tests use it, and the e2e check X12 replays it in Obsidian
    on every run, failing when Obsidian's rules changed; the clipboard rules of its paste (the
    `<!-- obsidian -->` mark of its own copies);
  - CSS: the Canvas card iframe (`.mod-inside-iframe`), the line margin Obsidian sets with `!important` (code
    in items), the active line (`.cm-active`, level labels), the indentation-guide and `--h6-*` variables.
- **Test hook:** `outlineOffForTests` on the plugin instance turns the outline-mode keys off for the e2e suite
  (to compare with Obsidian's own keys); not saved, no UI. Keep it.
- **Versions and releases:** the version is 0.1.0, and releases bump the patch version only (0.1.0 → 0.1.1 …);
  the minor and major stay. `npm run release` (= `npm version patch`) bumps `package.json`, then
  `scripts/version-bump.mjs` copies the version into `manifest.json` and `versions.json`; npm commits and tags it
  (tag = the version, no `v`, `.npmrc`). `scripts/version-bump.mjs` refuses a new minor or major version (and puts
  `package.json` back) unless it's asked for with `ALLOW_MINOR_BUMP=1 npm version minor|major`. `git push
--follow-tags` runs `.github/workflows/release.yml`: `npm run check`, a check that the tag is the manifest
  version, then a GitHub release with `main.js`, `manifest.json` and `styles.css`, which BRAT installs.
  `isDesktopOnly` is false.
- **Trying a build in a vault:** `npm run deploy -- <vault> …` (or `OBSIDIAN_VAULTS`) builds and copies `main.js`,
  `manifest.json` and `styles.css` into each vault that already has the plugin (`--install` adds it); `data.json`
  is never touched. Reload the plugin in Obsidian afterwards.
- **End-to-end tests:** `e2e/sandbox.sh start|stop|restart|reset|deploy|shot|status <n>` runs a throwaway Obsidian
  (`OBS_APP`, default the 1.15.0 AppImage) on its own Xvfb display `:110+n` (never on your screen), with its own
  profile, its own vault in `.sandbox/sb<n>/` (git-ignored) and the DevTools port `9310+n`; this plugin's sandbox
  is 4 (port 9314, `e2e/cdp.mjs`'s default). The vault is a fresh empty one with only this plugin, plus the plugins
  in `OBS_PLUGINS` to test them together (folders with a build, or `owner/repo[@version]` releases); or a copy of
  `OBS_VAULT` (a big test vault, say). `e2e/make-vault.mjs` adds what the suite wants on disk: the editor settings
  the cases are written for (tabs of size 4, no readable line length), Canvas and Page preview on, `_test/` and
  `_test/tab/`, and the hand-test notes of the manual checklist in `_test/manual/` (from `e2e/fixtures/`). Every
  start installs the current build. `npm run e2e` runs `e2e/run.mjs` (the key cases) and `e2e/extra.mjs` (the
  other checks) over the DevTools protocol (`e2e/cdp.mjs`) with real key and mouse input; they refuse a vault that
  isn't a sandbox's, exit 1 on a failure and write `e2e/results.md` / `e2e/extra-results.md`. A case that needs
  another plugin (or a core plugin, `core:<id>`) is skipped without it; `E2E_REQUIRE=<id>,…` makes that a failure.
  Alone: `npm run build && e2e/sandbox.sh reset 4 && npm run e2e`. Together with Editor Multiple Lanes:
  `OBS_PLUGINS=<its folder or archit90/obsidian-editor-multiple-lanes> OBS_SANDBOX_DIR=$PWD/.sandbox-together
e2e/sandbox.sh reset 4 && E2E_REQUIRE=editor-multiple-lanes npm run e2e:cases -- --surfaces lanes`. The
  catalogues: `TEST-CASES.md` and `e2e/CASES.md` (`npm run e2e:catalogue`). Review findings by id:
  `docs/reviews.md`. Needs Xvfb, rsync, curl, node and ImageMagick.

## Verification status

- **Confirmed in Obsidian by the user:** heading level labels.
- **Checked in a test Obsidian** (1.15.0 started hidden in a sandbox, driven over the
  DevTools protocol with real key and mouse input; not the user's eye): in an Editor Multiple Lanes card, Enter, Tab,
  node-selection copy at column 0; in a Canvas text card and file card at zoom 0.57 and 1.23, the plugin's
  styles inside the card's iframe (heading guides, level labels, H7+ styling, the node-selection highlight),
  commands from the palette
  (Ctrl+P, and by id: indent, fold, insert code block), Enter / Shift+Enter / Shift+Tab ending a list / Tab /
  Backspace and Delete merges / Alt+Shift+↑ / Expand and Escape / a block paste and a plain multi-line paste,
  dragging a list item and a heading by the handle (the canvas doesn't pan, the card doesn't move), Escape
  cancelling a drag and staying in the card; with Vim mode on, in a lanes card and a Canvas card, the Vim rules
  of "Where it works". Earlier, the node-selection keys (Expand to item and section nodes, ↑ / ↓ with the edge
  stop, Shrink, ← / →, Escape, Backspace / Delete with Ctrl+Z, Tab / Shift+Tab / Alt+Shift+↓, Ctrl+C / Ctrl+X)
  in a lanes card and a Canvas text card.
- **End-to-end suite** (`e2e/`: catalogues `e2e/CASES.md` and `TEST-CASES.md`, cases `cases.mjs` +
  `cases-deep.mjs`, runner `run.mjs`, results `results.md`; `extra.mjs` / `extra-results.md` for the checks that
  aren't keys) runs every outline-mode case and the deep cases against a sandbox Obsidian over the DevTools
  protocol, in a normal tab (Live Preview and Source mode), an Editor Multiple Lanes card (with that plugin), Canvas
  text and file cards and a page preview popover, with a one-Ctrl+Z check after each change, a check that
  Obsidian's renumbering never has to change the plugin's result, and a log of console errors; `extra.mjs` covers
  popout windows, the settings tab, unloading, a 20,000-line note (typing, moves, outline mode's keys, the
  palette's checks), Obsidian's renumbering against `src/numbering.fixtures.json`, and mobile emulation.
  Last runs, 2026-11-08, Obsidian 1.15.0:
  - **alone** (a fresh vault with only this plugin): `run.mjs` 2218 checks, 2043 pass, 0 fail, 175 skipped (the
    lanes card surface and WH11 need other plugins); `extra.mjs --mobile` 12 / 12;
  - **together with Editor Multiple Lanes** (its folder build, `--surfaces lanes`, `E2E_REQUIRE`): 252 checks,
    251 pass; MB2's one-Ctrl+Z check failed once in the full run and passed when run again (flaky, recorded in
    TEST-CASES.md);
  - 20,000-line note: typing 11.4 ms with the plugin, 13.6 without (dispatch + measure); a move 20 ms, an indent
    19 ms (29.8 and 27.7 before the 2026-11-08 changes); outline mode's Enter 27 ms against Obsidian's 26 (36 before),
    Backspace merge 29 against 22 (37 before); the palette's checks of five commands 0 ms (18 before).
- **Manual checklist** (the hand-test notes are in `_test/manual/` of every sandbox, from `e2e/fixtures/`:
  `Outline mode.md` with its stages, `Outline canvas.canvas` for Canvas, and notes with headings, nested lists, mixed
  blocks and a long outline). Tick each in a normal tab, an Editor Multiple Lanes card (when installed) and a Canvas
  card unless it says otherwise; Ctrl+Z undoes every case in one step.
  - Multi-block items
    - [ ] "Insert code block in item" / "Insert Dataview query in item" from the palette, also from a lanes card
    - [ ] Alt+↑ / ↓: paragraph and code steps inside an item
    - [ ] Enter in a code block in an item keeps the item indent plus the code's indent
    - [ ] Copy / cut / drag out of such a block loses the item indent; paste into it adds it, also from a
          browser (Obsidian's HTML conversion mustn't run first)
    - [ ] A ` ```dataview ` query in a nested item renders in Live Preview and Reading view
  - Outline mode
    - [ ] There is no outline mode setting, command, hotkey or status bar item
    - [ ] Enter on the last empty item of a list at the end of a note leaves the list (nested: outdents first)
    - [ ] Enter splits an item; first child when the children show, next sibling when folded (the fold stays);
          empty item above at the start of an item; empty nested last item outdents; tasks get `[ ] `; numbers
          renumber; continuation paragraphs and code after the cursor go to the new item
    - [ ] Enter / Shift+Enter / Shift+Tab win over Obsidian's list handling in Live Preview and Source mode
    - [ ] Shift+Enter makes a continuation line; again on an empty one keeps a paragraph break
    - [ ] Shift+Tab on an empty top-level item ends the list (items after it stay a list)
    - [ ] The keys step aside with the `[[` popup open, during IME composition, in a table cell, with several
          cursors, in a code block in an item
  - Backspace, Delete, paste
    - [ ] Backspace at an item's start merges it into the item above (children follow); a blank item above is
          deleted instead; the first item of a list doesn't merge; after a checkbox it removes the checkbox
    - [ ] Merging into a folded item keeps the fold and the cursor visible; Delete on a folded item does nothing
    - [ ] Backspace / Delete at a continuation or code line's item indent join the lines without the indent
    - [ ] Paste a list, paragraphs, headings, a code block alone and plain multi-line text, copied from Obsidian,
          from a browser (a web page's list becomes items; images stay Obsidian's) and from a plain-text editor;
          Ctrl/Cmd+Shift+V
  - Node selection
    - [ ] Expand reaches an item and a section; the highlight covers whole lines and looks right in Live
          Preview, Source mode and your theme
    - [ ] ↑ / ↓ extend anchored, ← / → fold / parent / unfold / first child, Escape clears, Backspace / Delete
          remove, Tab / Shift+Tab / Ctrl+↑ / ↓ keep it, Ctrl+C / Ctrl+X give column-0 Markdown
  - Canvas (a text card and a file card, being edited; zoom in and out)
    - [ ] Guides, level labels, H7+ styling and the handle look right; the handle sits left of the fold arrow
    - [ ] Dragging by the handle moves items and headings, picks depth sideways, doesn't pan the canvas or
          drag the card; Escape cancels and stays in the card
    - [ ] Escape with a node selection leaves the card (Obsidian's Escape)
  - Vim mode (Settings → Editor → Vim key bindings)
    - [ ] Normal mode: Enter, Backspace, Delete, arrows, `V` and `j` are vim's (no merges, no node highlight)
    - [ ] Insert mode: Enter, Backspace, Delete and paste are outline mode's; Expand gives a node selection;
          Escape goes to normal mode
  - Elsewhere
    - [ ] A popout window: the keys, drag handles with Escape
    - [ ] macOS: Cmd+↑ / ↓ moves an item, a heading section and a paragraph; in frontmatter it still goes to
          the document start / end (the Linux test Obsidian can't check the Cmd mapping)
    - [ ] Mobile (no drag handles): outline-mode keys with a hardware keyboard; the toolbar's
          indent / outdent buttons move items and headings with their children
- **Accepted limits:** heading guides aren't mirrored for right-to-left notes; undo doesn't restore folds
  (Obsidian registers no fold undo either).
- **Everything else** is built, unit-tested (`npm run check`) and was used in the author's vaults, but not confirmed
  by the user in Obsidian.
- **Deep test catalogue** (2026-11-08): `TEST-CASES.md`, cases checked against this spec and common sense, each run
  in an isolated test Obsidian over the DevTools protocol with real key and mouse input, then fixed and re-run until a
  full run was clean. It records the final status per case and the date of the final run.
